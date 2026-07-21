// Envio de e-mail transacional via Resend.
// ponytail: fetch direto na REST API em vez do SDK `resend` — é um POST só.
// Sem RESEND_API_KEY o envio vira no-op (mesma postura do Sentry sem DSN),
// pra dev/preview não quebrar a moderação por falta de credencial.

const FROM = process.env.RESEND_FROM ?? "Indústria 24h <nao-responda@industria24.com.br>";

export async function enviarEmail(opts: {
  to: string;
  subject: string;
  text: string;
}): Promise<{ enviado: boolean; erro?: string }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { enviado: false, erro: "RESEND_API_KEY ausente" };

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM, to: [opts.to], subject: opts.subject, text: opts.text }),
  });

  if (!res.ok) return { enviado: false, erro: `Resend ${res.status}: ${await res.text()}` };
  return { enviado: true };
}
