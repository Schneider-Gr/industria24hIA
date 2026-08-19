import type { SupabaseClient } from "@supabase/supabase-js";
import { unstable_cache } from "next/cache";
import { createPublicClient } from "../supabase/public";

// ponytail: TTL fixo (sem revalidateTag nas actions de admin/seller que
// escrevem essas tabelas) — mesmo padrão já aceito no projeto para
// produto/[id] (revalidate=30) e loja/[id] (revalidate=60), nenhum dos quais
// invalida por tag hoje. Se o catálogo precisar refletir edição do admin em
// menos de 60s, trocar para revalidateTag('vitrine-home') nas actions que
// escrevem categorias/lojas/produtos/produto_imagens/promocoes_progressivas/
// vendas_futuras/faixas_cep/banners_destaque/marketplace_config.
export const REVALIDATE_VITRINE_HOME_SEGUNDOS = 60;

export function primeiraImagemPorProduto(
  imagens: { produto_id: string; url: string }[] | null,
): Map<string, string> {
  const mapa = new Map<string, string>();
  (imagens ?? []).forEach((img) => {
    if (!mapa.has(img.produto_id)) mapa.set(img.produto_id, img.url);
  });
  return mapa;
}

export type ProdutoVitrineHome = {
  id: string;
  loja_id: string;
  nome: string;
  descricao: string | null;
  valor: number;
  sku: string | null;
  quantidade_minima: number | null;
  estoque_atual: number | null;
  created_at: string;
  imagemUrl: string | null;
};

export type ProdutoDescontoVitrineHome = {
  id: string;
  nome: string;
  valor: number;
  menorPreco: number;
  img: string | null;
  loja_id: string;
  loja_nome: string;
  quantidade_minima: number | null;
};

export type ItemMercadoFuturoVitrineHome = {
  id: string;
  produto_id: string;
  produto_nome: string;
  loja_id: string;
  loja_nome: string;
  img: string | null;
  previsao: string;
  estoque: number;
  valor: number;
  preco_base: number;
  quantidade_minima: number | null;
};

export type ProdutoSupermercadoVitrineHome = {
  id: string;
  nome: string;
  valor: number;
  img: string | null;
  temDescontoProgressivo: boolean;
  loja_id: string;
  loja_nome: string;
  quantidade_minima: number | null;
};

export type VitrineHomeBase = {
  config: { banner_desktop_url: string | null; banner_mobile_url: string | null } | null;
  categorias: { id: string; nome: string }[];
  categoriasError: { message: string } | null;
  lojas: {
    id: string;
    nome: string;
    descricao: string | null;
    logotipo_url: string | null;
    banner_url: string | null;
    cidade: string | null;
    estado: string | null;
    valor_pedido_minimo: number | null;
    permite_retirada_na_loja: boolean | null;
  }[];
  lojasError: { message: string } | null;
  produtos: ProdutoVitrineHome[];
  produtosError: { message: string } | null;
  imagensError: { message: string } | null;
  faixasCep: { cep_inicial: number; cep_final: number; loja_id: string | null; ativo: boolean }[];
  produtosComDesconto: ProdutoDescontoVitrineHome[];
  itensMercadoFuturo: ItemMercadoFuturoVitrineHome[];
  produtosSupermercado: ProdutoSupermercadoVitrineHome[];
  cardsGaleria: { titulo: string; img: string; href: string; badge?: string }[];
};

/**
 * Toda a leitura de vitrine que NÃO depende de cookie/sessão (CEP,
 * usuário logado): catálogo, banners, ofertas, mercado futuro, supermercado.
 * Filtro de cobertura por CEP e galerias/flags dependentes de sessão
 * continuam fora daqui, aplicados pelo caller sobre o resultado.
 */
