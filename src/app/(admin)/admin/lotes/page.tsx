import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { ErrorState } from "@/components/ErrorState";
import { PageHeader, Table, EmptyState, fmtBRL } from "@/components/admin/ui";
import { criarLote, cancelarLote } from "./actions";

export const dynamic = "force-dynamic";

type PedidoPendente = {
  id: string;
  id_venda: string;
  loja_id: string;
  loja_nome: string;
  corredor: string;
  cidade: string;
  frete: number;
};

export default async function LotesPage() {
  if (!isSupabaseConfigured) {
    return (
      <ErrorState
        title="Supabase não configurado"
        detail="Defina as variáveis do Supabase em web/.env.local."
      />
    );
  }

  const supabase = await createClient();

  // Pedidos pagos com frete consolidado que ainda não entraram num lote.
  const [{ data: pedidos, error: e1 }, { data: emLote }, { data: lotes, error: e2 }] =
    await Promise.all([
      supabase
        .from("pedidos")
        .select(
          "id, id_venda, loja_id, frete_consolidado, status_pedido, lojas(nome), linha_itens(entrega_cep, entrega_cidade, valor_frete, retirar_na_loja)",
        )
        .eq("frete_consolidado", true)
        .eq("status_pedido", "Pagamento Realizado")
        .order("created_at", { ascending: false })
        .limit(200),
      supabase.from("lote_pedidos").select("pedido_id"),
      supabase
        .from("lotes_consolidacao")
        .select(
          "id, corredor_cep, status, criado_em, lojas(nome), corridas(status, preco_final), lote_pedidos(pedido_id)",
        )
        .order("criado_em", { ascending: false })
        .limit(50),
    ]);

  if (e1 || e2) {
    return <ErrorState title="Falha ao carregar lotes" detail={(e1 ?? e2)?.message} />;
  }

  const jaEmLote = new Set(
    ((emLote ?? []) as { pedido_id: string }[]).map((l) => l.pedido_id),
  );

  // Agrupa por loja + corredor (prefixo 3 dígitos do CEP de destino) — a
  // mesma regra que a RPC valida ao montar o lote.
  const pendentes: PedidoPendente[] = [];
  for (const p of pedidos ?? []) {
    if (jaEmLote.has(p.id)) continue;
    const linha = (p.linha_itens ?? []).find(
      (li: { entrega_cep: string | null; retirar_na_loja: boolean }) =>
        !li.retirar_na_loja && li.entrega_cep,
    );
    if (!linha) continue;
    pendentes.push({
      id: p.id,
      id_venda: p.id_venda,
      loja_id: p.loja_id,
      loja_nome: p.lojas?.nome ?? "—",
      corredor: String(linha.entrega_cep).slice(0, 3),
      cidade: linha.entrega_cidade ?? "—",
      frete: (p.linha_itens ?? []).reduce(
        (s: number, li: { valor_frete: number | null }) => s + Number(li.valor_frete ?? 0),
        0,
      ),
    });
  }

  const grupos = new Map<string, PedidoPendente[]>();
  for (const p of pendentes) {
    const chave = `${p.loja_id}|${p.corredor}`;
    grupos.set(chave, [...(grupos.get(chave) ?? []), p]);
  }

  return (
    <div>
      <PageHeader
        title="Lotes de consolidação"
        subtitle="Pedidos com frete consolidado aguardando lote, agrupados por loja + corredor de CEP"
        count={pendentes.length}
      />

      {grupos.size === 0 ? (
        <EmptyState>Nenhum pedido consolidado aguardando lote.</EmptyState>
      ) : (
        [...grupos.entries()].map(([chave, grupo]) => (
          <form key={chave} action={criarLote} className="mb-6">
            <h3 className="mb-1 text-sm font-semibold text-ink">
              {grupo[0].loja_nome} → corredor {grupo[0].corredor}xx-xxx ({grupo[0].cidade})
            </h3>
            <Table headers={["", "Pedido", "Frete cobrado", "Cidade"]}>
              {grupo.map((p) => (
                <tr key={p.id} className="text-ink dark:text-ink-2">
                  <td className="w-8 px-4 py-[9px]">
                    <input type="checkbox" name="pedido_id" value={p.id} defaultChecked />
                  </td>
                  <td className="px-4 py-[9px] font-mono text-xs">{p.id_venda}</td>
                  <td className="px-4 py-[9px] text-right num">{fmtBRL(p.frete)}</td>
                  <td className="px-4 py-[9px]">{p.cidade}</td>
                </tr>
              ))}
            </Table>
            <button
              type="submit"
              disabled={grupo.length < 2}
              className="mt-2 rounded bg-sinal px-4 py-1.5 text-sm font-semibold text-white hover:bg-sinal-escuro disabled:opacity-40"
            >
              Criar lote ({grupo.length} pedidos, {fmtBRL(grupo.reduce((s, p) => s + p.frete, 0))}{" "}
              ao transportador)
            </button>
            {grupo.length < 2 && (
              <span className="ml-2 text-xs text-muted">
                Um lote precisa de pelo menos 2 pedidos do mesmo corredor.
              </span>
            )}
          </form>
        ))
      )}

      <PageHeader title="Lotes criados" count={(lotes ?? []).length} />
      {(lotes ?? []).length === 0 ? (
        <EmptyState>Nenhum lote criado ainda.</EmptyState>
      ) : (
        <Table headers={["Loja", "Corredor", "Pedidos", "Frete total", "Corrida", "Criado em", ""]}>
          {(lotes ?? []).map(
            (l: {
              id: string;
              corredor_cep: string;
              status: string;
              criado_em: string;
              lojas: { nome: string } | null;
              corridas: { status: string; preco_final: number | null } | null;
              lote_pedidos: { pedido_id: string }[];
            }) => (
              <tr key={l.id} className="text-ink dark:text-ink-2">
                <td className="px-4 py-[9px]">{l.lojas?.nome ?? "—"}</td>
                <td className="px-4 py-[9px] font-mono text-xs">{l.corredor_cep}xx-xxx</td>
                <td className="px-4 py-[9px] text-right num">{l.lote_pedidos?.length ?? 0}</td>
                <td className="px-4 py-[9px] text-right num">
                  {fmtBRL(Number(l.corridas?.preco_final ?? 0))}
                </td>
                <td className="px-4 py-[9px]">{l.corridas?.status ?? "—"}</td>
                <td className="px-4 py-[9px] text-xs text-muted">
                  {new Date(l.criado_em).toLocaleString("pt-BR")}
                </td>
                <td className="px-4 py-[9px]">
                  {l.status === "Publicado" &&
                  ["Publicada", "Aceita", undefined].includes(l.corridas?.status) ? (
                    <form action={cancelarLote}>
                      <input type="hidden" name="lote_id" value={l.id} />
                      <button
                        type="submit"
                        className="rounded border border-line px-2 py-0.5 text-xs text-muted hover:text-ink"
                      >
                        Desfazer
                      </button>
                    </form>
                  ) : (
                    <span className="text-xs text-muted">{l.status}</span>
                  )}
                </td>
              </tr>
            ),
          )}
        </Table>
      )}
    </div>
  );
}
