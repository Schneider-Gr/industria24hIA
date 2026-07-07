import { getUser, getMinhaLoja } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ErrorState } from "@/components/ErrorState";
import { PageTitle, PrecisaLogin, SemLoja, VazioBox } from "@/components/seller/states";
import { formatData } from "@/components/seller/format";

export const dynamic = "force-dynamic";

export default async function VendaFuturaPage() {
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
        .from("vendas_futuras")
        .select("id, produto_id, previsao, estoque")
        .in("produto_id", ids)
        .order("previsao", { ascending: true })
    : { data: [], error: null };

  if (error) {
    return <ErrorState title="Falha ao carregar vendas futuras" detail={error.message} />;
  }

  const vendas = data ?? [];

  return (
    <div>
      <PageTitle
        title="Venda Futura"
        subtitle="Produtos com previsão de disponibilidade."
      />

      {vendas.length === 0 ? (
        <VazioBox>Nenhuma venda futura registrada.</VazioBox>
      ) : (
        <div className="overflow-x-auto rounded border-line border">
          <table className="w-full text-sm">
            <thead className="bg-surface">
              <tr>
                <th className="px-4 py-2 uppercase text-[11px] tracking-wider text-muted font-medium">Produto</th>
                <th className="px-4 py-2 uppercase text-[11px] tracking-wider text-muted font-medium">Previsão</th>
                <th className="px-4 py-2 text-right uppercase text-[11px] tracking-wider text-muted font-medium">Estoque previsto</th>
              </tr>
            </thead>
            <tbody>
              {vendas.map((v) => (
                <tr key={v.id} className="border-t border-line">
                  <td className="px-4 py-2">{nomePorProduto.get(v.produto_id) ?? "—"}</td>
                  <td className="px-4 py-2">{formatData(v.previsao)}</td>
                  <td className="px-4 py-2 text-right num font-semibold">{v.estoque ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
