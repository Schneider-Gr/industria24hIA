import { NextResponse } from "next/server";

// Proxy para o histórico de cron do app principal (US02 do PRD 017).
export async function GET() {
  try {
    const res = await fetch("https://industria24.com.br/api/observabilidade/cron", {
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
