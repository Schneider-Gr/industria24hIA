import Link from "next/link";
import { getUser, getMinhaLoja } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ErrorState } from "@/components/ErrorState";
import { KpiCard } from "@/components/seller/KpiCard";
import { PageTitle, PrecisaLogin, SemLoja, VazioBox } from "@/components/seller/states";
import { formatBRL } from "@/components/seller/format";
import { fetchAll, chunk } from "@/lib/supabase/fetch-all";

export const dynamic = "force-dynamic";

// Loja de Manaus: mês/dia dos KPIs seguem o fuso local dela, não o do servidor
// (Vercel = UTC; venda às 21h de Manaus cairia no dia seguinte).
const TZ = "America/Manaus";
const diaManaus = new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, day: "numeric" });
const mesManaus = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit" });

// Dashboard mensal — espelha o painel Bubble: Valor mês, Vendas mês (vs mês
// passado), Análise do mês (por dia), Vendas por categoria e Top Produtos.
export default async function DashboardPage() {
  const user = await getUser();
  if (!user) return <PrecisaLogin />;

  const loja = await getMinhaLoja();
  if (!loja) return <SemLoja />;

  const supabase = await createClient();

  const agora = new Date();
  // Margem de 1 dia além de "2 meses atrás" cobre a diferença UTC x Manaus;
  // a classificação exata por mês é feita abaixo com mesManaus.
  const corte = new Date(agora.getFullYear(), agora.getMonth() - 1, -1);

  const { data: pedidos, error } = await fetchAll((from, to) =>
    supabase
      .from("pedidos")
      .select("id, data, status_pedido, valor_pedido")
      .eq("loja_id", loja.id)
      .gte("data", corte.toISOString())
      .order("data")
      .range(from, to),
  );

  if (error) {
    return <ErrorState title="Falha ao carregar pedidos" detail={error.message} />;
  }

  // "Precisa de você": só o que existe no schema. Não há status de despacho em
  // `pedidos` (o despacho vive no fluxo de corridas), então o card de pedidos
  // usa pagamento pendente, que é verificável.
  const [{ count: semEstoque }, { count: afiliacoesPendentes }] = await Promise.all([
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
  ]);

  const mesAtual = mesManaus.format(agora);
  const mesAnterior = mesManaus.format(new Date(agora.getFullYear(), agora.getMonth() - 1, 15));
  const todos = pedidos ?? [];
  const doMes = todos.filter((p) => mesManaus.format(new Date(p.data)) === mesAtual);
  const mesPassado = todos.filter((p) => mesManaus.format(new Date(p.data)) === mesAnterior);

  const valorMes = doMes.reduce((s, p) => s + (p.valor_pedido ?? 0), 0);
  const valorMesPassado = mesPassado.reduce((s, p) => s + (p.valor_pedido ?? 0), 0);

  // Itens do mês para categoria e top produtos.
  const idsMes = doMes.map((p) => p.id);
  const linhas: {
    pedido_id: string;
    produto_id: string | null;
    produto_nome: string | null;
    quantidade: number | null;
    valor: number | null;
  }[] = [];
  for (const grupo of chunk(idsMes)) {
    const { data, error: errItens } = await fetchAll((from, to) =>
      supabase
        .from("linha_itens")
        .select("pedido_id, produto_id, produto_nome, quantidade, valor")
        .in("pedido_id", grupo)
        .range(from, to),
    );
    if (errItens) {
      return <ErrorState title="Falha ao carregar itens" detail={errItens.message} />;
    }
    linhas.push(...data);
  }

  // produto -> categoria (uma query só nos produtos envolvidos)
  const produtoIds = [...new Set(linhas.map((l) => l.produto_id).filter(Boolean))] as string[];
  const { data: prods } = produtoIds.length
    ? await supabase
        .from("produtos")
        .select("id, categorias(nome)")
        .in("id", produtoIds)
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
  const topProdutos = [...porProduto.entries()]
    .sort((a, b) => b[1].valor - a[1].valor)
    .slice(0, 5);

  // Análise do mês: valor vendido por dia (dia no fuso de Manaus).
  const porDia = new Map<number, number>();
  for (const p of doMes) {
    const dia = Number(diaManaus.format(new Date(p.data)));
    porDia.set(dia, (porDia.get(dia) ?? 0) + (p.valor_pedido ?? 0));
  }
  const aguardandoPagamento = doMes.filter((p) =>
    (p.status_pedido ?? "").toLowerCase().includes("aguardando"),
  ).length;

  const ticket = doMes.length ? valorMes / doMes.length : 0;
  const ticketAnterior = mesPassado.length ? valorMesPassado / mesPassado.length : 0;
  const variacao = (atual: number, anterior: number) =>
    anterior > 0 ? Math.round(((atual - anterior) / anterior) * 100) : null;

  const dias = [...porDia.entries()].sort((a, b) => a[0] - b[0]);
  const maxDia = Math.max(1, ...dias.map(([, v]) => v));
  const maxCat = Math.max(1, ...categorias.map(([, v]) => v));

  return (
    <div>
      <PageTitle title="Analises de desempenho / vendas" subtitle={`Loja ${loja.nome}`} />

      {(aguardandoPagamento > 0 || (semEstoque ?? 0) > 0 || (afiliacoesPendentes ?? 0) > 0) && (
        <>
          <p className="mb-2 text-xs font-medium uppercase tracking-[0.08em] text-ink">
            Precisa de você
          </p>
          <div className="mb-6 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            <CardPendencia
              cor="border-l-sinal"
              texto="text-sinal-escuro"
              valor={aguardandoPagamento}
              rotulo="pedidos aguardando pagamento"
              href="/seller/pedidos?filtro=aguardando"
            />
            <CardPendencia
              cor="border-l-red-700"
              texto="text-red-700"
              valor={semEstoque ?? 0}
              rotulo="produtos sem estoque"
              href="/seller/produtos"
            />
            <CardPendencia
              cor="border-l-yellow-800"
              texto="text-yellow-800"
              valor={afiliacoesPendentes ?? 0}
              rotulo="afiliações a aprovar"
              href="/seller/afiliados"
            />
          </div>
        </>
      )}

      <div className="mb-2 flex items-baseline justify-between">
        <p className="text-xs font-medium uppercase tracking-[0.08em] text-ink">Resultado</p>
        <span className="text-[11px] tracking-[0.04em] text-muted">Mês atual</span>
      </div>
      <div className="mb-6 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        <CardResultado
          rotulo="Faturamento"
          valor={formatBRL(valorMes)}
          variacao={variacao(valorMes, valorMesPassado)}
        />
        <CardResultado
          rotulo="Pedidos"
          valor={String(doMes.length)}
          variacao={variacao(doMes.length, mesPassado.length)}
        />
        <CardResultado
          rotulo="Ticket médio"
          valor={formatBRL(ticket)}
          variacao={variacao(ticket, ticketAnterior)}
        />
      </div>

      {dias.length > 0 && (
        <div className="mb-6 rounded-md border border-line bg-surface px-3.5 py-3">
          <p className="mb-2 text-[10px] uppercase tracking-[0.08em] text-muted">
            Vendas por dia
          </p>
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
          <h2 className="mb-3 font-display text-[13px] font-medium uppercase tracking-[0.08em]">Analise do mês</h2>
          {dias.length === 0 ? (
            <VazioBox>Nenhuma venda neste mês.</VazioBox>
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
          <h2 className="mb-3 font-display text-[13px] font-medium uppercase tracking-[0.08em]">Vendas por categoria</h2>
          {categorias.length === 0 ? (
            <VazioBox>Nenhuma venda neste mês.</VazioBox>
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

          <h2 className="mb-3 mt-6 font-display text-[13px] font-medium uppercase tracking-[0.08em]">Top Produtos</h2>
          {topProdutos.length === 0 ? (
            <VazioBox>Nenhuma venda neste mês.</VazioBox>
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

// Cartão de resultado com comparativo vs. mês anterior (null = sem base).
function CardResultado({
  rotulo,
  valor,
  variacao,
}: {
  rotulo: string;
  valor: string;
  variacao: number | null;
}) {
  return (
    <div className="rounded-md border border-line bg-surface px-3 py-2.5">
      <p className="text-[10px] uppercase tracking-[0.08em] text-muted">{rotulo}</p>
      <p className="num mt-1 text-[19px] font-medium text-ink">{valor}</p>
      {variacao === null ? (
        <p className="mt-0.5 text-[11px] text-muted">sem base no mês anterior</p>
      ) : (
        <p
          className={`num mt-0.5 text-[11px] ${
            variacao >= 0 ? "text-green-800" : "text-red-700"
          }`}
        >
          {variacao >= 0 ? "▲" : "▼"} {Math.abs(variacao)}% vs. mês anterior
        </p>
      )}
    </div>
  );
}
