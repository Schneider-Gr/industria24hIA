import { VitrineHeader, VitrineFooter, LojaCard, ProdutoCard, TituloSecao } from "@/components/vitrine/ui";
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
      .eq("status_produto", "Aprovado")
      .order("created_at", { ascending: false })
      .limit(12),
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
            <picture className="mt-6 block overflow-hidden rounded-md">
              <source media="(max-width: 640px)" srcSet={bannerMobileUrl} />
              <img
                src={bannerUrl}
                alt="Indústria 24h"
                className="w-full object-cover"
              />
            </picture>
          </div>
        </section>

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
