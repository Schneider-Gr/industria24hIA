import { getUser, getMinhaLoja } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ErrorState } from "@/components/ErrorState";
import { PageTitle, PrecisaLogin, SemLoja, VazioBox } from "@/components/seller/states";
import { formatBRL, formatData } from "@/components/seller/format";
import { criarVendaFutura, removerVendaFutura } from "./actions";

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
        .select("id, produto_id, previsao, estoque, valor")
        .in("produto_id", ids)
        .order("previsao", { ascending: true })
    : { data: [], error: null };

  if (error) {
    return <ErrorState title="Falha ao carregar vendas futuras" detail={error.message} />;
  }

  const vendas = data ?? [];
  const lista = produtos ?? [];

  return (
    <div>
      <PageTitle
        title="Venda Futura"
        subtitle="Produtos com previsão de disponibilidade."
      />

      <div className="mb-6 rounded border border-line bg-white p-4">
        <h2 className="mb-3 text-[15px] font-semibold text-ink">Nova venda futura</h2>

        {lista.length === 0 ? (
          <p className="text-sm text-muted">
            Cadastre um produto na sua loja antes de registrar uma venda futura.
          </p>
        ) : (
          <form action={criarVendaFutura} className="grid grid-cols-1 gap-3 sm:grid-cols-4 sm:items-end">
            <div className="flex flex-col gap-1 sm:col-span-2">
              <label htmlFor="produto_id" className="text-[11px] uppercase tracking-wider text-muted font-medium">
                Produto
              </label>
              <select
                id="produto_id"
                name="produto_id"
                required
                className="rounded border border-line px-3 py-2 text-sm"
              >
                {lista.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="estoque" className="text-[11px] uppercase tracking-wider text-muted font-medium">
                Estoque
              </label>
              <input
                id="estoque"
                name="estoque"
                type="number"
                min={0}
                required
                placeholder="Quantidade produto"
                className="rounded border border-line px-3 py-2 text-sm num"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="valor" className="text-[11px] uppercase tracking-wider text-muted font-medium">
                Valor
              </label>
              <input
                id="valor"
                name="valor"
                type="number"
                min={0}
                step={0.01}
                placeholder="Valor do produto unitario"
                className="rounded border border-line px-3 py-2 text-sm num"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="previsao" className="text-[11px] uppercase tracking-wider text-muted font-medium">
                Disponibilidade
              </label>
              <input
                id="previsao"
                name="previsao"
                type="date"
                required
                className="rounded border border-line px-3 py-2 text-sm"
              />
            </div>

            <div className="sm:col-span-4">
              <button
                type="submit"
                className="rounded bg-laranja px-4 py-2 text-sm font-semibold text-white hover:bg-laranja-escuro"
              >
                Registrar venda futura
              </button>
            </div>
          </form>
        )}
      </div>

      {vendas.length === 0 ? (
        <VazioBox>Nenhuma venda futura registrada.</VazioBox>
      ) : (
        <div className="overflow-x-auto rounded border-line border">
          <table className="w-full text-sm">
            <thead className="bg-surface">
              <tr>
                <th className="px-4 py-2 uppercase text-[11px] tracking-wider text-muted font-medium">Produto</th>
                <th className="px-4 py-2 uppercase text-[11px] tracking-wider text-muted font-medium">Disponibilidade</th>
                <th className="px-4 py-2 text-right uppercase text-[11px] tracking-wider text-muted font-medium">Estoque</th>
                <th className="px-4 py-2 text-right uppercase text-[11px] tracking-wider text-muted font-medium">Valor</th>
                <th className="px-4 py-2 text-right uppercase text-[11px] tracking-wider text-muted font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {vendas.map((v) => (
                <tr key={v.id} className="border-t border-line">
                  <td className="px-4 py-2">{nomePorProduto.get(v.produto_id) ?? "—"}</td>
                  <td className="px-4 py-2">{formatData(v.previsao)}</td>
                  <td className="px-4 py-2 text-right num font-semibold">{v.estoque ?? "—"}</td>
                  <td className="px-4 py-2 text-right num">{v.valor ? formatBRL(v.valor) : "—"}</td>
                  <td className="px-4 py-2 text-right">
                    <form action={removerVendaFutura}>
                      <input type="hidden" name="id" value={v.id} />
                      <button
                        type="submit"
                        className="rounded border border-line px-3 py-1 text-[13px] font-medium text-erro hover:bg-erro/10"
                      >
                        Remover
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
