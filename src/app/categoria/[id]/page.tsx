import { VitrineHeader, VitrineFooter, ProdutoCard } from "@/components/vitrine/ui";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { ErrorState } from "@/components/ErrorState";

export default async function CategoriaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!isSupabaseConfigured) {
    return (
      <ErrorState
        title="Supabase não configurado"
        detail="Defina as variáveis do Supabase em web/.env.local (ou nas env vars da Vercel em produção)."
      />
    );
  }

  const { id } = await params;
  const supabase = await createClient();

  const { data: categoria, error: categoriaError } = await supabase
    .from("categorias")
    .select("id, nome")
    .eq("id", id)
    .single();

  if (categoriaError && categoriaError.code !== "PGRST116") {
    return (
      <div className="min-h-screen flex flex-col">
        <VitrineHeader />
        <main className="flex-1 mx-auto w-full max-w-[1280px] px-md py-2xl">
          <ErrorState
            title="Não foi possível carregar a categoria"
            detail={categoriaError.message}
          />
        </main>
        <VitrineFooter />
      </div>
    );
  }

  if (!categoria) {
    notFound();
  }

  const { data: produtosRaw, error: produtosError } = await supabase
    .from("produtos")
    .select("id, nome, valor, loja_id, produto_imagens(url, ordem)")
    .eq("categoria_id", id)
    .gt("valor", 0)
    .eq("status_produto", "Aprovado")
    .order("created_at", { ascending: false });

  const produtos = (produtosRaw ?? []).map((p) => {
    const imagens = Array.isArray(p.produto_imagens) ? p.produto_imagens : [];
    const primeiraImagem = [...imagens].sort(
      (a, b) => (a.ordem ?? 0) - (b.ordem ?? 0)
    )[0];
    return {
      id: p.id as string,
      nome: p.nome as string,
      valor: p.valor as number,
      loja_id: p.loja_id as string,
      img: primeiraImagem?.url ?? null,
    };
  });

  return (
    <div className="min-h-screen flex flex-col">
      <VitrineHeader />
      <main className="flex-1 mx-auto w-full max-w-[1280px] px-md py-2xl">
        <h1 className="font-display text-[28px] sm:text-[34px] font-bold text-[#121212] mb-lg">
          Categoria: {categoria.nome}
        </h1>

        {produtosError ? (
          <ErrorState
            title="Não foi possível carregar os produtos"
            detail={produtosError.message}
          />
        ) : produtos.length === 0 ? (
          <p className="text-[#7C7C7C] py-2xl">
            Nenhum produto aprovado nesta categoria no momento.
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-md">
            {produtos.map((produto) => (
              <ProdutoCard key={produto.id} produto={produto} />
            ))}
          </div>
        )}
      </main>
      <VitrineFooter />
    </div>
  );
}
