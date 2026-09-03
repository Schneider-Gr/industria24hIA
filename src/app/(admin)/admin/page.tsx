import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";
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
import { PeriodoTabs } from "@/components/painel/PeriodoTabs";
import { DeltaBadge } from "@/components/painel/DeltaBadge";
import { fetchAll, chunk } from "@/lib/supabase/fetch-all";
import {
  parseRange,
  resolverJanela,
  ticketMedio,
  taxaConversao,
  gmvAReceber,
  calcularDelta,
} from "@/lib/dashboard-kpis";

export const dynamic = "force-dynamic";

type PedidoJanela = {
  id: string;
  id_venda: string | null;
  cliente_nome: string | null;
  loja_id: string;
  data: string;
  status_pedido: string | null;
  valor_pedido: number | null;
};

type ItemJanela = {
  pedido_id: string;
  produto_nome: string | null;
  quantidade: number | null;
  valor: number | null;
  repasse_ind: number | null;
};

// Pedidos + itens de uma janela [desde, ate). Junção em JS (sem FK/embed do
// PostgREST). Usada para a janela atual (com detalhe) e a anterior (só somas).
async function carregarJanela(
  supabase: SupabaseClient,
  desde: string,
  ate: string,
): Promise<{ pedidos: PedidoJanela[]; itens: ItemJanela[]; erro: string | null }> {
  const { data: pedidos, error } = await fetchAll<PedidoJanela>((from, to) =>
    supabase
      .from("pedidos")
      .select(
        "id, id_venda, cliente_nome, loja_id, data, status_pedido, valor_pedido",
      )
      .gte("data", desde)
      .lt("data", ate)
      .order("data", { ascending: false })
      .range(from, to),
  );
  if (error) return { pedidos: [], itens: [], erro: error.message };

  const pedidoIds = pedidos.map((p) => p.id);
  const itensChunks = await Promise.all(
    chunk(pedidoIds).map((grupo) =>
      fetchAll<ItemJanela>((from, to) =>
        supabase
          .from("linha_itens")
          .select("pedido_id, produto_nome, quantidade, valor, repasse_ind")
          .in("pedido_id", grupo)
          .range(from, to),
      ),
    ),
  );
  return {
    pedidos,
    itens: itensChunks.flatMap((r) => r.data),
    erro: null,
  };
}

