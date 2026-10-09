import { getUser, getMinhaLoja } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageTitle, PrecisaLogin, SemLoja } from "@/components/seller/states";
import { SimuladorPreco } from "@/components/seller/SimuladorPreco";

export const dynamic = "force-dynamic";

export default async function SimuladorPrecoPage({ searchParams }: { searchParams: Promise<{ produto?: string }> }) {
  const user = await getUser();
  if (!user) return <PrecisaLogin />;
  const loja = await getMinhaLoja();
  if (!loja) return <SemLoja />;

  const supabase = await createClient();
  const { data: produtos } = await supabase
    .from("produtos")
    .select("id, nome")
    .eq("loja_id", loja.id)
    .gt("valor", 0)
    .order("nome");
  const { produto } = await searchParams;

  return (
    <div>
      <PageTitle
        title="Simulador de preço"
        subtitle="Quanto o comprador paga por unidade conforme a quantidade e o prazo de entrega, e quanto desconto você pode dar."
      />
      <div className="rounded border border-line bg-white p-4">
        {(produtos ?? []).length === 0 ? (
          <p className="text-sm text-muted">Cadastre um produto com preço para simular.</p>
        ) : (
          <SimuladorPreco produtos={produtos ?? []} produtoInicial={produto} />
        )}
      </div>
    </div>
  );
}
