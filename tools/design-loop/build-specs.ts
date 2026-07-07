// Specs das telas a construir — contrato determinístico por arquivo.
// `required` é o que o validador cobra; `contexto` são os nomes REAIS
// (colunas/exports) para o LLM não inventar schema (regra 2 do CLAUDE.md).
import type { Spec } from "./build-graph.ts";

const COLUNAS = `
TABELAS (colunas reais; RLS já filtra anon → só lojas Ativas e produtos Aprovados):
- lojas: id, nome, descricao, logotipo_url, banner_url, whatsapp, email, cidade, estado,
  situacao ('Ativa'|'Inativa'), valor_pedido_minimo, permite_retirada_na_loja
- produtos: id, loja_id, nome, descricao, valor, sku, quantidade_minima, estoque_atual,
  categoria_id, subcategoria_id, permite_afiliacao, porcentagem_afiliado,
  status_produto ('Aprovado'|'Em analise'|'Recusado'|'Pendente'), created_at
- produto_imagens: produto_id, url, ordem
- categorias: id, nome · subcategorias: id, nome, categoria_id
- promocoes_progressivas: id, produto_id, faixas (jsonb [{min_qtd, valor_unitario}]), ativo
- vendas_futuras: id, produto_id, previsao (date), estoque
- afiliacoes: id, loja_id, produto_id, afiliado_id, identificador, porcentagem,
  status ('Pendente'|'Aprovada'|'Suspensa')
- linha_itens: id, pedido_id, produto_id, produto_nome, quantidade, valor,
  repasse_afiliado, afiliado_id, entregue, pago, transferido
- pedidos: id, id_venda, loja_id, data, status_pedido, valor_pedido
- marketplace_config: id, banner_desktop_url, banner_mobile_url (leitura pública)

HELPERS EXISTENTES:
- "@/lib/supabase/server": createClient() (await; RLS pela sessão)
- "@/lib/auth": getUser(), getMinhaLoja() (loja do seller logado ou null)
- "@/components/ErrorState": ErrorState({title, detail?})
- "@/components/seller/format": formatBRL(n)
- "@/components/seller/states": PrecisaLogin(), VazioBox({children}), PageTitle({title, subtitle?})
- "@/components/admin/ui": PageHeader({title, subtitle, count?}), Table({headers, children}),
  StatusBadge({status}), EmptyState({children}), fmtBRL(n), fmtDate(iso)
BANNERS locais: /banners/banner-principal.png, /banners/banner-mercado-futuro.png, /banners/banner-3.jpg
Use <img> comum (NUNCA next/image — sem config de domínio remoto p/ as URLs do Bubble).`;

