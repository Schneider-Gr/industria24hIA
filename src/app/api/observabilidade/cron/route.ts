import { NextResponse } from "next/server";
import { createServiceClient, isServiceConfigured } from "@/lib/supabase/service";

// Histórico de execução de cron, consumido pelo dashboard-ops (US02 do PRD 017).
// Sem autenticação, mesmo padrão do restante do painel (PRD 016) — só expõe
// metadados de execução (origem, resultado, motivo), nunca dado financeiro.
export async function GET() {
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

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const origens = [...new Set((data ?? []).map((e: { origem: string }) => e.origem))];
  const ultimaExecucaoPorOrigem = origens.map((origem) => {
    const eventos = (data ?? []).filter((e: { origem: string }) => e.origem === origem);
    return { origem, ultima: eventos[0] ?? null, historico: eventos.slice(0, 10) };
  });

  return NextResponse.json({ crons: ultimaExecucaoPorOrigem });
}
