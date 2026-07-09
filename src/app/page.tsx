import {
  VitrineHeader,
  VitrineFooter,
  LojaCard,
  ProdutoCard,
  ProdutoDescontoCard,
  TituloSecao,
} from "@/components/vitrine/ui";
import { BannerCarousel } from "@/components/vitrine/BannerCarousel";
import { MercadoFuturo, type VendaFuturaItem } from "@/components/vitrine/MercadoFuturo";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import Link from "next/link";
import { ErrorState } from "@/components/ErrorState";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  if (!isSupabaseConfigured) {
    return (
      <ErrorState
        title="Supabase não configurado"
        detail="Defina as variáveis do Supabase em web/.env.local (ou nas env vars da Vercel em produção)."
      />
    );
  }

  const supabase = await createClient();

  const [
    { data: config },
    { data: categorias, error: categoriasError },
    { data: lojas, error: lojasError },
    { data: produtos, error: produtosError },
    { data: promocoes },
    { data: vendasFuturas },
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
        "id, nome, descricao, logotipo_url, banner_url, cidade, estado, valor_pedido_minimo, permite_retirada_na_loja"
      )
      .order("nome"),
    supabase
      .from("produtos")
      .select(
        "id, loja_id, nome, descricao, valor, sku, quantidade_minima, estoque_atual, created_at"
      )
      .gt("valor", 0)
      .order("created_at", { ascending: false })
      .limit(12),
    supabase.from("promocoes_progressivas").select("produto_id, faixas").eq("ativo", true),
    supabase
      .from("vendas_futuras")
      .select("id, produto_id, previsao, estoque, valor")
      .gt("estoque", 0)
      .order("previsao", { ascending: true }),
  ]);

  let produtosComImagem: (NonNullable<typeof produtos>[number] & {
    imagemUrl: string | null;
  })[] = [];

  let imagensError: { message: string } | null = null;

  if (produtos && produtos.length > 0) {
    const ids = produtos.map((p) => p.id);
    const { data: imagens, error } = await supabase
      .from("produto_imagens")
      .select("produto_id, url, ordem")
      .in("produto_id", ids)
      .order("ordem", { ascending: true });

    imagensError = error;

    const primeiraImagemPorProduto = new Map<string, string>();
    (imagens ?? []).forEach((img) => {
      if (!primeiraImagemPorProduto.has(img.produto_id)) {
        primeiraImagemPorProduto.set(img.produto_id, img.url);
      }
    });

    produtosComImagem = produtos.map((p) => ({
      ...p,
      imagemUrl: primeiraImagemPorProduto.get(p.id) ?? null,
    }));
  }

  const bannerUrl = config?.banner_desktop_url || "/banners/banner-principal.png";
  const bannerMobileUrl = config?.banner_mobile_url || "/banners/banner-3-mobile.jpg";

  // "Produtos com descontos progressivos" — join manual (sem FK/embed do
  // PostgREST) entre a faixa mais barata de cada promoção ativa e o produto.
  const idsDesconto = (promocoes ?? []).map((p) => p.produto_id);
  const { data: produtosDesconto } = idsDesconto.length
    ? await supabase
        .from("produtos")
        .select("id, nome, valor")
        .in("id", idsDesconto)
        .gt("valor", 0)
    : { data: [] as { id: string; nome: string; valor: number }[] };

  const { data: imagensDesconto } = idsDesconto.length
    ? await supabase
        .from("produto_imagens")
        .select("produto_id, url, ordem")
        .in("produto_id", idsDesconto)
        .order("ordem", { ascending: true })
    : { data: [] as { produto_id: string; url: string }[] };

  const imagemPorProdutoDesconto = new Map<string, string>();
  (imagensDesconto ?? []).forEach((img) => {
    if (!imagemPorProdutoDesconto.has(img.produto_id)) {
      imagemPorProdutoDesconto.set(img.produto_id, img.url);
    }
  });

  const produtosComDesconto = (promocoes ?? [])
    .map((promo) => {
      const produto = (produtosDesconto ?? []).find((p) => p.id === promo.produto_id);
      if (!produto) return null;
      const faixas = Array.isArray(promo.faixas)
        ? (promo.faixas as { valor_unitario: number }[])
        : [];
      const menorPreco = faixas.reduce(
        (min, f) => Math.min(min, f.valor_unitario),
        produto.valor,
      );
      return {
        id: produto.id,
        nome: produto.nome,
        valor: produto.valor,
        menorPreco,
        img: imagemPorProdutoDesconto.get(produto.id) ?? null,
      };
    })
    .filter((p): p is NonNullable<typeof p> => p !== null);

  // "Compre do Mercado Futuro" — mesma lógica de join manual.
  const idsVendaFutura = [...new Set((vendasFuturas ?? []).map((v) => v.produto_id))];
  const { data: produtosVendaFutura } = idsVendaFutura.length
    ? await supabase
        .from("produtos")
        .select("id, nome, valor, loja_id, quantidade_minima")
        .in("id", idsVendaFutura)
        .gt("valor", 0)
    : { data: [] as { id: string; nome: string; valor: number; loja_id: string; quantidade_minima: number | null }[] };

  const lojaIdsVendaFutura = [...new Set((produtosVendaFutura ?? []).map((p) => p.loja_id))];
  const { data: lojasVendaFutura } = lojaIdsVendaFutura.length
    ? await supabase.from("lojas_vitrine").select("id, nome").in("id", lojaIdsVendaFutura)
    : { data: [] as { id: string; nome: string }[] };

  const { data: imagensVendaFutura } = idsVendaFutura.length
    ? await supabase
        .from("produto_imagens")
        .select("produto_id, url, ordem")
        .in("produto_id", idsVendaFutura)
        .order("ordem", { ascending: true })
    : { data: [] as { produto_id: string; url: string }[] };

  const imagemPorProdutoVF = new Map<string, string>();
  (imagensVendaFutura ?? []).forEach((img) => {
    if (!imagemPorProdutoVF.has(img.produto_id)) {
      imagemPorProdutoVF.set(img.produto_id, img.url);
    }
  });
  const produtoPorIdVF = new Map((produtosVendaFutura ?? []).map((p) => [p.id, p]));
  const lojaPorIdVF = new Map((lojasVendaFutura ?? []).map((l) => [l.id, l.nome]));

  const itensMercadoFuturo: VendaFuturaItem[] = (vendasFuturas ?? [])
    .map((v) => {
      const produto = produtoPorIdVF.get(v.produto_id);
      if (!produto || !v.previsao) return null;
      return {
        id: v.id,
        produto_id: v.produto_id,
        produto_nome: produto.nome,
        loja_id: produto.loja_id,
        loja_nome: lojaPorIdVF.get(produto.loja_id) ?? "—",
        img: imagemPorProdutoVF.get(v.produto_id) ?? null,
        previsao: v.previsao,
        estoque: v.estoque ?? 0,
        valor: v.valor,
        preco_base: produto.valor,
        quantidade_minima: produto.quantidade_minima,
      };
    })
    .filter((v): v is NonNullable<typeof v> => v !== null);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <VitrineHeader />

      <main className="flex-1">
        {/* Primeira dobra: pôster — headline + banner real (DESIGN.md) */}
        <section className="bg-roxo-900">
          <div className="mx-auto max-w-[1280px] px-4 pb-8 pt-8 sm:px-6 md:pt-10">
            <p className="text-xs font-semibold uppercase tracking-[.12em] text-amarelo">
              Marketplace B2B industrial · Manaus/AM
            </p>
            <h1 className="font-display mt-2 max-w-[720px] text-[32px] font-extrabold leading-[1.05] text-white sm:text-[44px] md:text-[52px]">
              Compre direto de quem fabrica.
            </h1>
            <p className="mt-3 max-w-[520px] text-sm leading-relaxed text-white/70 sm:text-base">
              Indústrias e produtores da Amazônia vendendo sem atravessador
              para mercadinhos, restaurantes e obras — 24 horas por dia.
            </p>
            <div className="mt-6">
              <BannerCarousel bannerUrl={bannerUrl} bannerMobileUrl={bannerMobileUrl} />
            </div>
          </div>
        </section>

        {/* Produtos com descontos progressivos (fiel à home real) */}
        {produtosComDesconto.length > 0 && (
          <section className="max-w-[1280px] mx-auto px-4 sm:px-6 mt-10">
            <TituloSecao kicker="Grandes volumes">Produtos com descontos progressivos</TituloSecao>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
              {produtosComDesconto.map((produto) => (
                <ProdutoDescontoCard key={produto.id} produto={produto} />
              ))}
            </div>
          </section>
        )}

        {/* Categorias */}
        <section className="max-w-[1280px] mx-auto px-4 sm:px-6 mt-8">
          <TituloSecao kicker="Navegue">Categorias</TituloSecao>
          {categoriasError ? (
            <ErrorState
              title="Não foi possível carregar as categorias"
              detail={categoriasError.message}
            />
          ) : categorias && categorias.length > 0 ? (
            <div className="flex gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible">
              {categorias.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/categoria/${cat.id}`}
                  className="shrink-0 rounded-sm px-3 py-1.5 text-sm font-medium bg-surface border border-line text-ink-2 hover:border-roxo-800 hover:text-roxo-800 transition-colors"
                >
                  {cat.nome}
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[#7C7C7C]">
              Nenhuma categoria disponível ainda.
            </p>
          )}
        </section>

        {/* Lojas */}
        <section className="max-w-[1280px] mx-auto px-4 sm:px-6 mt-10">
          <TituloSecao kicker="Quem fabrica">Lojas</TituloSecao>
          {lojasError ? (
            <ErrorState
              title="Não foi possível carregar as lojas"
              detail={lojasError.message}
            />
          ) : lojas && lojas.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {lojas.map((loja) => (
                <LojaCard key={loja.id} loja={loja} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-[#7C7C7C]">
              Nenhuma loja disponível ainda.
            </p>
          )}
        </section>

        {/* Compre do Mercado Futuro (venda futura, fiel à home real) */}
        <MercadoFuturo itens={itensMercadoFuturo} />

        {/* Produtos recentes */}
        <section className="max-w-[1280px] mx-auto px-4 sm:px-6 mt-10 mb-12">
          <TituloSecao kicker="Chegou agora">Produtos recentes</TituloSecao>
          {produtosError ? (
            <ErrorState
              title="Não foi possível carregar os produtos"
              detail={produtosError.message}
            />
          ) : imagensError ? (
            <ErrorState
              title="Não foi possível carregar as imagens dos produtos"
              detail={imagensError.message}
            />
          ) : produtosComImagem.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
              {produtosComImagem.map((produto) => (
                <ProdutoCard key={produto.id} produto={{ ...produto, img: produto.imagemUrl }} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-[#7C7C7C]">
              Nenhum produto disponível ainda.
            </p>
          )}
        </section>
      </main>

      <VitrineFooter />
    </div>
  );
}
