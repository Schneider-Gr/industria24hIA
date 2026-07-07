import { getUser, getMinhaLoja } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ErrorState } from "@/components/ErrorState";
import { PageTitle, PrecisaLogin, SemLoja, VazioBox } from "@/components/seller/states";

export const dynamic = "force-dynamic";

export default async function PromocoesPage() {
  const user = await getUser();
  if (!user) return <PrecisaLogin />;

  const loja = await getMinhaLoja();
  if (!loja) return <SemLoja />;

  const supabase = await createClient();
  const { data: produtos } = await supabase
    .from("produtos")
    .select("id, nome")
    .eq("loja_id", loja.id);

  const nomePorProduto = new Map((produtos ?? []).map((p) => [p.id, p.nome]));
  const ids = [...nomePorProduto.keys()];

  const { data, error } = ids.length
    ? await supabase
        .from("promocoes_progressivas")
        .select("id, produto_id, faixas, ativo")
        .in("produto_id", ids)
    : { data: [], error: null };

  if (error) {
    return <ErrorState title="Falha ao carregar promoções" detail={error.message} />;
  }

  const promocoes = data ?? [];

  return (
    <div>
      <PageTitle
        title="Promoções"
        subtitle="Descontos progressivos por faixa de quantidade, por produto."
      />

      {promocoes.length === 0 ? (
        <VazioBox>Nenhuma promoção progressiva cadastrada.</VazioBox>
      ) : (
        <div className="overflow-x-auto rounded border-line border">
          <table className="w-full text-sm">
            <thead className="bg-surface">
              <tr>
                <th className="px-4 py-2 uppercase text-[11px] tracking-wider text-muted font-medium">Produto</th>
                <th className="px-4 py-2 uppercase text-[11px] tracking-wider text-muted font-medium text-right">Faixas de desconto</th>
                <th className="px-4 py-2 uppercase text-[11px] tracking-wider text-muted font-medium">Ativo</th>
              </tr>
            </thead>
            <tbody>
              {promocoes.map((p) => {
                const qtdFaixas = Array.isArray(p.faixas) ? p.faixas.length : 0;
                return (
                  <tr key={p.id} className="border-t border-line">
                    <td className="px-4 py-2 text-ink">{nomePorProduto.get(p.produto_id) ?? "—"}</td>
                    <td className="px-4 py-2 text-right num text-ink">{qtdFaixas}</td>
                    <td className="px-4 py-2 text-ink">{p.ativo ? "Sim" : "Não"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
