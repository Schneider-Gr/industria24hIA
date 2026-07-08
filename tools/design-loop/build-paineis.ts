// Loop LangGraph (gerar→validar→corrigir) — CONCLUIR os painéis:
// afiliado (afiliação por loja), afiliado logística (novo) e admin/usuários.
// Reusa o grafo build-graph.ts; validador determinístico decide, nunca o LLM.
// uso: node --experimental-strip-types build-paineis.ts [filtro-de-path]

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { buildApp, MAX_ITER, type Spec } from "./build-graph.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const WEB = join(HERE, "..", "..");

for (const linha of readFileSync(join(HERE, ".env"), "utf-8").split("\n")) {
  const i = linha.indexOf("=");
  if (i > 0 && !linha.startsWith("#")) process.env[linha.slice(0, i).trim()] ??= linha.slice(i + 1).trim();
}

const CTX = `
TABELAS (colunas reais; migration 0012 já modelada):
- afiliacoes: id, loja_id, produto_id, afiliado_id, identificador, porcentagem,
  status ('Pendente'|'Aprovada'|'Suspensa'), tipo ('vendas'|'logistica' — default 'vendas')
- lojas: id, nome, cidade, estado, situacao ('Ativa'|'Inativa'), owner_id
- produtos: id, loja_id, nome, valor, permite_afiliacao, porcentagem_afiliado,
  status_produto
- pedidos: id, id_venda, loja_id, data, status_pedido, valor_pedido
- linha_itens: id, pedido_id, produto_id, produto_nome, quantidade, valor,
  repasse_afiliado, afiliado_id, entregue, pago
- entregas: linha_item_id (PK, 1:1 com linha_itens), status ('Pendente'|'Enviado'|'Entregue'),
  rastreio, atualizado_em — upsert com { onConflict: "linha_item_id" }
RPC: supabase.rpc("admin_list_users") → [{ id, email, criado_em, ultimo_login,
  eh_admin, loja_nome }] (vazio p/ não-admin; guardada por is_admin())
RLS (0012): afiliado logístico APROVADO lê pedidos/linha_itens das lojas afiliadas
  e faz select/insert/update em entregas desses itens. RLS decide; NÃO filtrar por
  owner no código além do necessário.

HELPERS EXISTENTES:
- "@/lib/supabase/server": createClient() (await; RLS pela sessão)
- "@/lib/auth": getUser()
- "@/components/ErrorState": ErrorState({title, detail?})
- "@/components/seller/format": formatBRL(n)
- "@/components/seller/states": PrecisaLogin(), VazioBox({children}), PageTitle({title, subtitle?})
- "@/components/admin/ui": PageHeader({title, subtitle, count?}), Table({headers, children}),
  StatusBadge({status}), EmptyState({children}), fmtBRL(n), fmtDate(iso)
Padrão de action existente (admin/entregas): upsert em entregas + revalidatePath, erros com throw.`;

