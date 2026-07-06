import { getUser, getMinhaLoja } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ErrorState } from "@/components/ErrorState";
import { KpiCard } from "@/components/seller/KpiCard";
import { PageTitle, PrecisaLogin, SemLoja, VazioBox } from "@/components/seller/states";
import { formatBRL } from "@/components/seller/format";

export const dynamic = "force-dynamic";

export default async function AnaliseGeralPage() {
  const user = await getUser();
  if (!user) return <PrecisaLogin />;

  const loja = await getMinhaLoja();
  if (!loja) return <SemLoja />;

  const supabase = await createClient();

  // Pedidos da loja -> suas linhas de venda com repasse.
  const { data: pedidos, error: errPed } = await supabase
    .from("pedidos")
    .select("id")
    .eq("loja_id", loja.id);

  if (errPed) {
    return <ErrorState title="Falha ao carregar vendas" detail={errPed.message} />;
  }

  const ids = (pedidos ?? []).map((p) => p.id);
  const { data: itens, error } = ids.length
    ? await supabase
        .from("linha_itens")
        .select("id, produto_nome, quantidade, valor, repasse_ind, repasse_afiliado")
        .in("pedido_id", ids)
    : { data: [], error: null };

  if (error) {
    return <ErrorState title="Falha ao carregar vendas" detail={error.message} />;
  }

  const linhas = itens ?? [];
  const totalVendas = linhas.reduce((s, l) => s + (l.valor ?? 0), 0);
  const totalRepasse = linhas.reduce((s, l) => s + (l.repasse_ind ?? 0), 0);

  return (
    <div>
      <PageTitle
        title="Análise Geral"
        subtitle="Vendas por item e repasse da plataforma (Repasse Ind = 5%)"
      />

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label="Itens vendidos" value={linhas.length} />
        <KpiCard label="Valor total em vendas" value={formatBRL(totalVendas)} />
        <KpiCard label="Repasse Indústria (5%)" value={formatBRL(totalRepasse)} />
      </div>

      <h2 className="mb-3 text-lg font-medium">Vendas Geral</h2>
      {linhas.length === 0 ? (
        <VazioBox>Nenhuma venda registrada ainda.</VazioBox>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800">
          <table className="w-full text-sm">
            <thead className="bg-neutral-100 text-left dark:bg-neutral-900">
              <tr>
                <th className="px-4 py-2 font-medium">Item</th>
                <th className="px-4 py-2 text-right font-medium">Qtd</th>
                <th className="px-4 py-2 text-right font-medium">Valor</th>
                <th className="px-4 py-2 text-right font-medium">Repasse Ind</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((l) => (
                <tr key={l.id} className="border-t border-neutral-200 dark:border-neutral-800">
                  <td className="px-4 py-2">{l.produto_nome ?? "—"}</td>
                  <td className="px-4 py-2 text-right">{l.quantidade ?? 0}</td>
                  <td className="px-4 py-2 text-right">{formatBRL(l.valor)}</td>
                  <td className="px-4 py-2 text-right">{formatBRL(l.repasse_ind)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
