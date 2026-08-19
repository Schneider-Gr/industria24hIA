// Abre issue no Jira quando o bot não sabe responder. Mesmo padrão de
// isWhatsappConfigured em src/lib/whatsapp.ts: sem env configurada, no-op
// explícito — nunca finge que abriu chamado.
// Token vem da env `altassim_jira` (nome criado pelo dono no Vercel em
// 27/07) ou `ALTASSIN_JIRA` (recriada com esse nome em 02/08 durante
// rotação — nomes de env var são case-sensitive, o valor antigo em
// minúsculo foi removido); JIRA_API_TOKEN fica como override preferencial.
// Site/e-mail/projeto são fixos do workspace do Industria24h (board KAN),
// com env de override.
const BASE_URL = (process.env.JIRA_BASE_URL ?? "https://andreiasworkspace-14440074.atlassian.net").trim();
const EMAIL = (process.env.JIRA_EMAIL ?? "andreiaschneider@gmail.com").trim();
const TOKEN = (process.env.JIRA_API_TOKEN ?? process.env.altassim_jira ?? process.env.ALTASSIN_JIRA ?? "").trim();
const PROJECT_KEY = (process.env.JIRA_PROJECT_KEY ?? "KAN").trim();

// Spec #311: e-mail do dono da conta usado tanto pra abrir a issue quanto
// pra avisar sobre novo incidente registrado — mesma fonte, sem duplicar
// o default noutro arquivo.
export const JIRA_OWNER_EMAIL = EMAIL;

export const isJiraConfigured = BASE_URL.length > 0 && EMAIL.length > 0 && TOKEN.length > 0 && PROJECT_KEY.length > 0;

export async function abrirChamadoJira(args: { conversaId: string; resumo: string }): Promise<string | null> {
  if (!isJiraConfigured) return null;
  const auth = Buffer.from(`${EMAIL}:${TOKEN}`).toString("base64");
  const res = await fetch(`${BASE_URL}/rest/api/3/issue`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      fields: {
        project: { key: PROJECT_KEY },
        summary: `Bot de atendimento: ${args.resumo}`.slice(0, 250),
        description: {
          type: "doc",
          version: 1,
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: `Conversa: ${args.conversaId}\n\n${args.resumo}` }],
            },
          ],
        },
        issuetype: { name: "Task" },
      },
    }),
  });
  if (!res.ok) {
    // Log só status+corpo (sem token) — diagnosticar falha de escalonamento
    // sem quebrar o fluxo do bot (continua no-op para quem está conversando).
    console.error("abrirChamadoJira falhou", res.status, await res.text());
    return null;
  }
  const data = (await res.json()) as { key: string };
  return data.key;
}
