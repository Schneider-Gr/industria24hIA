import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth";
import { fetchAll } from "@/lib/supabase/fetch-all";

// Exportação contábil mínima: pedidos + repasses num período. CSV montado à
// mão (escapar vírgula/aspas é curto o bastante pra não trazer lib nova).
function csvCell(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Acesso restrito a administradores." }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const de = searchParams.get("de");
  const ate = searchParams.get("ate");

  const supabase = await createClient();
  let query = supabase
    .from("pedidos")
    .select("id, id_venda, cliente_nome, data, status_pedido, valor_pedido, disputa_aberta_em")
    .order("data", { ascending: true });
  if (de) query = query.gte("data", de);
  if (ate) query = query.lte("data", `${ate}T23:59:59`);

  const { data: pedidos, error } = await fetchAll((from, to) => query.range(from, to));
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const ids = pedidos.map((p) => p.id);
  const { data: repasses } = ids.length
    ? await fetchAll((from, to) =>
        supabase
          .from("repasses")
          .select("pedido_id, destino, valor, status")
          .in("pedido_id", ids)
          .range(from, to),
      )
    : { data: [] as { pedido_id: string; destino: string; valor: number; status: string }[] };

  const repassePorPedido = new Map<string, { seller: number; afiliado: number; status: string }>();
  for (const r of repasses ?? []) {
    const cur = repassePorPedido.get(r.pedido_id) ?? { seller: 0, afiliado: 0, status: "—" };
    if (r.destino === "seller") cur.seller += r.valor;
    else cur.afiliado += r.valor;
    cur.status = r.status;
    repassePorPedido.set(r.pedido_id, cur);
  }

  const header = [
    "id_venda",
    "cliente",
    "data",
    "status_pedido",
    "valor_pedido",
    "repasse_seller",
    "repasse_afiliado",
    "status_repasse",
    "disputa_aberta_em",
  ];
  const linhas = pedidos.map((p) => {
    const r = repassePorPedido.get(p.id) ?? { seller: 0, afiliado: 0, status: "—" };
    return [
      p.id_venda,
      p.cliente_nome ?? "",
      p.data,
      p.status_pedido,
      p.valor_pedido,
      r.seller.toFixed(2),
      r.afiliado.toFixed(2),
      r.status,
      p.disputa_aberta_em ?? "",
    ]
      .map(csvCell)
      .join(",");
  });

  const csv = [header.join(","), ...linhas].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="pedidos-${de ?? "inicio"}-a-${ate ?? "fim"}.csv"`,
    },
  });
}
