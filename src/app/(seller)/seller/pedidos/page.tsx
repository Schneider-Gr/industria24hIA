import { getUser, getMinhaLoja } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ErrorState } from "@/components/ErrorState";
import { PageTitle, PrecisaLogin, SemLoja, VazioBox } from "@/components/seller/states";
import { formatBRL, formatData } from "@/components/seller/format";
import { marcarEntrega } from "./actions";

export const dynamic = "force-dynamic";

export default async function PedidosPage() {
  const user = await getUser();
  if (!user) return <PrecisaLogin />;

  const loja = await getMinhaLoja();
  if (!loja) return <SemLoja />;

  const supabase = await createClient();
  const { data: pedidos, error } = await supabase
    .from("pedidos")
    .select("id, id_venda, cliente_nome, data, status_pedido, valor_pedido")
    .eq("loja_id", loja.id)
    .order("data", { ascending: false });

  if (error) {
    return <ErrorState title="Falha ao carregar pedidos" detail={error.message} />;
  }

  const lista = pedidos ?? [];

  // Linhas dos pedidos, para os contadores de quantidade/transferido/entregue
  // e para exibir os itens de cada pedido.
  // Relação não tipada no schema gerado -> segunda query em vez de nested select.
  const ids = lista.map((p) => p.id);
  const { data: itens } = ids.length
    ? await supabase
        .from("linha_itens")
        .select("id, pedido_id, produto_nome, quantidade, valor, transferido, entregue")
        .in("pedido_id", ids)
    : { data: [] };

  const porPedido = new Map<
    string,
    { qtd: number; total: number; transf: number; entreg: number }
  >();
  const itensPorPedido = new Map<
    string,
    Array<{
      id: string;
      produto_nome: string | null;
      quantidade: number | null;
      valor: number | null;
      entregue: boolean | null;
    }>
  >();
  for (const it of itens ?? []) {
    const agg = porPedido.get(it.pedido_id) ?? {
      qtd: 0,
      total: 0,
      transf: 0,
      entreg: 0,
    };
    agg.qtd += it.quantidade ?? 0;
    agg.total += 1;
    if (it.transferido) agg.transf += 1;
    if (it.entregue) agg.entreg += 1;
    porPedido.set(it.pedido_id, agg);

    const lista_itens = itensPorPedido.get(it.pedido_id) ?? [];
    lista_itens.push({
      id: it.id,
      produto_nome: it.produto_nome,
      quantidade: it.quantidade,
      valor: it.valor,
      entregue: it.entregue,
    });
    itensPorPedido.set(it.pedido_id, lista_itens);
  }

  return (
    <div>
      <PageTitle title="Pedidos" subtitle="Todos os pedidos da sua loja" />

      {lista.length === 0 ? (
        <VazioBox>Nenhum pedido registrado ainda.</VazioBox>
      ) : (
        <div className="overflow-x-auto rounded border-line border">
          <table className="w-full text-sm">
            <thead className="bg-surface">
              <tr>
                <th className="px-4 py-2 uppercase text-[11px] tracking-wider text-muted font-medium">Id Venda</th>
                <th className="px-4 py-2 uppercase text-[11px] tracking-wider text-muted font-medium">Cliente</th>
                <th className="px-4 py-2 uppercase text-[11px] tracking-wider text-muted font-medium">Data</th>
                <th className="px-4 py-2 text-right uppercase text-[11px] tracking-wider text-muted font-medium">Qtd</th>
                <th className="px-4 py-2 uppercase text-[11px] tracking-wider text-muted font-medium">Status Pedido</th>
                <th className="px-4 py-2 uppercase text-[11px] tracking-wider text-muted font-medium">Transferidos</th>
                <th className="px-4 py-2 uppercase text-[11px] tracking-wider text-muted font-medium">Entregues</th>
                <th className="px-4 py-2 text-right uppercase text-[11px] tracking-wider text-muted font-medium">Valor Pedido</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((p) => {
                const agg = porPedido.get(p.id);
                const itensDoPedido = itensPorPedido.get(p.id) ?? [];
                return (
                  <>
                    <tr key={p.id} className="border-t border-line">
                      <td className="px-4 py-2 font-mono text-xs">{p.id_venda}</td>
                      <td className="px-4 py-2">{p.cliente_nome ?? "—"}</td>
                      <td className="px-4 py-2">{formatData(p.data)}</td>
                      <td className="px-4 py-2 text-right num">{agg?.qtd ?? 0}</td>
                      <td className="px-4 py-2">{p.status_pedido}</td>
                      <td className="px-4 py-2 num">
                        {agg ? `${agg.transf} de ${agg.total}` : "—"}
                      </td>
                      <td className="px-4 py-2 num">
                        {agg ? `${agg.entreg} de ${agg.total}` : "—"}
                      </td>
                      <td className="px-4 py-2 text-right num font-semibold">{formatBRL(p.valor_pedido)}</td>
                    </tr>
                    <tr key={`${p.id}-itens`} className="border-t border-line bg-surface/50">
                      <td colSpan={8} className="px-4 py-3">
                        {itensDoPedido.length === 0 ? (
                          <span className="text-xs text-muted">Nenhum item encontrado para este pedido.</span>
                        ) : (
                          <table className="w-full text-xs">
                            <thead>
                              <tr>
                                <th className="px-2 py-1 text-left uppercase text-[10px] tracking-wider text-muted font-medium">Produto</th>
                                <th className="px-2 py-1 text-right uppercase text-[10px] tracking-wider text-muted font-medium">Qtd</th>
                                <th className="px-2 py-1 text-right uppercase text-[10px] tracking-wider text-muted font-medium">Valor</th>
                                <th className="px-2 py-1 text-left uppercase text-[10px] tracking-wider text-muted font-medium">Entrega</th>
                                <th className="px-2 py-1 text-right uppercase text-[10px] tracking-wider text-muted font-medium">Ação</th>
                              </tr>
                            </thead>
                            <tbody>
                              {itensDoPedido.map((item) => (
                                <tr key={item.id} className="border-t border-line">
                                  <td className="px-2 py-1.5">{item.produto_nome ?? "—"}</td>
                                  <td className="px-2 py-1.5 text-right num">{item.quantidade ?? 0}</td>
                                  <td className="px-2 py-1.5 text-right num font-semibold">
                                    {formatBRL(item.valor ?? 0)}
                                  </td>
                                  <td className="px-2 py-1.5">
                                    {item.entregue ? (
                                      <span className="inline-block rounded bg-[#DCFCE7] px-1.5 py-0.5 text-[11px] font-medium text-[#166534]">
                                        Entregue
                                      </span>
                                    ) : (
                                      <span className="inline-block rounded bg-[#FEF3C7] px-1.5 py-0.5 text-[11px] font-medium text-[#92400E]">
                                        Pendente
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-2 py-1.5 text-right">
                                    <form action={marcarEntrega}><input type="hidden" name="item_id" value={item.id} /><input type="hidden" name="entregue" value={String(!item.entregue)} />
                                      <button
                                        type="submit"
                                        className="rounded border border-line px-2 py-1 text-[11px] font-semibold hover:bg-surface"
                                      >
                                        {item.entregue ? "Desfazer" : "Marcar entregue"}
                                      </button>
                                    </form>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </td>
                    </tr>
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