export async function carregarVitrineHomeBase(
  supabase: SupabaseClient,
): Promise<VitrineHomeBase> {
  const [
    { data: config },
    { data: categorias, error: categoriasError },
    { data: lojas, error: lojasError },
    { data: produtos, error: produtosError },
    { data: promocoes },
    { data: vendasFuturas },
    { data: faixasCep },
    { data: bannersDestaque },
  ] = await Promise.all([
    supabase
      .from("marketplace_config")
      .select("banner_desktop_url, banner_mobile_url")
      .limit(1)
      .maybeSingle(),
    supabase.from("categorias").select("id, nome").order("nome"),
    supabase
      // View pública sem PII (migration 0012): só lojas Ativas.
      .from("lojas_vitrine")
      .select(
        "id, nome, descricao, logotipo_url, banner_url, cidade, estado, valor_pedido_minimo, permite_retirada_na_loja",
      )
      .order("nome"),
    supabase
      .from("produtos")
      .select(
        "id, loja_id, nome, descricao, valor, sku, quantidade_minima, estoque_atual, created_at",
      )
      .gt("valor", 0)
      .eq("status_produto", "Aprovado")
      .order("created_at", { ascending: false })
      .limit(12),
    supabase.from("promocoes_progressivas").select("produto_id, faixas").eq("ativo", true),
    supabase
      .from("vendas_futuras")
      .select("id, produto_id, previsao, estoque, valor")
      .gt("estoque", 0)
      .gte("previsao", new Date().toISOString().slice(0, 10))
      .order("previsao", { ascending: true }),
    supabase.from("faixas_cep").select("cep_inicial, cep_final, loja_id, ativo").eq("ativo", true),
    supabase
      .from("banners_destaque")
      .select("titulo, imagem_url, href, badge")
      .eq("ativo", true)
      .order("ordem")
      .order("created_at"),
  ]);

  const lojaPorId = new Map((lojas ?? []).map((l) => [l.id, l]));
  let imagensError: { message: string } | null = null;

  let produtosComImagem: ProdutoVitrineHome[] = [];
  if (produtos && produtos.length > 0) {
    const ids = produtos.map((p) => p.id);
    const { data: imagens, error } = await supabase
      .from("produto_imagens")
      .select("produto_id, url, ordem")
      .in("produto_id", ids)
      .order("ordem", { ascending: true });
    imagensError = error;
    const imagemPorProduto = primeiraImagemPorProduto(imagens);
    produtosComImagem = produtos.map((p) => ({
      ...p,
      imagemUrl: imagemPorProduto.get(p.id) ?? null,
    }));
  }

  // "Produtos com descontos progressivos" — join manual (sem FK/embed do
  // PostgREST) entre a faixa mais barata de cada promoção ativa e o produto.
  const idsDesconto = (promocoes ?? []).map((p) => p.produto_id);
  const { data: produtosDesconto } = idsDesconto.length
    ? await supabase
        .from("produtos")
        .select("id, nome, valor, loja_id, quantidade_minima")
        .in("id", idsDesconto)
        .gt("valor", 0)
    : { data: [] as { id: string; nome: string; valor: number; loja_id: string; quantidade_minima: number | null }[] };

  const { data: imagensDesconto } = idsDesconto.length
    ? await supabase
        .from("produto_imagens")
        .select("produto_id, url, ordem")
        .in("produto_id", idsDesconto)
        .order("ordem", { ascending: true })
    : { data: [] as { produto_id: string; url: string }[] };
  const imagemPorProdutoDesconto = primeiraImagemPorProduto(imagensDesconto);

  const produtosComDesconto: ProdutoDescontoVitrineHome[] = (promocoes ?? [])
    .map((promo) => {
      const produto = (produtosDesconto ?? []).find((p) => p.id === promo.produto_id);
      if (!produto) return null;
      const faixas = Array.isArray(promo.faixas)
        ? (promo.faixas as { valor_unitario: number }[])
        : [];
      const menorPreco = faixas.reduce((min, f) => Math.min(min, f.valor_unitario), produto.valor);
      return {
        id: produto.id,
        nome: produto.nome,
        valor: produto.valor,
        menorPreco,
        img: imagemPorProdutoDesconto.get(produto.id) ?? null,
        loja_id: produto.loja_id,
        loja_nome: lojaPorId.get(produto.loja_id)?.nome ?? "",
        quantidade_minima: produto.quantidade_minima,
      };
    })
    .filter((p): p is ProdutoDescontoVitrineHome => p !== null);

  // "Compre do Mercado Futuro" — mesma lógica de join manual.
  const idsVendaFutura = [...new Set((vendasFuturas ?? []).map((v) => v.produto_id))];
  const { data: produtosVendaFutura } = idsVendaFutura.length
    ? await supabase
        .from("produtos")
        .select("id, nome, valor, loja_id, quantidade_minima")
        .in("id", idsVendaFutura)
        .gt("valor", 0)
    : { data: [] as { id: string; nome: string; valor: number; loja_id: string; quantidade_minima: number | null }[] };

  const { data: imagensVendaFutura } = idsVendaFutura.length
    ? await supabase
        .from("produto_imagens")
        .select("produto_id, url, ordem")
        .in("produto_id", idsVendaFutura)
        .order("ordem", { ascending: true })
    : { data: [] as { produto_id: string; url: string }[] };
  const imagemPorProdutoVF = primeiraImagemPorProduto(imagensVendaFutura);
  const produtoPorIdVF = new Map((produtosVendaFutura ?? []).map((p) => [p.id, p]));

  const itensMercadoFuturo: ItemMercadoFuturoVitrineHome[] = (vendasFuturas ?? [])
    .map((v) => {
      const produto = produtoPorIdVF.get(v.produto_id);
      if (!produto || !v.previsao) return null;
      return {
        id: v.id,
        produto_id: v.produto_id,
        produto_nome: produto.nome,
        loja_id: produto.loja_id,
        loja_nome: lojaPorId.get(produto.loja_id)?.nome ?? "—",
        img: imagemPorProdutoVF.get(v.produto_id) ?? null,
        previsao: v.previsao,
        estoque: v.estoque ?? 0,
        valor: v.valor,
        preco_base: produto.valor,
        quantidade_minima: produto.quantidade_minima,
      };
    })
    .filter((v): v is ItemMercadoFuturoVitrineHome => v !== null);

  // Supermercado & Hortifruti: categoria real "Supermercado" (confirmada no
  // banco) — busca pelo nome já carregado acima, sem fixar UUID.
  const categoriaSupermercado = (categorias ?? []).find(
    (c) => c.nome.trim().toLowerCase() === "supermercado",
  );

  let produtosSupermercado: ProdutoSupermercadoVitrineHome[] = [];
  if (categoriaSupermercado) {
    const { data: produtosCat } = await supabase
      .from("produtos")
      .select("id, loja_id, nome, valor, quantidade_minima")
      .eq("categoria_id", categoriaSupermercado.id)
      .gt("valor", 0)
      .eq("status_produto", "Aprovado")
      .order("nome")
      .limit(12);

    const idsCat = (produtosCat ?? []).map((p) => p.id);
    const { data: imagensCat } = idsCat.length
      ? await supabase
          .from("produto_imagens")
          .select("produto_id, url, ordem")
          .in("produto_id", idsCat)
          .order("ordem", { ascending: true })
      : { data: [] as { produto_id: string; url: string }[] };
    const imagemPorProdutoCat = primeiraImagemPorProduto(imagensCat);
    const idsComDesconto = new Set(idsDesconto);

    produtosSupermercado = (produtosCat ?? []).map((p) => ({
      id: p.id,
      nome: p.nome,
      valor: p.valor,
      img: imagemPorProdutoCat.get(p.id) ?? null,
      temDescontoProgressivo: idsComDesconto.has(p.id),
      loja_id: p.loja_id,
      loja_nome: lojaPorId.get(p.loja_id)?.nome ?? "",
      quantidade_minima: p.quantidade_minima,
    }));
  }

  const cardsGaleria = (bannersDestaque ?? []).map((b) => ({
    titulo: b.titulo,
    img: b.imagem_url,
    href: b.href,
    badge: b.badge ?? undefined,
  }));

  return {
    config,
    categorias: categorias ?? [],
    categoriasError,
    lojas: lojas ?? [],
    lojasError,
    produtos: produtosComImagem,
    produtosError,
    imagensError,
    faixasCep: (faixasCep ?? []) as VitrineHomeBase["faixasCep"],
    produtosComDesconto,
    itensMercadoFuturo,
    produtosSupermercado,
    cardsGaleria,
  };
}

/**
 * Versão cacheada (dado público, sem cookie/sessão — client anon dedicado,
 * ver src/lib/supabase/public.ts) da leitura acima. `unstable_cache` some da
 * assinatura os campos de erro do Supabase (não serializáveis de forma
 * estável entre chamadas) só na prática eles vêm `null` em operação normal;
 * um erro real de conexão joga a promise inteira fora do cache.
 */
export const obterVitrineHomeCacheada = unstable_cache(
  () => carregarVitrineHomeBase(createPublicClient()),
  ["vitrine-home-base"],
  { revalidate: REVALIDATE_VITRINE_HOME_SEGUNDOS, tags: ["vitrine-home"] },
);