export const specs: Spec[] = [
  {
    path: "src/components/vitrine/ui.tsx",
    objetivo: `Componentes compartilhados da vitrine pública (Server Components, sem "use client"):
- VitrineHeader: barra bg-roxo-800 com logotipo texto "Indústria" branco + "24h" amarelo (link /),
  nav à direita: "Entrar" (link /login, botão outline branco) e "Painel do vendedor" (/seller).
- VitrineFooter: rodapé bg-roxo-900 simples com nome e cidade (Manaus/AM).
- ProdutoCard({produto}): card foto-primeiro (img url ?? placeholder cinza via div), nome 2 linhas,
  preço formatBRL 18px bold classe num, link para /produto/[id]. produto: {id, nome, valor, img?: string|null}.
- LojaCard({loja}): logotipo (ou inicial), nome, cidade/estado, link /loja/[id].
  loja: {id, nome, cidade?: string|null, estado?: string|null, logotipo_url?: string|null}.`,
    contexto: COLUNAS,
    required: ["export function VitrineHeader", "export function VitrineFooter", "export function ProdutoCard", "export function LojaCard", 'href="/login"', "formatBRL", "num"],
    forbidden: ["next/image", "use client"],
  },
  {
    path: "src/app/page.tsx",
    objetivo: `Home da vitrine multi-loja (substitui o boilerplate). Seções:
1. VitrineHeader.
2. Banner principal: marketplace_config.banner_desktop_url se existir, senão /banners/banner-principal.png (img full-width rounded-lg).
3. "Categorias": chips com link /categoria/[id] (todas as categorias, ordem por nome).
4. "Lojas" (h2 font-display): grid responsivo de LojaCard com TODAS as lojas visíveis (RLS já limita a Ativa), ordenadas por nome.
5. "Produtos recentes" (h2): grid de ProdutoCard com até 12 produtos (RLS já limita a Aprovado) ordenados por created_at desc, com a primeira imagem de produto_imagens (buscar imagens em query separada .in("produto_id", ids) e mapear a de menor ordem).
6. VitrineFooter.
Sem sessão: página 100% pública. Listas vazias → texto honesto "Nenhuma loja/produto disponível ainda."`,
    contexto: COLUNAS,
    required: ['from("lojas")', 'from("produtos")', 'from("categorias")', "VitrineHeader", "VitrineFooter", "LojaCard", "ProdutoCard", "banner-principal", "produto_imagens"],
    forbidden: ["next/image"],
  },
  {
    path: "src/app/loja/[id]/page.tsx",
    objetivo: `Página pública da loja. params Promise → await params. Busca a loja por id
(single); se não achar → notFound() de next/navigation. Cabeçalho com banner_url (se houver),
logotipo, nome (font-display), descricao, cidade/estado, botão WhatsApp (link https://wa.me/55<numeros>)
quando houver whatsapp. Grid de ProdutoCard dos produtos da loja (com primeira imagem, mesma técnica da home). VitrineHeader/Footer.`,
    contexto: COLUNAS,
    required: ["await params", 'from("lojas")', 'from("produtos")', "notFound", "ProdutoCard", "VitrineHeader"],
    forbidden: ["next/image"],
  },
  {
    path: "src/app/produto/[id]/page.tsx",
    objetivo: `Detalhe público do produto. await params; single por id; notFound() se ausente.
Layout 2 colunas (empilha no mobile): galeria (todas produto_imagens por ordem; sem imagem → bloco
cinza "Sem foto") e painel: nome (font-display), preço formatBRL classe num text-3xl, estoque_atual,
quantidade_minima ("pedido mínimo"), loja (nome + link /loja/[id]), promoção progressiva ativa se
houver (tabela de faixas: "A partir de X un → R$ Y/un" — faixas é jsonb [{min_qtd, valor_unitario}]),
CTA laranja "Pedir pelo WhatsApp" com wa.me do whatsapp da loja e texto pré-preenchido com o nome do
produto (encodeURIComponent). VitrineHeader/Footer.`,
    contexto: COLUNAS,
    required: ["await params", 'from("produtos")', 'from("produto_imagens")', 'from("promocoes_progressivas")', "notFound", "formatBRL", "wa.me", "encodeURIComponent"],
    forbidden: ["next/image"],
  },
  {
    path: "src/app/categoria/[id]/page.tsx",
    objetivo: `Produtos de uma categoria. await params; busca categoria por id (notFound se ausente),
produtos da categoria (RLS já limita a Aprovado) com primeira imagem, grid de ProdutoCard.
Título "Categoria: {nome}" font-display. VitrineHeader/Footer.`,
    contexto: COLUNAS,
    required: ["await params", 'from("categorias")', 'from("produtos")', "notFound", "ProdutoCard"],
    forbidden: ["next/image"],
  },
  {
    path: "src/app/(afiliado)/afiliado/layout.tsx",
    objetivo: `Layout do painel do afiliado, espelhando o padrão do seller: getUser(); sem sessão →
renderiza children não: mostra <PrecisaLogin/> (de "@/components/seller/states") dentro do shell.
Shell: sidebar fixa bg-roxo-900 (título "Indústria 24h" + subtítulo "Painel do afiliado") com links
"Minhas afiliações" (/afiliado) e "Solicitar afiliação" (/afiliado/solicitar), item estilo
text-roxo-100 hover:bg-roxo-800; main flex-1 com header branco "Bem-vindo, {email}" e children.`,
    contexto: COLUNAS,
    required: ["getUser", "bg-roxo-900", "/afiliado/solicitar", "PrecisaLogin", "children"],
  },
  {
    path: "src/app/(afiliado)/afiliado/page.tsx",
    objetivo: `Dashboard do afiliado. getUser(); RLS já filtra: afiliacoes do próprio user e
linha_itens onde afiliado_id = user. KPIs (padrão KpiCard não — usar cards simples): total de
afiliações, afiliações Aprovadas, "Ganhos totais" = soma de repasse_afiliado dos itens (formatBRL, num).
Tabela 1 "Minhas afiliações": identificador (código), loja/produto (mostrar ids curtos se nome não
disponível — buscar nomes de lojas e produtos por .in() nos ids), porcentagem, StatusBadge.
Tabela 2 "Vendas com meu código": produto_nome, quantidade, valor, repasse_afiliado, pago (StatusBadge
"Pago"/"Pendente"). Vazias → EmptyState honesto.`,
    contexto: COLUNAS,
    required: ['from("afiliacoes")', 'from("linha_itens")', "repasse_afiliado", "formatBRL", "getUser"],
  },
  {
    path: "src/app/(afiliado)/afiliado/solicitar/page.tsx",
    objetivo: `Solicitar afiliação. Lista produtos com permite_afiliacao=true (RLS: só Aprovados de
lojas Ativas) com nome, loja (buscar nomes por .in()), porcentagem_afiliado e um form por linha que
chama a server action solicitarAfiliacao (importar de "../actions") com input hidden produto_id e
loja_id, botão laranja "Solicitar". Produtos já solicitados pelo user (afiliacoes existentes) mostram
StatusBadge do status em vez do botão.`,
    contexto: COLUNAS,
    required: ['from("produtos")', "permite_afiliacao", "solicitarAfiliacao", "porcentagem_afiliado"],
  },
  {
    path: "src/app/(afiliado)/afiliado/actions.ts",
    objetivo: `Server action solicitarAfiliacao(formData): getUser (sem user → return erro),
lê produto_id/loja_id do form, busca porcentagem_afiliado do produto, insere em afiliacoes
{afiliado_id: user.id, produto_id, loja_id, porcentagem (do produto ?? 5), status: "Pendente",
identificador: código aleatório de 10 chars maiúsculos (Math.random().toString(36))}.
revalidatePath("/afiliado/solicitar") e "/afiliado". Erros retornados, não engolidos.`,
    contexto: COLUNAS,
    required: ['"use server"', 'from("afiliacoes")', '"Pendente"', "revalidatePath", "getUser"],
  },
  {
    path: "src/app/(seller)/seller/pedidos/actions.ts",
    objetivo: `Server actions do seller p/ pedidos: marcarEntrega(formData) lê item_id e entregue
("true"/"false"), update linha_itens.entregue (RLS garante que só itens da loja do seller passam).
revalidatePath("/seller/pedidos").`,
    contexto: COLUNAS,
    required: ['"use server"', 'from("linha_itens")', "revalidatePath", "entregue"],
  },
];
