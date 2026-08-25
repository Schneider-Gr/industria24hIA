import { NextResponse, type NextRequest } from "next/server";
import { respostaErroGenerico } from "@/lib/api/erro-generico";
import { createServiceClient, isServiceConfigured } from "@/lib/supabase/service";

// Histórico de execução de cron, consumido pelo dashboard-ops (US02 do PRD 017).
// Achado de auditoria OWASP (#4, médio): exigir o mesmo Bearer token que os
// próprios endpoints de cron do projeto usam (CRON_SECRET, ver
// carrinho/abandono/tick), em vez de ficar aberto. O dashboard-ops precisa
// enviar `Authorization: Bearer $CRON_SECRET` nesta chamada a partir deste
// deploy — dependência operacional, não só de código.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "não autorizado" }, { status: 401 });
  }
  if (!isServiceConfigured) {
    return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY não configurada" }, { status: 503 });
  }

  const svc = createServiceClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- tabela 0125 fora dos tipos gerados
  const { data, error } = await (svc as any)
    .from("observabilidade_eventos")
    .select("origem, resultado, motivo, created_at")
    .eq("capability", "cron")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return respostaErroGenerico(error, 500, { tags: { area: "observabilidade-cron" } });

  const origens = [...new Set((data ?? []).map((e: { origem: string }) => e.origem))];
  const ultimaExecucaoPorOrigem = origens.map((origem) => {
    const eventos = (data ?? []).filter((e: { origem: string }) => e.origem === origem);
    return { origem, ultima: eventos[0] ?? null, historico: eventos.slice(0, 10) };
  });

  return NextResponse.json({ crons: ultimaExecucaoPorOrigem });
}
