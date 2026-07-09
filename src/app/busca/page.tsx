import { VitrineHeader, VitrineFooter, ProdutoCard, TituloSecao } from "@/components/vitrine/ui";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { ErrorState } from "@/components/ErrorState";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function BuscaPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  if (!isSupabaseConfigured) {
    return (
      <ErrorState
        title="Supabase não configurado"
        detail="Defina as variáveis do Supabase em web/.env.local (ou nas env vars da Vercel em produção)."
      />
    );
  }

  const { q } = await searchParams;
  const termo = (q ?? "").trim();
  const supabase = await createClient();

  const { data: produtosRaw, error } = termo
    ? await supabase
        .from("produtos")
        .select("id, nome, valor, quantidade_minima, produto_imagens(url, ordem)")
        .ilike("nome", `%${termo}%`)
        .gt("valor", 0)
        .order("created_at", { ascending: false })
        .limit(48)
    : { data: [], error: null };

  const produtos = (produtosRaw ?? []).map((p) => {
    const imagens = Array.isArray(p.produto_imagens) ? p.produto_imagens : [];
    const primeira = [...imagens].sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0))[0];
    return { ...p, imagem_url: primeira?.url ?? null };
  });

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <VitrineHeader />
      <main className="mx-auto w-full max-w-[1280px] flex-1 px-4 py-8 sm:px-6">
        <TituloSecao kicker="Busca">
          {termo ? `Resultados para “${termo}”` : "O que você procura?"}
        </TituloSecao>

        {error ? (
          <ErrorState title="Não foi possível buscar" detail={error.message} />
        ) : !termo ? (
          <p className="text-sm text-muted">
            Digite um termo na busca acima para encontrar produtos.
          </p>
        ) : produtos.length === 0 ? (
          <div className="rounded-md border border-dashed border-line bg-surface p-10 text-center text-sm text-muted">
            Nenhum produto encontrado para “{termo}”.{" "}
            <Link href="/" className="text-roxo-800 underline underline-offset-2">
              Ver todas as lojas
            </Link>
          </div>
        ) : (
          <>
            <p className="mb-4 text-sm text-muted">
              <span className="num font-semibold text-ink">{produtos.length}</span>{" "}
              produto{produtos.length > 1 ? "s" : ""} encontrado
              {produtos.length > 1 ? "s" : ""}
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5">
              {produtos.map((p) => (
                <ProdutoCard key={p.id} produto={p} />
              ))}
            </div>
          </>
        )}
      </main>
      <VitrineFooter />
    </div>
  );
}
