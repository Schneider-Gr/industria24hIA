import { createPublicClient } from "@/lib/supabase/public";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { ErrorState } from "@/components/ErrorState";
import { VitrineHeader, VitrineFooter } from "@/components/vitrine/ui";
import { formatBRL } from "@/components/seller/format";
import { notFound } from "next/navigation";
import Link from "next/link";

// Página pública da coleção do afiliado (openspec afiliado-vitrine-curada):
// sem login, cada produto usa seu próprio `?ref=` (a afiliação individual já
// existente) — a coleção é só uma camada de apresentação, não um novo
// identificador de rastreio.
export default async function VitrinePublicaPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  if (!isSupabaseConfigured) {
    return <ErrorState title="Configuração pendente" detail="Supabase não configurado." />;
  }

  const { slug } = await params;
  const supabase = createPublicClient();

  const { data: vitrine, error: vitrineError } = await supabase
    .from("afiliado_vitrines")
    .select("id, nome")
    .eq("slug", slug)
    .maybeSingle();

  if (vitrineError) {
    return <ErrorState title="Erro ao carregar coleção" detail={vitrineError.message} />;
  }
  if (!vitrine) notFound();

  const { data: itens, error: itensError } = await supabase
    .from("afiliado_vitrine_produtos")
    .select("produto_id, produtos(nome, valor), afiliacoes(identificador)")
    .eq("vitrine_id", vitrine.id);

  if (itensError) {
    return <ErrorState title="Erro ao carregar produtos" detail={itensError.message} />;
  }

  const produtoIds = (itens ?? []).map((i) => i.produto_id);
  const imagemPorProduto = new Map<string, string>();
  if (produtoIds.length > 0) {
    const { data: imagens } = await supabase
      .from("produto_imagens")
      .select("produto_id, url, ordem")
      .in("produto_id", produtoIds)
      .order("ordem", { ascending: true });
    (imagens ?? []).forEach((img) => {
      if (!imagemPorProduto.has(img.produto_id)) imagemPorProduto.set(img.produto_id, img.url);
    });
  }

  return (
    <div className="flex min-h-full flex-col">
      <VitrineHeader />
      <main className="mx-auto w-full max-w-[1280px] flex-1 px-4 py-8 sm:px-6">
        <h1 className="font-display text-xl font-bold text-ink">{vitrine.nome}</h1>
        <p className="mt-1 text-sm text-muted">Coleção de produtos selecionados</p>

        {(itens ?? []).length === 0 ? (
          <p className="mt-6 text-sm text-muted">Nenhum produto nesta coleção no momento.</p>
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {(itens ?? []).map((item, idx) => {
              const produto = item.produtos as unknown as { nome: string; valor: number } | null;
              const afiliacao = item.afiliacoes as unknown as { identificador: string | null } | null;
              if (!produto) return null;
              const href = afiliacao?.identificador
                ? `/produto/${item.produto_id}?ref=${afiliacao.identificador}`
                : `/produto/${item.produto_id}`;
              const img = imagemPorProduto.get(item.produto_id);
              return (
                <Link
                  key={`${item.produto_id}-${idx}`}
                  href={href}
                  className="group flex flex-col overflow-hidden rounded-md border border-line bg-surface transition-[border-color,box-shadow] duration-150 hover:border-lm-azul hover:shadow-[0_4px_16px_rgba(30,90,138,.12)]"
                >
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-line/40">
                    {img ? (
                      <img src={img} alt={produto.nome} loading="lazy" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-muted">
                        sem imagem
                      </div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col p-3">
                    <p className="line-clamp-2 min-h-[2.5em] text-[13px] leading-snug text-ink group-hover:text-lm-azul sm:text-sm">
                      {produto.nome}
                    </p>
                    <p className="num mt-auto pt-1 text-base font-bold text-ink sm:text-lg">
                      {formatBRL(produto.valor)}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
      <VitrineFooter />
    </div>
  );
}
