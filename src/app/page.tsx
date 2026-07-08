import { VitrineHeader, VitrineFooter, LojaCard, ProdutoCard } from "@/components/vitrine/ui";
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

  return (
    <div className="min-h-screen flex flex-col bg-[var(--fundo,#FAFAF9)]">
      <VitrineHeader />

      <main className="flex-1">
        {/* Banner principal */}
        <section className="max-w-[1280px] mx-auto px-4 pt-6">
          <img
            src={bannerUrl}
            alt="Indústria 24h"
            className="w-full h-auto rounded-lg object-cover"
          />
        </section>

        {/* Categorias */}
        <section className="max-w-[1280px] mx-auto px-4 mt-8">
          <h2 className="font-display text-[19px] font-bold text-[#121212] mb-3">
            Categorias
          </h2>
          {categoriasError ? (
            <ErrorState
              title="Não foi possível carregar as categorias"
              detail={categoriasError.message}
            />
          ) : categorias && categorias.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {categorias.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/categoria/${cat.id}`}
                  className="rounded px-3 py-1.5 text-sm font-medium bg-white border border-[#E5E7EB] text-[#374151] hover:border-[#4C1D95] hover:text-[#4C1D95] transition-colors"
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
        <section className="max-w-[1280px] mx-auto px-4 mt-10">
          <h2 className="font-display text-[24px] font-bold text-[#121212] mb-4">
            Lojas
          </h2>
          {lojasError ? (
            <ErrorState
              title="Não foi possível carregar as lojas"
              detail={lojasError.message}
            />
          ) : lojas && lojas.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
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
        <section className="max-w-[1280px] mx-auto px-4 mt-10 mb-12">
          <h2 className="font-display text-[24px] font-bold text-[#121212] mb-4">
            Produtos recentes
          </h2>
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
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
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
