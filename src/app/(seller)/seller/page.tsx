import Link from "next/link";
import { getUser, getMinhaLoja } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ErrorState } from "@/components/ErrorState";
import { KpiCard } from "@/components/seller/KpiCard";
import { PageTitle, PrecisaLogin, SemLoja, VazioBox } from "@/components/seller/states";
import { formatBRL } from "@/components/seller/format";
import { PeriodoTabs } from "@/components/painel/PeriodoTabs";
import { DeltaBadge } from "@/components/painel/DeltaBadge";
import {
  parseRange,
  resolverJanela,
  RANGE_LABEL,
  ticketMedio,
  taxaConversao,
  gmvAReceber,
  calcularDelta,
} from "@/lib/dashboard-kpis";
import { fetchAll, chunk } from "@/lib/supabase/fetch-all";

export const dynamic = "force-dynamic";

// Loja de Manaus: o recorte "mês atual" segue o fuso local dela (Vercel = UTC;
// venda às 22h de Manaus cairia no dia/mês seguinte). Os recortes rolantes
// (30/90 dias, tudo) usam a janela padrão em UTC — a imprecisão de fuso num
// intervalo de semanas é irrelevante.
const TZ = "America/Manaus";
const diaManaus = new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, day: "numeric" });
const mesManaus = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit" });

