// Busca sob demanda no espaço Confluence IND24H (16 PRDs do marketplace) —
// PRD 007 decidiu por busca por palavra-chave (CQL), não RAG vetorial: o
// volume de documentos não justifica pipeline de embeddings/vector DB.
// Reaproveita as mesmas credenciais Atlassian de src/lib/ai/jira.ts (mesmo
// workspace, mesmo usuário).
const BASE_URL = (process.env.JIRA_BASE_URL ?? "https://andreiasworkspace-14440074.atlassian.net").trim();
const EMAIL = (process.env.JIRA_EMAIL ?? "andreiaschneider@gmail.com").trim();
const TOKEN = (process.env.JIRA_API_TOKEN ?? process.env.altassim_jira ?? process.env.ALTASSIN_JIRA ?? "").trim();
const SPACE_KEY = (process.env.CONFLUENCE_SPACE_KEY ?? "IND24H").trim();

export const isConfluenceConfigured = BASE_URL.length > 0 && EMAIL.length > 0 && TOKEN.length > 0;

// Corta o corpo da página para não estourar contexto em páginas longas nem
// devolver o documento inteiro — trecho ao redor do primeiro termo buscado
// que aparece no texto simples da página.
// ponytail: corte por proximidade textual simples, sem highlighting real do
// Confluence; se a resposta vier truncada de forma ruim, evoluir para usar
// o parâmetro `excerpt`/highlight nativo da API de busca.
function extrairTrecho(textoPlano: string, termos: string[], janela = 1200): string {
  const lower = textoPlano.toLowerCase();
  let idx = -1;
  for (const termo of termos) {
    idx = lower.indexOf(termo.toLowerCase());
    if (idx >= 0) break;
  }
  if (idx < 0) return textoPlano.slice(0, janela);
  const inicio = Math.max(0, idx - janela / 2);
  return textoPlano.slice(inicio, inicio + janela);
}

function paraTextoPlano(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function buscarConhecimentoPRD(pergunta: string): Promise<string | null> {
  if (!isConfluenceConfigured) return null;

  const termos = pergunta
    .split(/\s+/)
    .filter((t) => t.length > 3)
    .slice(0, 6);
  if (termos.length === 0) return null;

  const cql = `space = "${SPACE_KEY}" and type = "page" and text ~ "${termos.join(" ")}"`;
  const auth = Buffer.from(`${EMAIL}:${TOKEN}`).toString("base64");

  const searchRes = await fetch(
    `${BASE_URL}/wiki/rest/api/content/search?cql=${encodeURIComponent(cql)}&limit=1&expand=body.storage`,
    { headers: { Authorization: `Basic ${auth}`, Accept: "application/json" } },
  );
  if (!searchRes.ok) {
    // Log só status+corpo (sem token) — a busca sob demanda é best-effort,
    // não trava o atendimento, mas sem log não dá pra saber se é config
    // errada (espaço/permissão) ou simplesmente sem página com o termo.
    console.error("buscarConhecimentoPRD falhou", searchRes.status, await searchRes.text(), "cql:", cql);
    return null;
  }

  const data = (await searchRes.json()) as {
    results?: Array<{ title: string; body?: { storage?: { value: string } } }>;
  };
  if (!data.results?.length) {
    console.error("buscarConhecimentoPRD sem resultados", "cql:", cql);
  }
  const pagina = data.results?.[0];
  if (!pagina?.body?.storage?.value) return null;

  const textoPlano = paraTextoPlano(pagina.body.storage.value);
  const trecho = extrairTrecho(textoPlano, termos);
  return `PRD "${pagina.title}":\n${trecho}`;
}