function somarGmv(pedidos: readonly PedidoJanela[]): number {
  return pedidos.reduce((s, p) => s + (p.valor_pedido ?? 0), 0);
}

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: Promise<{ p?: string; range?: string }>;
}) {
  if (!isSupabaseConfigured) {
    return (
      <ErrorState
        title="Supabase não configurado"
        detail="Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY em web/.env.local."
      />
    );
  }

  const params = await searchParams;
  const range = parseRange(params.range);
  const janela = resolverJanela(range);
  const supabase = await createClient();

  // Fila de curadoria: estado corrente absoluto, sem janela de período (uma loja
  // parada em análise há 40 dias ainda é pendência).
  const [
    { count: lojasPendentes },
    { count: produtosPendentes },
    { count: afiliacoesPendentes },
    { count: entregasEmTransito },
  ] = await Promise.all([
    supabase
      .from("lojas")
      .select("id", { count: "exact", head: true })
      .eq("situacao", "EmAnalise"),
    supabase
      .from("produtos")
      .select("id", { count: "exact", head: true })
      .eq("status_produto", "Pendente"),
    supabase
      .from("afiliacoes")
      .select("id", { count: "exact", head: true })
      .neq("status", "Aprovada"),
    supabase
      .from("entregas")
      .select("linha_item_id", { count: "exact", head: true })
      .neq("status", "Entregue"),
  ]);

  // Janela atual + (quando comparável) janela anterior de mesma duração, além de
  // devoluções (disputas com reembolso decididas no período) e novos leads.
  const [
    janelaAtual,
    janelaAnterior,
    { count: devolucoesCount, data: devolucoesData },
    { count: leadsNovos },
    { data: repassesFeitos },
    { data: repassesFeitosAnt },
  ] = await Promise.all([
    carregarJanela(supabase, janela.desde, janela.ate),
    janela.comparavel && janela.desdeAnterior && janela.ateAnterior
      ? carregarJanela(supabase, janela.desdeAnterior, janela.ateAnterior)
      : Promise.resolve({ pedidos: [], itens: [], erro: null }),
    supabase
      .from("disputas")
      .select("decisao_valor", { count: "exact" })
      .in("decisao", ["reembolso_total", "reembolso_parcial"])
      .gte("decidida_em", janela.desde)
      .lt("decidida_em", janela.ate),
    supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .gte("created_at", janela.desde)
      .lt("created_at", janela.ate),
    // Repasses realizados: valor efetivamente transferido a seller/afiliado
    // dentro da janela (data do movimento = transferido_em).
    supabase
      .from("repasses")
      .select("valor")
      .eq("status", "transferido")
      .gte("transferido_em", janela.desde)
      .lt("transferido_em", janela.ate),
    janela.comparavel && janela.desdeAnterior && janela.ateAnterior
      ? supabase
          .from("repasses")
          .select("valor")
          .eq("status", "transferido")
          .gte("transferido_em", janela.desdeAnterior)
          .lt("transferido_em", janela.ateAnterior)
      : Promise.resolve({ data: [] as { valor: number | null }[] }),
  ]);

  if (janelaAtual.erro) {
    return (
      <ErrorState title="Falha ao carregar o dashboard" detail={janelaAtual.erro} />
    );
  }

  const pedidos = janelaAtual.pedidos;
  const itens = janelaAtual.itens;

  // Nomes de loja só para a janela atual (tabela + top lojas).
  const lojaIds = [...new Set(pedidos.map((p) => p.loja_id))];
  const lojasChunks = await Promise.all(
    chunk(lojaIds).map((grupo) =>
      fetchAll<{ id: string; nome: string }>((from, to) =>
        supabase.from("lojas").select("id, nome").in("id", grupo).range(from, to),
      ),
    ),
  );
  const lojaNome = new Map(
    lojasChunks.flatMap((r) => r.data).map((l) => [l.id, l.nome]),
  );

  const itensPorPedido = new Map<string, ItemJanela[]>();
  for (const it of itens) {
    const arr = itensPorPedido.get(it.pedido_id) ?? [];
    arr.push(it);
    itensPorPedido.set(it.pedido_id, arr);
  }

  // KPIs da janela — base "todos os pedidos", independente de status (decisão
  // registrada na spec admin-dashboard-kpis-periodo).
  const valorPeriodo = somarGmv(pedidos);
  const produtosVendidos = itens.reduce((s, i) => s + (i.quantidade ?? 0), 0);
  const receitaPeriodo = itens.reduce((s, i) => s + (i.repasse_ind ?? 0), 0);
  const ticket = ticketMedio(valorPeriodo, pedidos.length);
  const conversao = taxaConversao(pedidos);
  const aReceber = gmvAReceber(pedidos);
  const devolucoesValor = (devolucoesData ?? []).reduce(
    (s, d) => s + (d.decisao_valor ?? 0),
    0,
  );
  const repassesRealizados = (repassesFeitos ?? []).reduce(
    (s, r) => s + (r.valor ?? 0),
    0,
  );

  // Deltas vs. período anterior.
  const antPedidos = janelaAnterior.pedidos;
  const antItens = janelaAnterior.itens;
  const dValor = janela.comparavel
    ? calcularDelta(valorPeriodo, somarGmv(antPedidos))
    : null;
  const dReceita = janela.comparavel
    ? calcularDelta(
        receitaPeriodo,
        antItens.reduce((s, i) => s + (i.repasse_ind ?? 0), 0),
      )
    : null;
  const dPedidos = janela.comparavel
    ? calcularDelta(pedidos.length, antPedidos.length)
    : null;
  const dProdutos = janela.comparavel
    ? calcularDelta(
        produtosVendidos,
        antItens.reduce((s, i) => s + (i.quantidade ?? 0), 0),
      )
    : null;
  const dTicket = janela.comparavel
    ? calcularDelta(
        ticket,
        ticketMedio(somarGmv(antPedidos), antPedidos.length),
      )
    : null;
  const dRepasses = janela.comparavel
    ? calcularDelta(
        repassesRealizados,
        (repassesFeitosAnt ?? []).reduce((s, r) => s + (r.valor ?? 0), 0),
      )
    : null;

  // Top lojas da janela: GMV e receita por loja.
  const porLoja = new Map<
    string,
    { pedidos: number; gmv: number; receita: number }
  >();
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
  const topLojas = [...porLoja.entries()]
    .sort((a, b) => b[1].gmv - a[1].gmv)
    .slice(0, 5);

  const POR_PAGINA = 25;
  const totalPaginas = Math.max(1, Math.ceil(pedidos.length / POR_PAGINA));
  const pagina = Math.min(
    Math.max(1, Number(params.p ?? 1) || 1),
    totalPaginas,
  );
  const pedidosPagina = pedidos.slice(
    (pagina - 1) * POR_PAGINA,
    pagina * POR_PAGINA,
  );
  const hrefPagina = (p: number) =>
    range === "30d" ? `/admin?p=${p}` : `/admin?range=${range}&p=${p}`;

  // Drill-down: cada KPI financeiro abre /admin/pedidos já filtrado pela mesma
  // janela (e status, quando o KPI é sobre um recorte de pagamento).
  const linkPedidos = (status?: string) => {
    const q = new URLSearchParams({ range });
    if (status) q.set("status", status);
    return `/admin/pedidos?${q.toString()}`;
  };
  const linkRepasses = `/admin/repasses?range=${range}&status=transferido`;

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Visão gerencial do marketplace" />

      <PeriodoTabs atual={range} />

      <p className="mb-2 text-xs font-medium uppercase tracking-[0.08em] text-ink">
        Fila de curadoria
      </p>
      <div className="mb-6 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <CardFila
          cor="border-l-sinal"
          texto="text-sinal-escuro"
          valor={lojasPendentes ?? 0}
          rotulo="lojas em análise"
          href="/admin/lojas"
        />
        <CardFila
          cor="border-l-erro"
          texto="text-erro"
          valor={produtosPendentes ?? 0}
          rotulo="produtos a aprovar"
          href="/admin/produtos?status=Pendente"
        />
        <CardFila
          cor="border-l-warn"
          texto="text-warn"
          valor={afiliacoesPendentes ?? 0}
          rotulo="afiliações pendentes"
          href="/admin/afiliados"
        />
        <CardFila
          cor="border-l-aco-600"
          texto="text-aco-600"
          valor={entregasEmTransito ?? 0}
          rotulo="entregas em trânsito"
          href="/admin/entregas"
        />
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link href={linkPedidos()} className="block">
          <KpiCard
            label="Valor do período"
            value={fmtBRL(valorPeriodo)}
            hint="Soma dos pedidos · ver lista"
            delta={<DeltaBadge delta={dValor} />}
          />
        </Link>
        <Link href={linkPedidos("Aguardando Pagamento")} className="block">
          <KpiCard
            label="GMV a receber"
            value={fmtBRL(aReceber)}
            hint="Pedidos aguardando pagamento"
            accent="warning"
          />
        </Link>
        <Link href={linkPedidos()} className="block">
          <KpiCard
            label="Receita da plataforma"
            value={fmtBRL(receitaPeriodo)}
            hint="Repasse Indústria 24h (5% por item)"
            delta={<DeltaBadge delta={dReceita} />}
          />
        </Link>
        <Link href={linkRepasses} className="block">
          <KpiCard
            label="Repasses realizados"
            value={fmtBRL(repassesRealizados)}
            hint="Transferido a seller/afiliado no período"
            delta={<DeltaBadge delta={dRepasses} />}
          />
        </Link>
        <Link href={linkPedidos()} className="block">
          <KpiCard
            label="Ticket médio"
            value={fmtBRL(ticket)}
            hint="Valor ÷ pedidos do período"
            delta={<DeltaBadge delta={dTicket} />}
          />
        </Link>
        <Link href={linkPedidos()} className="block">
          <KpiCard
            label="Pedidos no período"
            value={String(pedidos.length)}
            delta={<DeltaBadge delta={dPedidos} />}
          />
        </Link>
        <Link href={linkPedidos("Pagamento Realizado")} className="block">
          <KpiCard
            label="Conversão de pagamento"
            value={`${conversao.toFixed(conversao < 10 ? 1 : 0)}%`}
            hint="Pedidos que chegaram a pagamento realizado"
          />
        </Link>
        <Link href={linkPedidos()} className="block">
          <KpiCard
            label="Produtos vendidos"
            value={String(produtosVendidos)}
            hint="Itens somados"
            delta={<DeltaBadge delta={dProdutos} />}
          />
        </Link>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/admin/disputas" className="block">
          <KpiCard
            label="Devoluções"
            value={String(devolucoesCount ?? 0)}
            hint={`${fmtBRL(devolucoesValor)} em reembolsos`}
          />
        </Link>
        <Link href="/admin/produtos?status=Pendente" className="block">
          <KpiCard
            label="Pendências de curadoria"
            value={String((lojasPendentes ?? 0) + (produtosPendentes ?? 0))}
            hint={`${produtosPendentes ?? 0} produto(s), ${lojasPendentes ?? 0} loja(s) em análise`}
          />
        </Link>
        <Link href="/admin/leads" className="block">
          <KpiCard
            label="Novos leads (CRM)"
            value={String(leadsNovos ?? 0)}
            hint="Leads criados no período"
          />
        </Link>
      </div>

      <section className="mb-8">
        <h2 className="mb-3 font-display text-[13px] font-medium uppercase tracking-[0.08em] text-ink">
          Vendas do período
        </h2>
        {pedidos.length === 0 ? (
          <EmptyState>Nenhuma venda no período selecionado.</EmptyState>
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
                  <td className="px-4 py-3 text-muted">
                    {(pagina - 1) * POR_PAGINA + i + 1}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{p.id_venda}</td>
                  <td className="px-4 py-3">{p.cliente_nome ?? "—"}</td>
                  <td className="px-4 py-3">{lojaNome.get(p.loja_id) ?? "—"}</td>
                  <td className="px-4 py-3">{itemLabel}</td>
                  <td className="px-4 py-3">{fmtDate(p.data)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={p.status_pedido} />
                  </td>
                  <td className="px-4 py-3 num font-semibold">
                    {fmtBRL(p.valor_pedido)}
                  </td>
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
              <span className="num">{pedidos.length}</span> pedidos no período
            </span>
            <span className="flex gap-2">
              {pagina > 1 && (
                <Link
                  href={hrefPagina(pagina - 1)}
                  className="rounded-sm border border-line px-3 py-1.5 text-aco-600 hover:border-aco-600"
                >
                  Anterior
                </Link>
              )}
              {pagina < totalPaginas && (
                <Link
                  href={hrefPagina(pagina + 1)}
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
          Top lojas do período
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

// Cartão da fila de curadoria: barra colorida à esquerda, número tabular.
function CardFila({
  cor,
  texto,
  valor,
  rotulo,
  href,
}: {
  cor: string;
  texto: string;
  valor: number;
  rotulo: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className={`rounded-r-md border border-l-[3px] border-line bg-surface px-3 py-2.5 transition-colors hover:border-aco-600 ${cor}`}
    >
      <span className={`num block text-[19px] font-medium ${texto}`}>{valor}</span>
      <span className="mt-0.5 block text-[11px] text-ink-2">{rotulo}</span>
    </Link>
  );
}