type PedidoLoja = {
  id: string;
  data: string;
  status_pedido: string | null;
  valor_pedido: number | null;
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const user = await getUser();
  if (!user) return <PrecisaLogin />;

  const loja = await getMinhaLoja();
  if (!loja) return <SemLoja />;

  const supabase = await createClient();
  const agora = new Date();
  const range = parseRange((await searchParams).range);
  const janela = resolverJanela(range, agora);

  // Busca com margem: cobre a janela atual + a anterior (para os comparativos)
  // e a folga de fuso do recorte mensal.
  const corte =
    range === "mes"
      ? new Date(agora.getFullYear(), agora.getMonth() - 1, -1).toISOString()
      : (janela.desdeAnterior ?? janela.desde);

  const { data: pedidosRaw, error } = await fetchAll<PedidoLoja>((from, to) =>
    supabase
      .from("pedidos")
      .select("id, data, status_pedido, valor_pedido")
      .eq("loja_id", loja.id)
      .gte("data", corte)
      .order("data")
      .range(from, to),
  );
  if (error) {
    return <ErrorState title="Falha ao carregar pedidos" detail={error.message} />;
  }
  const todos = pedidosRaw ?? [];

  // Classificação em janela atual / anterior.
  let doPeriodo: PedidoLoja[];
  let anterior: PedidoLoja[];
  let rotuloPeriodo: string;
  if (range === "mes") {
    const mesAtual = mesManaus.format(agora);
    const mesAnt = mesManaus.format(new Date(agora.getFullYear(), agora.getMonth() - 1, 15));
    doPeriodo = todos.filter((p) => mesManaus.format(new Date(p.data)) === mesAtual);
    anterior = todos.filter((p) => mesManaus.format(new Date(p.data)) === mesAnt);
    rotuloPeriodo = "mês atual";
  } else {
    const dentro = (p: PedidoLoja, a: string, b: string) => p.data >= a && p.data < b;
    doPeriodo = todos.filter((p) => dentro(p, janela.desde, janela.ate));
    anterior = janela.comparavel
      ? todos.filter((p) => dentro(p, janela.desdeAnterior!, janela.ateAnterior!))
      : [];
    rotuloPeriodo = RANGE_LABEL[range].toLowerCase();
  }
  const comparavel = range === "mes" || janela.comparavel;

  // "Precisa de você": estado corrente da loja, sem janela.
  const [{ count: semEstoque }, { count: afiliacoesPendentes }, { count: disputasAguardando }] =
    await Promise.all([
      supabase
        .from("produtos")
        .select("id", { count: "exact", head: true })
        .eq("loja_id", loja.id)
        .lte("estoque_atual", 0),
      supabase
        .from("afiliacoes")
        .select("id", { count: "exact", head: true })
        .eq("loja_id", loja.id)
        .neq("status", "Aprovada"),
      supabase
        .from("disputas")
        .select("id", { count: "exact", head: true })
        .eq("loja_id", loja.id)
        .in("status", ["aberta", "em_atendimento_loja", "em_mediacao_admin"]),
    ]);

  // Itens da janela (categoria, top produtos, unidades vendidas, repasse).
  const idsPeriodo = doPeriodo.map((p) => p.id);
  const idsAnterior = anterior.map((p) => p.id);
  const statusPorPedido = new Map(todos.map((p) => [p.id, p.status_pedido]));
  const linhas: {
    pedido_id: string;
    produto_id: string | null;
    produto_nome: string | null;
    quantidade: number | null;
    valor: number | null;
    repasse_vendedor: number | null;
  }[] = [];
  const linhasAnt: { pedido_id: string; repasse_vendedor: number | null }[] = [];
  for (const grupo of chunk(idsPeriodo)) {
    const { data, error: errItens } = await fetchAll((from, to) =>
      supabase
        .from("linha_itens")
        .select("pedido_id, produto_id, produto_nome, quantidade, valor, repasse_vendedor")
        .in("pedido_id", grupo)
        .range(from, to),
    );
    if (errItens) {
      return <ErrorState title="Falha ao carregar itens" detail={errItens.message} />;
    }
    linhas.push(...data);
  }
  for (const grupo of chunk(idsAnterior)) {
    const { data } = await fetchAll((from, to) =>
      supabase
        .from("linha_itens")
        .select("pedido_id, repasse_vendedor")
        .in("pedido_id", grupo)
        .range(from, to),
    );
    linhasAnt.push(...data);
  }

  // Repasse sobre vendas pagas: Σ repasse_vendedor (líquido ao seller) dos
  // itens cujo pedido chegou a "Pagamento Realizado" na janela. Vem de
  // linha_itens (RLS de dono da loja já cobre) — o ledger `repasses` só é
  // legível pelo admin hoje.
  const pago = (pid: string) => statusPorPedido.get(pid) === "Pagamento Realizado";
  const repasseVendasPagas = linhas
    .filter((l) => pago(l.pedido_id))
    .reduce((s, l) => s + (l.repasse_vendedor ?? 0), 0);
  const repasseVendasPagasAnt = linhasAnt
    .filter((l) => pago(l.pedido_id))
    .reduce((s, l) => s + (l.repasse_vendedor ?? 0), 0);

  // produto -> categoria
  const produtoIds = [...new Set(linhas.map((l) => l.produto_id).filter(Boolean))] as string[];
  const { data: prods } = produtoIds.length
    ? await supabase.from("produtos").select("id, categorias(nome)").in("id", produtoIds)
    : { data: [] };
  const categoriaPorProduto = new Map<string, string>();
  for (const p of prods ?? []) {
    const nome = (p.categorias as unknown as { nome: string } | null)?.nome ?? "Sem categoria";
    categoriaPorProduto.set(p.id, nome);
  }

  const porCategoria = new Map<string, number>();
  const porProduto = new Map<string, { qtd: number; valor: number }>();
  for (const l of linhas) {
    const cat = (l.produto_id && categoriaPorProduto.get(l.produto_id)) || "Sem categoria";
    porCategoria.set(cat, (porCategoria.get(cat) ?? 0) + (l.valor ?? 0));
    const nome = l.produto_nome ?? "—";
    const agg = porProduto.get(nome) ?? { qtd: 0, valor: 0 };
    agg.qtd += l.quantidade ?? 0;
    agg.valor += l.valor ?? 0;
    porProduto.set(nome, agg);
  }
  const categorias = [...porCategoria.entries()].sort((a, b) => b[1] - a[1]);
  const topProdutos = [...porProduto.entries()].sort((a, b) => b[1].valor - a[1].valor).slice(0, 5);

  const porDia = new Map<number, number>();
  for (const p of doPeriodo) {
    const dia = Number(diaManaus.format(new Date(p.data)));
    porDia.set(dia, (porDia.get(dia) ?? 0) + (p.valor_pedido ?? 0));
  }

  // KPIs.
  const faturamento = doPeriodo.reduce((s, p) => s + (p.valor_pedido ?? 0), 0);
  const faturamentoAnt = anterior.reduce((s, p) => s + (p.valor_pedido ?? 0), 0);
  const ticket = ticketMedio(faturamento, doPeriodo.length);
  const ticketAnt = ticketMedio(faturamentoAnt, anterior.length);
  const unidades = linhas.reduce((s, l) => s + (l.quantidade ?? 0), 0);
  const conversao = taxaConversao(doPeriodo);
  const aReceber = gmvAReceber(doPeriodo);
  const d = (a: number, b: number) => (comparavel ? calcularDelta(a, b) : null);
  const aguardandoPagamento = doPeriodo.filter((p) =>
    (p.status_pedido ?? "").toLowerCase().includes("aguardando"),
  ).length;

  const dias = [...porDia.entries()].sort((a, b) => a[0] - b[0]);
  const maxDia = Math.max(1, ...dias.map(([, v]) => v));
  const maxCat = Math.max(1, ...categorias.map(([, v]) => v));

  return (
    <div>
      <PageTitle title="Análises de desempenho / vendas" subtitle={`Loja ${loja.nome}`} />

      <PeriodoTabs atual={range} basePath="/seller" />

      {(aguardandoPagamento > 0 ||
        (semEstoque ?? 0) > 0 ||
        (afiliacoesPendentes ?? 0) > 0 ||
        (disputasAguardando ?? 0) > 0) && (
        <>
          <p className="mb-2 text-xs font-medium uppercase tracking-[0.08em] text-ink">
            Precisa de você
          </p>
          <div className="mb-6 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
            <CardPendencia
              cor="border-l-sinal"
              texto="text-sinal-escuro"
              valor={aguardandoPagamento}
              rotulo="pedidos aguardando pagamento"
              href="/seller/pedidos?filtro=aguardando"
            />
            <CardPendencia
              cor="border-l-erro"
              texto="text-erro"
              valor={semEstoque ?? 0}
              rotulo="produtos sem estoque"
              href="/seller/produtos"
            />
            <CardPendencia
              cor="border-l-warn"
              texto="text-warn"
              valor={afiliacoesPendentes ?? 0}
              rotulo="afiliações a aprovar"
              href="/seller/afiliados"
            />
            <CardPendencia
              cor="border-l-erro"
              texto="text-erro"
              valor={disputasAguardando ?? 0}
              rotulo="disputas aguardando você"
              href="/seller/disputas"
            />
          </div>
        </>
      )}

      <p className="mb-2 text-xs font-medium uppercase tracking-[0.08em] text-ink">
        Resultado · {rotuloPeriodo}
      </p>
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/seller/pedidos" className="block">
          <KpiCard
            label="Faturamento"
            value={formatBRL(faturamento)}
            hint="Soma dos pedidos · ver lista"
            delta={<DeltaBadge delta={d(faturamento, faturamentoAnt)} />}
          />
        </Link>
        <Link href="/seller/pedidos" className="block">
          <KpiCard
            label="Pedidos"
            value={String(doPeriodo.length)}
            delta={<DeltaBadge delta={d(doPeriodo.length, anterior.length)} />}
          />
        </Link>
        <KpiCard
          label="Ticket médio"
          value={formatBRL(ticket)}
          hint="Faturamento ÷ pedidos"
          delta={<DeltaBadge delta={d(ticket, ticketAnt)} />}
        />
        <KpiCard
          label="Produtos vendidos"
          value={String(unidades)}
          hint="Unidades somadas"
        />
        <KpiCard
          label="Conversão de pagamento"
          value={`${conversao.toFixed(conversao < 10 ? 1 : 0)}%`}
          hint="Pedidos que foram pagos"
        />
        <Link href="/seller/pedidos" className="block">
          <KpiCard
            label="A receber"
            value={formatBRL(aReceber)}
            hint="Pedidos aguardando pagamento"
            accent="warning"
          />
        </Link>
        <Link href="/seller/pedidos" className="block">
          <KpiCard
            label="Repasse sobre vendas pagas"
            value={formatBRL(repasseVendasPagas)}
            hint="Líquido da loja sobre pedidos já pagos"
            delta={<DeltaBadge delta={d(repasseVendasPagas, repasseVendasPagasAnt)} />}
          />
        </Link>
      </div>

      {dias.length > 0 && (
        <div className="mb-6 rounded-md border border-line bg-surface px-3.5 py-3">
          <p className="mb-2 text-[10px] uppercase tracking-[0.08em] text-muted">Vendas por dia</p>
          <div className="flex h-[52px] items-end gap-[3px]">
            {dias.map(([dia, valor], i) => (
              <div
                key={dia}
                title={`Dia ${dia}: ${formatBRL(valor)}`}
                style={{ height: `${Math.max(6, (valor / maxDia) * 100)}%` }}
                className={`flex-1 rounded-t-sm ${
                  i === dias.length - 1 ? "bg-sinal" : "bg-aco-100"
                }`}
              />
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded border border-line bg-surface p-4">
          <h2 className="mb-3 font-display text-[13px] font-medium uppercase tracking-[0.08em]">
            Vendas por dia
          </h2>
          {dias.length === 0 ? (
            <VazioBox>Nenhuma venda no período.</VazioBox>
          ) : (
            <ul className="space-y-1">
              {dias.map(([dia, valor]) => (
                <li key={dia} className="flex items-center gap-2 text-sm">
                  <span className="num w-8 text-right text-muted">{dia}</span>
                  <div className="h-4 flex-1 rounded bg-aco-900/10">
                    <div
                      className="h-4 rounded bg-aco-600"
                      style={{ width: `${(valor / maxDia) * 100}%` }}
                    />
                  </div>
                  <span className="num w-24 text-right">{formatBRL(valor)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded border border-line bg-surface p-4">
          <h2 className="mb-3 font-display text-[13px] font-medium uppercase tracking-[0.08em]">
            Vendas por categoria
          </h2>
          {categorias.length === 0 ? (
            <VazioBox>Nenhuma venda no período.</VazioBox>
          ) : (
            <ul className="space-y-1">
              {categorias.map(([cat, valor]) => (
                <li key={cat} className="flex items-center gap-2 text-sm">
                  <span className="w-32 truncate text-muted">{cat}</span>
                  <div className="h-4 flex-1 rounded bg-aco-900/10">
                    <div
                      className="h-4 rounded bg-aco-600"
                      style={{ width: `${(valor / maxCat) * 100}%` }}
                    />
                  </div>
                  <span className="num w-24 text-right">{formatBRL(valor)}</span>
                </li>
              ))}
            </ul>
          )}

          <h2 className="mb-3 mt-6 font-display text-[13px] font-medium uppercase tracking-[0.08em]">
            Top Produtos
          </h2>
          {topProdutos.length === 0 ? (
            <VazioBox>Nenhuma venda no período.</VazioBox>
          ) : (
            <ol className="space-y-2">
              {topProdutos.map(([nome, agg]) => (
                <li key={nome} className="flex items-center justify-between text-sm">
                  <span className="text-ink">{nome}</span>
                  <span className="num text-muted">
                    {agg.qtd} un · {formatBRL(agg.valor)}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}

// Cartão de pendência: barra colorida à esquerda, número tabular e rótulo.
function CardPendencia({
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
