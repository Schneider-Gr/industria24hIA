import Link from "next/link";
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
import { fetchAll, chunk } from "@/lib/supabase/fetch-all";

export const dynamic = "force-dynamic";

function monthStartISO(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
}

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: Promise<{ p?: string }>;
}) {
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

  const [{ count: lojasPendentes }, { count: produtosPendentes }] = await Promise.all([
    supabase
      .from("lojas")
      .select("id", { count: "exact", head: true })
      .eq("situacao", "EmAnalise"),
    supabase
      .from("produtos")
      .select("id", { count: "exact", head: true })
      .eq("status_produto", "Pendente"),
  ]);

  // Pedidos do mês. Leitura cross-seller garantida pela policy is_admin
  // (migration 0004). Vazio = ausência de pedidos no período.
  const { data: pedidosData, error } = await fetchAll((from, to) =>
    supabase
      .from("pedidos")
      .select("id, id_venda, cliente_nome, loja_id, data, status_pedido, valor_pedido")
      .gte("data", desde)
      .order("data", { ascending: false })
      .range(from, to),
  );

  if (error) {
    return <ErrorState title="Falha ao carregar o dashboard" detail={error.message} />;
  }

  const pedidos = pedidosData ?? [];

  // Junção em JS (sem FK/embed do PostgREST): lojas e itens por id.
  const lojaIds = [...new Set(pedidos.map((p) => p.loja_id))];
  const pedidoIds = pedidos.map((p) => p.id);

  const [lojasChunks, itensChunks] = await Promise.all([
    Promise.all(
      chunk(lojaIds).map((grupo) =>
        fetchAll((from, to) =>
          supabase.from("lojas").select("id, nome").in("id", grupo).range(from, to),
        ),
      ),
    ),
    Promise.all(
      chunk(pedidoIds).map((grupo) =>
        fetchAll((from, to) =>
          supabase
            .from("linha_itens")
            .select("pedido_id, produto_nome, quantidade, valor, repasse_ind")
            .in("pedido_id", grupo)
            .range(from, to),
        ),
      ),
    ),
  ]);

  const lojaNome = new Map(lojasChunks.flatMap((r) => r.data).map((l) => [l.id, l.nome]));
  const itens = itensChunks.flatMap((r) => r.data);

  const itensPorPedido = new Map<string, typeof itens>();
  for (const it of itens) {
    const arr = itensPorPedido.get(it.pedido_id) ?? [];
    arr.push(it);
    itensPorPedido.set(it.pedido_id, arr);
  }

  const valorMes = pedidos.reduce((s, p) => s + (p.valor_pedido ?? 0), 0);
  const produtosVendidosMes = itens.reduce((s, i) => s + (i.quantidade ?? 0), 0);
  // Receita da plataforma: os 5% por item (repasse_ind), não o GMV.
  const receitaMes = itens.reduce((s, i) => s + (i.repasse_ind ?? 0), 0);

  // Top lojas do mês: GMV e receita por loja (o admin precisa saber de quem
  // vem o faturamento, não qual SKU saiu mais).
  const porLoja = new Map<string, { pedidos: number; gmv: number; receita: number }>();
  for (const p of pedidos) {
    const agg = porLoja.get(p.loja_id) ?? { pedidos: 0, gmv: 0, receita: 0 };
    agg.pedidos += 1;
    agg.gmv += p.valor_pedido ?? 0;
    agg.receita += (itensPorPedido.get(p.id) ?? []).reduce(
      (t, x) => t + (x.repasse_ind ?? 0),
      0,
    );
    porLoja.set(p.loja_id, agg);
  }
  const topLojas = [...porLoja.entries()].sort((a, b) => b[1].gmv - a[1].gmv).slice(0, 5);

  // Paginação da tabela: o mês inteiro fica em memória para os KPIs, mas a
  // lista renderiza em páginas de 25.
  const POR_PAGINA = 25;
  const totalPaginas = Math.max(1, Math.ceil(pedidos.length / POR_PAGINA));
  const pagina = Math.min(Math.max(1, Number((await searchParams).p ?? 1) || 1), totalPaginas);
  const pedidosPagina = pedidos.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Visão geral do mês corrente" />

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-4">
        <KpiCard label="Valor do mês" value={fmtBRL(valorMes)} hint="Soma dos pedidos" />
        <KpiCard
          label="Produtos vendidos (mês)"
          value={String(produtosVendidosMes)}
          hint="Itens somados"
        />
        <KpiCard
          label="Receita da plataforma"
          value={fmtBRL(receitaMes)}
          hint="Repasse Indústria 24h (5% por item)"
        />
        <KpiCard label="Pedidos no mês" value={String(pedidos.length)} />
        <Link href="/admin/produtos?status=Pendente" className="block">
          <KpiCard
            label="Pendências"
            value={String((lojasPendentes ?? 0) + (produtosPendentes ?? 0))}
            hint={`${produtosPendentes ?? 0} produto(s), ${lojasPendentes ?? 0} loja(s) em análise`}
          />
        </Link>
      </div>

      <section className="mb-8">
        <h2 className="mb-3 font-display text-[13px] font-medium uppercase tracking-[0.08em] text-ink">
          Vendas do mês
        </h2>
        {pedidos.length === 0 ? (
          <EmptyState>
            Nenhuma venda registrada neste mês.
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
            {pedidosPagina.map((p, i) => {
              const its = itensPorPedido.get(p.id) ?? [];
              const itemLabel =
                its.length === 0
                  ? "—"
                  : its.length === 1
                    ? (its[0].produto_nome ?? "—")
                    : `${its[0].produto_nome ?? "—"} +${its.length - 1}`;
              const repasse = its.reduce((s, x) => s + (x.repasse_ind ?? 0), 0);
              return (
                <tr key={p.id} className="text-ink">
                  <td className="px-4 py-3 text-muted">{(pagina - 1) * POR_PAGINA + i + 1}</td>
                  <td className="px-4 py-3 font-mono text-xs">{p.id_venda}</td>
                  <td className="px-4 py-3">{p.cliente_nome ?? "—"}</td>
                  <td className="px-4 py-3">{lojaNome.get(p.loja_id) ?? "—"}</td>
                  <td className="px-4 py-3">{itemLabel}</td>
                  <td className="px-4 py-3">{fmtDate(p.data)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={p.status_pedido} />
                  </td>
                  <td className="px-4 py-3 num font-semibold">{fmtBRL(p.valor_pedido)}</td>
                  <td className="px-4 py-3 num text-ink-2">{fmtBRL(repasse)}</td>
                </tr>
              );
            })}
          </Table>
        )}
        {totalPaginas > 1 && (
          <div className="mt-3 flex items-center justify-between text-[13px]">
            <span className="text-muted">
              Página <span className="num">{pagina}</span> de{" "}
              <span className="num">{totalPaginas}</span> ·{" "}
              <span className="num">{pedidos.length}</span> pedidos no mês
            </span>
            <span className="flex gap-2">
              {pagina > 1 && (
                <Link
                  href={`/admin?p=${pagina - 1}`}
                  className="rounded-sm border border-line px-3 py-1.5 text-aco-600 hover:border-aco-600"
                >
                  Anterior
                </Link>
              )}
              {pagina < totalPaginas && (
                <Link
                  href={`/admin?p=${pagina + 1}`}
                  className="rounded-sm border border-line px-3 py-1.5 text-aco-600 hover:border-aco-600"
                >
                  Próxima
                </Link>
              )}
            </span>
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-display text-[13px] font-medium uppercase tracking-[0.08em] text-ink">
          Top lojas do mês
        </h2>
        {topLojas.length === 0 ? (
          <EmptyState>Sem vendas no período.</EmptyState>
        ) : (
          <Table headers={["Loja", "Pedidos", "GMV", "Receita da plataforma"]}>
            {topLojas.map(([lojaId, agg]) => (
              <tr key={lojaId} className="text-ink">
                <td className="px-4 py-3">{lojaNome.get(lojaId) ?? "—"}</td>
                <td className="px-4 py-3 num">{agg.pedidos}</td>
                <td className="px-4 py-3 num font-semibold">{fmtBRL(agg.gmv)}</td>
                <td className="px-4 py-3 num text-ink-2">{fmtBRL(agg.receita)}</td>
              </tr>
            ))}
          </Table>
        )}
      </section>
    </div>
  );
}
