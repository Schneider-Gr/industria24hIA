import { VitrineHeader, VitrineFooter, ProdutoCard, TituloSecao } from "@/components/vitrine/ui";
import { notFound } from "next/navigation";
import { createPublicClient } from "@/lib/supabase/public";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { ErrorState } from "@/components/ErrorState";
import { cookies } from "next/headers";
import { lerEnderecoCookie, lojaCobreCep, CEP_COOKIE, type FaixaCep } from "@/lib/cep";
import { buscarFlagsRapidas } from "@/lib/vitrine-quick-flags";

// Página pública sem sessão — ISR (ver loja/[id] para o raciocínio).
export const revalidate = 60;

export default async function CategoriaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ sub?: string }>;
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
  const { sub } = await searchParams;
  const supabase = createPublicClient();

  const { data: categoria, error: categoriaError } = await supabase
    .from("categorias")
    .select("id, nome")
    .eq("id", id)
    .single();

  if (categoriaError && categoriaError.code !== "PGRST116") {
    return (
      <div className="min-h-screen flex flex-col">
        <VitrineHeader />
        <main className="anim-entra flex-1 mx-auto w-full max-w-[1280px] px-md py-2xl">
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

  // `?sub=` vem dos links de subcategoria do mega-menu do header.
  let produtosQuery = supabase
    .from("produtos")
    .select("id, nome, valor, loja_id, produto_imagens(url, ordem)")
    .eq("categoria_id", id)
    .gt("valor", 0)
    .eq("status_produto", "Aprovado");
  if (sub) produtosQuery = produtosQuery.eq("subcategoria_id", sub);
  const { data: produtosRaw, error: produtosError } = await produtosQuery.order(
    "created_at",
    { ascending: false }
  );

  const cookieStore = await cookies();
  const cepComprador = lerEnderecoCookie(cookieStore.get(CEP_COOKIE)?.value)?.cep ?? null;
  const { data: faixasCep } = await supabase
    .from("faixas_cep")
    .select("cep_inicial, cep_final, loja_id, ativo")
    .eq("ativo", true);
  const faixas = (faixasCep ?? []) as FaixaCep[];

  const lojaIds = [...new Set((produtosRaw ?? []).map((p) => p.loja_id as string))];
  const { data: lojasCategoria } = lojaIds.length
    ? await supabase.from("lojas_vitrine").select("id, cidade, estado").in("id", lojaIds)
    : { data: [] as { id: string; cidade: string | null; estado: string | null }[] };
  const lojaPorId = new Map((lojasCategoria ?? []).map((l) => [l.id, l]));

  const produtos = (produtosRaw ?? [])
    .filter((p) => !cepComprador || lojaCobreCep(faixas, p.loja_id as string, cepComprador))
    .map((p) => {
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

  const { vendaFutura, coletiva } = await buscarFlagsRapidas(
    supabase,
    produtos.map((p) => p.id),
  );

  return (
    <div className="min-h-screen flex flex-col">
      <VitrineHeader />
      <main className="anim-entra flex-1 mx-auto w-full max-w-[1280px] px-md py-2xl">
        <TituloSecao kicker="Categoria">{categoria.nome}</TituloSecao>

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
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
            {produtos.map((produto) => (
              <ProdutoCard
                key={produto.id}
                produto={produto}
                lojaCidade={lojaPorId.get(produto.loja_id)?.cidade}
                lojaEstado={lojaPorId.get(produto.loja_id)?.estado}
                temVendaFutura={vendaFutura.has(produto.id)}
                temCompraColetiva={coletiva.has(produto.id)}
              />
            ))}
          </div>
        )}
      </main>
      <VitrineFooter />
    </div>
  );
}
