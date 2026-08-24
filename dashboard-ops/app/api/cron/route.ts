import { NextResponse } from "next/server";

// Proxy para o histórico de cron do app principal (US02 do PRD 017).
// Achado de auditoria OWASP (#4, médio): a rota do app principal agora exige
// Authorization: Bearer $CRON_SECRET — precisa da mesma env var configurada
// aqui no projeto Vercel do dashboard-ops (Production + Preview).
export async function GET() {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET não configurada no dashboard-ops" }, { status: 500 });
  }
  try {
    const res = await fetch("https://industria24.com.br/api/observabilidade/cron", {
      headers: { authorization: `Bearer ${secret}` },
      next: { revalidate: 20 },
    });
    if (!res.ok) throw new Error(`industria24.com.br/api/observabilidade/cron -> ${res.status}`);
    return NextResponse.json(await res.json());
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "falha ao consultar histórico de cron" },
      { status: 502 },
    );
  }
}
