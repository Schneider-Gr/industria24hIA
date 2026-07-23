import { Fragment } from "react";
import { getUser, getMinhaLoja } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ErrorState } from "@/components/ErrorState";
import { PageTitle, PrecisaLogin, SemLoja, VazioBox } from "@/components/seller/states";
import { formatBRL, formatData } from "@/components/seller/format";
import { StatusBadge } from "@/components/admin/ui";
import { marcarEntrega, confirmarEntregaCodigo } from "./actions";

export const dynamic = "force-dynamic";

// Filtros da tela de pedidos do Bubble ("Concluidos", "Concluido e pago",
// "Ainda no Carrinho"), mapeados para os status reais de status_pedido.
const FILTROS = [
  { key: "todos", label: "Todos", match: () => true },
  {
    key: "pagos",
    label: "Concluido e pago",
    match: (s: string) => s.toLowerCase().includes("realizado"),
  },
  {
    key: "aguardando",
    label: "Aguardando pagamento",
    match: (s: string) => s.toLowerCase().includes("aguardando"),
  },
  {
    key: "carrinho",
    label: "Ainda no Carrinho",
    match: (s: string) => s.toLowerCase().includes("carrinho"),
  },
] as const;

export default async function PedidosPage({
  searchParams,
}: {
  searchParams: Promise<{ filtro?: string }>;
}) {
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

  const { filtro } = await searchParams;
  const filtroAtivo = FILTROS.find((f) => f.key === filtro) ?? FILTROS[0];
  const lista = (pedidos ?? []).filter((p) => filtroAtivo.match(p.status_pedido ?? ""));

  // Linhas dos pedidos, para os contadores de quantidade/transferido/entregue
  // e para exibir os itens de cada pedido.
  // Relação não tipada no schema gerado -> segunda query em vez de nested select.
  const ids = lista.map((p) => p.id);
  const { data: itens } = ids.length
    ? await supabase
        .from("linha_itens")
        .select(
          "id, pedido_id, produto_nome, quantidade, valor, repasse_ind, transferido, entregue, venda_futura_id",
        )
        .in("pedido_id", ids)
    : { data: [] };

  // Coluna "Venda Futura" do Bubble: item vinculado a uma venda futura mostra a
  // data de previsão de entrega. Relação não tipada -> query separada.
  const vfIds = [
    ...new Set(
      (itens ?? []).map((i) => i.venda_futura_id).filter((v): v is string => Boolean(v)),
    ),
  ];
  const { data: vendasFuturas } = vfIds.length
    ? await supabase.from("vendas_futuras").select("id, previsao").in("id", vfIds)
    : { data: [] };
  const previsaoVF = new Map((vendasFuturas ?? []).map((v) => [v.id, v.previsao]));

  // Fonte de verdade do fulfillment é a tabela `entregas` (0009/0014), gravada
  // também por admin e afiliado logístico. A flag legada linha_itens.entregue é
  // só fallback para itens migrados que ainda não têm linha em `entregas`.
  const itemIds = (itens ?? []).map((i) => i.id);
  const { data: entregas } = itemIds.length
    ? await supabase.from("entregas").select("linha_item_id, status").in("linha_item_id", itemIds)
    : { data: [] };
  const statusEntrega = new Map((entregas ?? []).map((e) => [e.linha_item_id, e.status]));
  const foiEntregue = (it: { id: string; entregue: boolean | null }) => {
    const s = statusEntrega.get(it.id);
    return s ? s === "Entregue" : Boolean(it.entregue);
  };

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
      repasse_ind: number | null;
      transferido: boolean | null;
      entregue: boolean | null;
      previsao_vf: string | null;
    }>
  >();
  for (const it of itens ?? []) {
    const agg = porPedido.get(it.pedido_id) ?? {
      qtd: 0,
      total: 0,
      transf: 0,
      entreg: 0,
    };
    const entregue = foiEntregue(it);
    agg.qtd += it.quantidade ?? 0;
    agg.total += 1;
    if (it.transferido) agg.transf += 1;
    if (entregue) agg.entreg += 1;
    porPedido.set(it.pedido_id, agg);

    const lista_itens = itensPorPedido.get(it.pedido_id) ?? [];
    lista_itens.push({
      id: it.id,
      produto_nome: it.produto_nome,
      quantidade: it.quantidade,
      valor: it.valor,
      repasse_ind: it.repasse_ind,
      transferido: it.transferido,
      entregue,
      previsao_vf: it.venda_futura_id ? (previsaoVF.get(it.venda_futura_id) ?? null) : null,
    });
    itensPorPedido.set(it.pedido_id, lista_itens);
  }

  return (
    <div>
      <PageTitle title="Pedidos: Visão Geral" subtitle="Todos os pedidos da sua loja" />

      <div className="mb-4 flex flex-wrap gap-2">
        {FILTROS.map((f) => (
          <a
            key={f.key}
            href={f.key === "todos" ? "/seller/pedidos" : `/seller/pedidos?filtro=${f.key}`}
            className={`rounded-full border px-3 py-1 text-sm ${
              f.key === filtroAtivo.key
                ? "border-aco-900 bg-aco-900 font-semibold text-white"
                : "border-line hover:bg-surface"
            }`}
          >
            {f.label}
          </a>
        ))}
      </div>

      {lista.length === 0 ? (
        <VazioBox>Nenhum pedido {filtroAtivo.key === "todos" ? "registrado ainda" : "neste filtro"}.</VazioBox>
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
                  <Fragment key={p.id}>
                    <tr className="border-t border-line">
                      <td className="px-4 py-2 font-mono text-xs">{p.id_venda}</td>
                      <td className="px-4 py-2">{p.cliente_nome ?? "—"}</td>
                      <td className="px-4 py-2">{formatData(p.data)}</td>
                      <td className="px-4 py-2 text-right num">{agg?.qtd ?? 0}</td>
                      <td className="px-4 py-2">
                        <StatusBadge status={p.status_pedido} />
                      </td>
                      <td className="px-4 py-2 num">
                        {agg ? `${agg.transf} de ${agg.total}` : "—"}
                      </td>
                      <td className="px-4 py-2 num">
                        {agg ? `${agg.entreg} de ${agg.total}` : "—"}
                      </td>
                      <td className="px-4 py-2 text-right num font-semibold">{formatBRL(p.valor_pedido)}</td>
                    </tr>
                    <tr className="border-t border-line bg-surface/50">
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
                                <th className="px-2 py-1 text-right uppercase text-[10px] tracking-wider text-muted font-medium">Repasse Ind</th>
                                <th className="px-2 py-1 text-left uppercase text-[10px] tracking-wider text-muted font-medium">Venda Futura</th>
                                <th className="px-2 py-1 text-left uppercase text-[10px] tracking-wider text-muted font-medium">Transferência</th>
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
                                  <td className="px-2 py-1.5 text-right num text-muted">
                                    {item.repasse_ind != null ? formatBRL(item.repasse_ind) : "—"}
                                  </td>
                                  <td className="px-2 py-1.5">
                                    {item.previsao_vf ? (
                                      <span className="inline-block rounded bg-[#DBEAFE] px-1.5 py-0.5 text-[11px] font-medium text-[#1E40AF]">
                                        sim · {formatData(item.previsao_vf)}
                                      </span>
                                    ) : (
                                      <span className="text-[11px] text-muted">não</span>
                                    )}
                                  </td>
                                  <td className="px-2 py-1.5">
                                    {item.transferido ? (
                                      <span className="inline-block rounded bg-[#DCFCE7] px-1.5 py-0.5 text-[11px] font-medium text-[#166534]">
                                        Transferência realizada
                                      </span>
                                    ) : (
                                      <span className="inline-block rounded bg-[#FEF3C7] px-1.5 py-0.5 text-[11px] font-medium text-[#92400E]">
                                        Aguardando
                                      </span>
                                    )}
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
                        {p.status_pedido === "Pagamento Realizado" && (
                          <form
                            action={confirmarEntregaCodigo}
                            className="mt-2 flex items-center gap-2"
                          >
                            <input type="hidden" name="pedido_id" value={p.id} />
                            <label className="text-[11px] font-medium uppercase tracking-wider text-muted">
                              Código do comprador
                            </label>
                            <input
                              type="text"
                              name="codigo"
                              inputMode="numeric"
                              maxLength={6}
                              placeholder="000000"
                              required
                              className="num w-24 rounded border border-line px-2 py-1 text-sm"
                            />
                            <button
                              type="submit"
                              className="rounded border border-line px-2 py-1 text-[11px] font-semibold hover:bg-surface"
                            >
                              Confirmar retirada/entrega
                            </button>
                          </form>
                        )}
                      </td>
                    </tr>
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
