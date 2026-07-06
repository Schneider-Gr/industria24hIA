import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { ErrorState } from "@/components/ErrorState";
import {
  PageHeader,
  KpiCard,
  Table,
  StatusBadge,
  EmptyState,
  fmtBRL,
  fmtDate,
} from "@/components/admin/ui";

export const dynamic = "force-dynamic";

function monthStartISO(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
}

export default async function AdminDashboard() {
  if (!isSupabaseConfigured) {
    return (
      <ErrorState
        title="Supabase não configurado"
        detail="Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY em web/.env.local."
      />
    );
  }

  const supabase = await createClient();
  const desde = monthStartISO();

  // Pedidos do mês. RLS atual escopa por dono da loja; admin cross-seller virá
  // com policy is_admin. Enquanto isso a leitura pode vir vazia (empty state).
  // TODO: requer policy is_admin
  const { data: pedidosData, error } = await supabase
    .from("pedidos")
    .select("id, id_venda, cliente_nome, loja_id, data, status_pedido, valor_pedido")
    .gte("data", desde)
    .order("data", { ascending: false });

  if (error) {
    return <ErrorState title="Falha ao carregar o dashboard" detail={error.message} />;
  }

  const pedidos = pedidosData ?? [];

  // Junção em JS (sem FK/embed do PostgREST): lojas e itens por id.
  const lojaIds = [...new Set(pedidos.map((p) => p.loja_id))];
  const pedidoIds = pedidos.map((p) => p.id);

  const [{ data: lojasData }, { data: itensData }] = await Promise.all([
    lojaIds.length
      ? supabase.from("lojas").select("id, nome").in("id", lojaIds)
      : Promise.resolve({ data: [] as { id: string; nome: string }[] }),
    pedidoIds.length
      ? supabase
          .from("linha_itens")
          .select("pedido_id, produto_nome, quantidade, valor, repasse_ind")
          .in("pedido_id", pedidoIds)
      : Promise.resolve({
          data: [] as {
            pedido_id: string;
            produto_nome: string | null;
            quantidade: number;
            valor: number;
            repasse_ind: number;
          }[],
        }),
  ]);

  const lojaNome = new Map((lojasData ?? []).map((l) => [l.id, l.nome]));
  const itens = itensData ?? [];

  const itensPorPedido = new Map<string, typeof itens>();
  for (const it of itens) {
    const arr = itensPorPedido.get(it.pedido_id) ?? [];
    arr.push(it);
    itensPorPedido.set(it.pedido_id, arr);
  }

  const valorMes = pedidos.reduce((s, p) => s + (p.valor_pedido ?? 0), 0);
  const produtosVendidosMes = itens.reduce((s, i) => s + (i.quantidade ?? 0), 0);

  // Top produtos por quantidade vendida no mês.
  const topMap = new Map<string, number>();
  for (const it of itens) {
    const nome = it.produto_nome ?? "—";
    topMap.set(nome, (topMap.get(nome) ?? 0) + (it.quantidade ?? 0));
  }
  const topProdutos = [...topMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Visão geral do mês corrente" />

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label="Valor do mês" value={fmtBRL(valorMes)} hint="Soma dos pedidos" />
        <KpiCard
          label="Produtos vendidos (mês)"
          value={String(produtosVendidosMes)}
          hint="Itens somados"
        />
        <KpiCard label="Pedidos no mês" value={String(pedidos.length)} />
      </div>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold text-neutral-900 dark:text-neutral-50">
          Vendas do mês
        </h2>
        {pedidos.length === 0 ? (
          <EmptyState>
            Nenhuma venda visível neste mês. Com a RLS escopada ao dono da loja,
            o admin ainda não enxerga cross-seller — a policy is_admin resolverá.
          </EmptyState>
        ) : (
          <Table
            headers={[
              "N°",
              "ID",
              "Cliente",
              "Vendedor",
              "Item",
              "Data",
              "Status",
              "Valor",
              "Repasse Ind",
            ]}
          >
            {pedidos.map((p, i) => {
              const its = itensPorPedido.get(p.id) ?? [];
              const itemLabel =
                its.length === 0
                  ? "—"
                  : its.length === 1
                    ? (its[0].produto_nome ?? "—")
                    : `${its[0].produto_nome ?? "—"} +${its.length - 1}`;
              const repasse = its.reduce((s, x) => s + (x.repasse_ind ?? 0), 0);
              return (
                <tr key={p.id} className="text-neutral-700 dark:text-neutral-200">
                  <td className="px-4 py-3 text-neutral-400">{i + 1}</td>
                  <td className="px-4 py-3 font-mono text-xs">{p.id_venda}</td>
                  <td className="px-4 py-3">{p.cliente_nome ?? "—"}</td>
                  <td className="px-4 py-3">{lojaNome.get(p.loja_id) ?? "—"}</td>
                  <td className="px-4 py-3">{itemLabel}</td>
                  <td className="px-4 py-3">{fmtDate(p.data)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={p.status_pedido} />
                  </td>
                  <td className="px-4 py-3 font-medium">{fmtBRL(p.valor_pedido)}</td>
                  <td className="px-4 py-3 text-neutral-500">{fmtBRL(repasse)}</td>
                </tr>
              );
            })}
          </Table>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-neutral-900 dark:text-neutral-50">
          Top produtos
        </h2>
        {topProdutos.length === 0 ? (
          <EmptyState>Sem itens vendidos no período.</EmptyState>
        ) : (
          <Table headers={["Produto", "Qtd. vendida"]}>
            {topProdutos.map(([nome, qtd]) => (
              <tr key={nome} className="text-neutral-700 dark:text-neutral-200">
                <td className="px-4 py-3">{nome}</td>
                <td className="px-4 py-3 font-medium">{qtd}</td>
              </tr>
            ))}
          </Table>
        )}
      </section>
    </div>
  );
}