const raw: (Omit<Spec, "original"> & { originalFrom?: string })[] = [
  {
    path: "src/app/(afiliado)/afiliado/layout.tsx",
    originalFrom: "src/app/(afiliado)/afiliado/layout.tsx",
    objetivo: `ADICIONE ao nav da sidebar um terceiro link "Entregas (logística)" apontando para
/afiliado/logistica, mesmo estilo dos outros itens. Preserve TODO o resto do layout.`,
    contexto: CTX,
    required: ['href="/afiliado/logistica"', "PrecisaLogin", "children"],
  },
  {
    path: "src/app/(afiliado)/afiliado/actions.ts",
    originalFrom: "src/app/(afiliado)/afiliado/actions.ts",
    objetivo: `ADICIONE a server action solicitarAfiliacaoLoja(formData): getUser (sem user → return
{error}); lê loja_id e tipo ("vendas"|"logistica"; qualquer outro valor → erro); se já existe
afiliacao do user p/ essa loja com esse tipo → return {error: "Você já solicitou..."};
insere em afiliacoes {afiliado_id: user.id, loja_id, tipo, porcentagem: 5, status: "Pendente",
identificador: código aleatório 10 chars maiúsculos}. revalidatePath de "/afiliado/solicitar" e
"/afiliado". Preserve solicitarAfiliacao existente.`,
    contexto: CTX,
    required: ['"use server"', "solicitarAfiliacaoLoja", '"logistica"', 'from("afiliacoes")', "revalidatePath"],
  },
  {
    path: "src/app/(afiliado)/afiliado/solicitar/page.tsx",
    originalFrom: "src/app/(afiliado)/afiliado/solicitar/page.tsx",
    objetivo: `ADICIONE uma seção "Afiliar-se a uma loja" ANTES da listagem de produtos:
lista lojas (RLS já limita a Ativa) com nome, cidade/estado e um form por linha chamando
solicitarAfiliacaoLoja (de "../actions") com input hidden loja_id + <select name="tipo">
com opções "vendas" (Divulgação/vendas) e "logistica" (Logística/entregas) + botão laranja
"Solicitar". Se o user já tem afiliacao para a loja (buscar afiliacoes do user com loja_id
não nulo), mostrar StatusBadge do status + tipo em vez do form. Preserve a seção de produtos
existente como está.`,
    contexto: CTX,
    required: ["solicitarAfiliacaoLoja", 'from("lojas")', '<select name="tipo"', "logistica"],
  },
  {
    path: "src/app/(afiliado)/afiliado/page.tsx",
    originalFrom: "src/app/(afiliado)/afiliado/page.tsx",
    objetivo: `ADICIONE a coluna "Tipo" na tabela "Minhas afiliações" (entre Porcentagem e Status):
buscar também o campo tipo no select de afiliacoes e exibir "Logística" quando tipo==="logistica",
senão "Vendas". Preserve TODO o resto da tela.`,
    contexto: CTX,
    required: ["tipo", "Logística", "repasse_afiliado"],
  },
  {
    path: "src/app/(afiliado)/afiliado/logistica/actions.ts",
    objetivo: `Server action atualizarEntregaLogistica(formData): getUser (sem user → throw);
lê linha_item_id, status ('Pendente'|'Enviado'|'Entregue' — validar) e rastreio (trim, vazio →
null); upsert em entregas {linha_item_id, status, rastreio, atualizado_em: new Date().toISOString()}
com { onConflict: "linha_item_id" } (RLS 0012 garante que só itens das lojas onde o user é
afiliado logístico Aprovado passam). Erro → throw new Error(error.message).
revalidatePath("/afiliado/logistica").`,
    contexto: CTX,
    required: ['"use server"', 'from("entregas")', "onConflict", "revalidatePath", "atualizarEntregaLogistica"],
  },
  {
    path: "src/app/(afiliado)/afiliado/logistica/page.tsx",
    objetivo: `Painel do afiliado logístico (espelha a página do Bubble "afiliadologistica").
getUser(); sem user → PrecisaLogin. Buscar afiliacoes do user com tipo="logistica": se nenhuma
→ VazioBox explicando que é preciso solicitar afiliação de logística em /afiliado/solicitar
(link); se só Pendente/Suspensa → VazioBox honesto com o status. Com Aprovada:
1. Buscar pedidos (RLS 0012 já limita às lojas afiliadas) — id, id_venda, loja_id, data;
   mapear nome das lojas por .in() nos loja_id das afiliações Aprovadas.
2. Buscar linha_itens desses pedidos (.in("pedido_id", ids)): id, pedido_id, produto_nome,
   quantidade, valor.
3. Buscar entregas (.in("linha_item_id", ids dos itens)): status, rastreio.
KPIs simples (3 cards): itens Pendentes, Enviados, Entregues (derivar: entrega?.status ??
"Pendente").
Tabela "Entregas sob minha responsabilidade": produto_nome, quantidade, valor (formatBRL num),
pedido (id_venda ?? id curto), loja, e um form inline por item (mesmo padrão do admin/entregas):
select de status (Pendente/Enviado/Entregue, defaultValue atual), input rastreio, botão laranja
"Salvar" chamando atualizarEntregaLogistica de "./actions". Sem itens → EmptyState.
PageTitle "Logística" subtítulo "Entregas das lojas onde você é afiliado logístico".`,
    contexto: CTX,
    required: ['from("afiliacoes")', 'from("pedidos")', 'from("linha_itens")', 'from("entregas")', "atualizarEntregaLogistica", '"logistica"', "formatBRL", "getUser"],
  },
  {
    path: "src/app/(admin)/admin/usuarios/page.tsx",
    objetivo: `REESCREVA a tela (hoje é empty state com TODO desatualizado): listar usuários via
const { data, error } = await supabase.rpc("admin_list_users") — a função é guardada por
is_admin() e devolve [{id, email, criado_em, ultimo_login, eh_admin, loja_nome}]. erro →
ErrorState. PageHeader "Usuários" com count. Tabela: E-mail, Criado em (fmtDate), Último login
(fmtDate ou "—"), Papel (StatusBadge "Admin" quando eh_admin, senão "Usuário"), Loja (loja_nome
?? "—"). Lista vazia → EmptyState "Nenhum usuário visível — confira se sua conta é admin.".
export const dynamic = "force-dynamic". Sem TODO no arquivo.`,
    contexto: CTX,
    required: ['rpc("admin_list_users")', "PageHeader", "fmtDate", "ErrorState", "force-dynamic"],
    forbidden: ["TODO", "service_role"],
  },
];

const todas: Spec[] = raw.map((r) => ({
  ...r,
  original: r.originalFrom ? readFileSync(join(WEB, r.originalFrom), "utf-8") : undefined,
}));

const filtro = process.argv[2];
const fila = filtro ? todas.filter((s) => s.path.includes(filtro)) : todas;

let falhas = 0;
for (const spec of fila) {
  const t0 = Date.now();
  const fin = await buildApp.invoke({ spec }, { recursionLimit: MAX_ITER * 2 + 4 });
  const s = ((Date.now() - t0) / 1000).toFixed(0);
  if (fin.problemas.length === 0 && fin.codigo) {
    const abs = join(WEB, spec.path);
    if (!existsSync(dirname(abs))) mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, fin.codigo.endsWith("\n") ? fin.codigo : fin.codigo + "\n", "utf-8");
    console.log(`OK   ${spec.path} (${fin.iteracoes} iter, ${s}s)`);
  } else {
    falhas++;
    console.log(`FAIL ${spec.path} (${fin.iteracoes} iter, ${s}s):`);
    for (const p of fin.problemas) console.log(`     - ${p}`);
  }
}
console.log(`\n${fila.length - falhas}/${fila.length} arquivos gerados.`);
process.exit(falhas ? 2 : 0);
