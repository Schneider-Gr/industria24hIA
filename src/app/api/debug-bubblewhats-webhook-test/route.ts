import { NextResponse, type NextRequest } from "next/server";

// TEMPORÁRIO — teste manual em preview do PR #349. Remover antes do merge.
// Chama o webhook real internamente com o secret lido do próprio servidor
// (nunca devolvido ao chamador) para validar 401 sem secret e 200 com
// secret + payload fake, sem depender de configurar o painel BubbleWhats.
const DEBUG_TOKEN = "296de33155b62717d1e97f4ad7dbe37ace622cb4c5f65b33";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (token !== DEBUG_TOKEN) {
    return NextResponse.json({ error: "não autorizado" }, { status: 401 });
  }

  const realSecret = (process.env.BUBBLEWHATS_WEBHOOK_SECRET ?? "").trim();
  const origin = request.nextUrl.origin;

  const semSecret = await fetch(`${origin}/api/webhooks/bubblewhats`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "message", teste: true }),
  });

  const secretErrado = await fetch(`${origin}/api/webhooks/bubblewhats?secret=errado123`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "message", teste: true }),
  });

  const secretCerto = await fetch(
    `${origin}/api/webhooks/bubblewhats?secret=${encodeURIComponent(realSecret)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "message_status", teste: true }),
    }
  );

  return NextResponse.json({
    sem_secret: { status: semSecret.status, body: await semSecret.json() },
    secret_errado: { status: secretErrado.status, body: await secretErrado.json() },
    secret_correto: { status: secretCerto.status, body: await secretCerto.json() },
  });
}
