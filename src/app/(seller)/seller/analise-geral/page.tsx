import { getUser, getMinhaLoja } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ErrorState } from "@/components/ErrorState";
import { KpiCard } from "@/components/seller/KpiCard";
import { PageTitle, PrecisaLogin, SemLoja, VazioBox } from "@/components/seller/states";
import { formatBRL } from "@/components/seller/format";
import { fetchAll, chunk } from "@/lib/supabase/fetch-all";

export const dynamic = "force-dynamic";

export default async function AnaliseGeralPage() {
  const user = await getUser();
  if (!user) return <PrecisaLogin />;

  const loja = await getMinhaLoja();
  if (!loja) return <SemLoja />;

  const supabase = await createClient();

  // Pedidos da loja -> suas linhas de venda com repasse.
  const { data: pedidos, error: errPed } = await fetchAll((from, to) =>
    supabase.from("pedidos").select("id").eq("loja_id", loja.id).range(from, to),
  );

  if (errPed) {
    return <ErrorState title="Falha ao carregar vendas" detail={errPed.message} />;
  }

  const ids = pedidos.map((p) => p.id);
  const linhas: {
    id: string;
    produto_nome: string | null;
    quantidade: number | null;
    valor: number | null;
    repasse_ind: number | null;
    repasse_afiliado: number | null;
  }[] = [];
  for (const grupo of chunk(ids)) {
    const { data, error } = await fetchAll((from, to) =>
      supabase
        .from("linha_itens")
        .select("id, produto_nome, quantidade, valor, repasse_ind, repasse_afiliado")
        .in("pedido_id", grupo)
        .range(from, to),
    );
    if (error) {
      return <ErrorState title="Falha ao carregar vendas" detail={error.message} />;
    }
    linhas.push(...data);
  }
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

      <h2 className="font-display mb-3 text-24 font-bold">Vendas Geral</h2>
      {linhas.length === 0 ? (
        <VazioBox>Nenhuma venda registrada ainda.</VazioBox>
      ) : (
        <div className="overflow-x-auto rounded border-line">
          <table className="w-full text-sm">
            <thead className="bg-surface">
              <tr>
                <th className="px-4 py-2 uppercase text-[11px] tracking-wider text-muted font-medium">Item</th>
                <th className="px-4 py-2 text-right uppercase text-[11px] tracking-wider text-muted font-medium">Qtd</th>
                <th className="px-4 py-2 text-right uppercase text-[11px] tracking-wider text-muted font-medium">Valor</th>
                <th className="px-4 py-2 text-right uppercase text-[11px] tracking-wider text-muted font-medium">Repasse Ind</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((l) => (
                <tr key={l.id} className="border-t border-line">
                  <td className="px-4 py-2 text-ink">{l.produto_nome ?? "—"}</td>
                  <td className="px-4 py-2 text-right text-ink num">{l.quantidade ?? 0}</td>
                  <td className="px-4 py-2 text-right text-ink num font-semibold">{formatBRL(l.valor)}</td>
                  <td className="px-4 py-2 text-right text-ink num font-semibold">{formatBRL(l.repasse_ind)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
