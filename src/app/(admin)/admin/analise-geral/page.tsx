import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { ErrorState } from "@/components/ErrorState";
import { PageHeader, KpiCard, Table, StatusBadge, EmptyState, fmtBRL } from "@/components/admin/ui";
import { PeriodoTabs } from "@/components/painel/PeriodoTabs";
import { fetchAll, chunk } from "@/lib/supabase/fetch-all";
import { parseRange, resolverJanela, RANGE_LABEL, ticketMedio } from "@/lib/dashboard-kpis";

export const dynamic = "force-dynamic";

type LinhaLoja = {
  id: string;
  nome: string;
  situacao: string | null;
  pedidos: number;
  gmv: number;
  receita: number;
  unidades: number;
  pagos: number;
  repasses: number;
};

async function consolidarPorLoja(
  supabase: SupabaseClient,
  desde: string,
  ate: string,
): Promise<{ linhas: LinhaLoja[]; erro: string | null }> {
  const [{ data: lojas, error: eLoja }, { data: pedidos, error: ePed }] = await Promise.all([
    fetchAll<{ id: string; nome: string; situacao: string | null }>((from, to) =>
      supabase.from("lojas").select("id, nome, situacao").range(from, to),
    ),
    fetchAll<{ id: string; loja_id: string; valor_pedido: number | null; status_pedido: string | null }>(
      (from, to) =>
        supabase
          .from("pedidos")
          .select("id, loja_id, valor_pedido, status_pedido")
          .gte("data", desde)
          .lt("data", ate)
          .range(from, to),
    ),
  ]);
  if (eLoja) return { linhas: [], erro: eLoja.message };
  if (ePed) return { linhas: [], erro: ePed.message };

  const pedidoIds = pedidos.map((p) => p.id);
  const [itensChunks, repassesChunks] = await Promise.all([
    Promise.all(
      chunk(pedidoIds).map((g) =>
        fetchAll<{ pedido_id: string; quantidade: number | null; repasse_ind: number | null }>(
          (from, to) =>
            supabase
              .from("linha_itens")
              .select("pedido_id, quantidade, repasse_ind")
              .in("pedido_id", g)
              .range(from, to),
        ),
      ),
    ),
    fetchAll<{ loja_id: string | null; valor: number | null }>((from, to) =>
      supabase
        .from("repasses")
        .select("loja_id, valor")
        .eq("status", "transferido")
        .gte("transferido_em", desde)
        .lt("transferido_em", ate)
        .range(from, to),
    ).then((r) => [r]),
  ]);

  const itens = itensChunks.flatMap((r) => r.data);
  const itensPorPedido = new Map<string, { quantidade: number; repasse: number }>();
  for (const it of itens) {
    const cur = itensPorPedido.get(it.pedido_id) ?? { quantidade: 0, repasse: 0 };
    cur.quantidade += it.quantidade ?? 0;
    cur.repasse += it.repasse_ind ?? 0;
    itensPorPedido.set(it.pedido_id, cur);
  }

  const repassePorLoja = new Map<string, number>();
  for (const r of repassesChunks.flatMap((c) => c.data)) {
    if (!r.loja_id) continue;
    repassePorLoja.set(r.loja_id, (repassePorLoja.get(r.loja_id) ?? 0) + (r.valor ?? 0));
  }

  const agg = new Map<string, Omit<LinhaLoja, "id" | "nome" | "situacao">>();
  for (const p of pedidos) {
    const a = agg.get(p.loja_id) ?? {
      pedidos: 0,
      gmv: 0,
      receita: 0,
      unidades: 0,
      pagos: 0,
      repasses: 0,
    };
    const it = itensPorPedido.get(p.id) ?? { quantidade: 0, repasse: 0 };
    a.pedidos += 1;
    a.gmv += p.valor_pedido ?? 0;
    a.receita += it.repasse;
    a.unidades += it.quantidade;
    if (p.status_pedido === "Pagamento Realizado") a.pagos += 1;
    agg.set(p.loja_id, a);
  }

  const linhas: LinhaLoja[] = lojas
    .map((l) => {
      const a = agg.get(l.id) ?? {
        pedidos: 0,
        gmv: 0,
        receita: 0,
        unidades: 0,
        pagos: 0,
        repasses: 0,
      };
      return {
        id: l.id,
        nome: l.nome,
        situacao: l.situacao,
        ...a,
        repasses: repassePorLoja.get(l.id) ?? 0,
      };
    })
    .filter((l) => l.pedidos > 0 || l.repasses > 0)
    .sort((a, b) => b.gmv - a.gmv);

  return { linhas, erro: null };
}

export default async function AnaliseGeralPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  if (!isSupabaseConfigured) {
    return (
      <ErrorState
        title="Supabase não configurado"
        detail="Defina as variáveis do Supabase em web/.env.local."
      />
    );
  }

  const range = parseRange((await searchParams).range);
  const janela = resolverJanela(range);
  const supabase = await createClient();

  const [{ count: totalLojas }, { count: totalProdutos }, consolidado] = await Promise.all([
    supabase.from("lojas").select("id", { count: "exact", head: true }),
    supabase.from("produtos").select("id", { count: "exact", head: true }),
    consolidarPorLoja(supabase, janela.desde, janela.ate),
  ]);

  if (consolidado.erro) {
    return <ErrorState title="Falha ao carregar a análise" detail={consolidado.erro} />;
  }

  const linhas = consolidado.linhas;
  const tot = linhas.reduce(
    (s, l) => ({
      pedidos: s.pedidos + l.pedidos,
      gmv: s.gmv + l.gmv,
      receita: s.receita + l.receita,
      unidades: s.unidades + l.unidades,
      pagos: s.pagos + l.pagos,
      repasses: s.repasses + l.repasses,
    }),
    { pedidos: 0, gmv: 0, receita: 0, unidades: 0, pagos: 0, repasses: 0 },
  );

  return (
    <div>
      <PageHeader
        title="Análise Geral"
        subtitle={`Consolidado por loja · ${RANGE_LABEL[range]}`}
        count={linhas.length}
      />

      <PeriodoTabs atual={range} basePath="/admin/analise-geral" />

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard label="Lojas cadastradas" value={String(totalLojas ?? 0)} hint={`${linhas.length} com venda no período`} />
        <KpiCard label="Produtos" value={String(totalProdutos ?? 0)} />
        <KpiCard label="GMV do período" value={fmtBRL(tot.gmv)} hint={`${tot.pedidos} pedidos`} />
        <KpiCard
          label="Repasses realizados"
          value={fmtBRL(tot.repasses)}
          hint="Transferido a seller/afiliado"
        />
      </div>

      {linhas.length === 0 ? (
        <EmptyState>Nenhuma loja com movimento no período.</EmptyState>
      ) : (
        <Table
          headers={[
            "Loja",
            "Situação",
            "Pedidos",
            "GMV",
            "Ticket médio",
            "Convrs.",
            "Un. vendidas",
            "Receita plat.",
            "Repasses",
          ]}
        >
          {linhas.map((l) => {
            const conv = l.pedidos > 0 ? (l.pagos / l.pedidos) * 100 : 0;
            return (
              <tr key={l.id} className="text-ink dark:text-ink-2">
                <td className="px-4 py-3 font-medium">
                  <Link href={`/admin/lojas/${l.id}`} className="hover:text-aco-600 hover:underline">
                    {l.nome}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={l.situacao} />
                </td>
                <td className="px-4 py-3 text-right num">{l.pedidos}</td>
                <td className="px-4 py-3 text-right num font-semibold">{fmtBRL(l.gmv)}</td>
                <td className="px-4 py-3 text-right num">{fmtBRL(ticketMedio(l.gmv, l.pedidos))}</td>
                <td className="px-4 py-3 text-right num">{conv.toFixed(0)}%</td>
                <td className="px-4 py-3 text-right num">{l.unidades}</td>
                <td className="px-4 py-3 text-right num text-muted">{fmtBRL(l.receita)}</td>
                <td className="px-4 py-3 text-right num text-muted">{fmtBRL(l.repasses)}</td>
              </tr>
            );
          })}
          <tr className="border-t-2 border-line font-semibold text-ink">
            <td className="px-4 py-3" colSpan={2}>
              Total ({linhas.length} lojas)
            </td>
            <td className="px-4 py-3 text-right num">{tot.pedidos}</td>
            <td className="px-4 py-3 text-right num">{fmtBRL(tot.gmv)}</td>
            <td className="px-4 py-3 text-right num">{fmtBRL(ticketMedio(tot.gmv, tot.pedidos))}</td>
            <td className="px-4 py-3 text-right num">
              {tot.pedidos > 0 ? ((tot.pagos / tot.pedidos) * 100).toFixed(0) : 0}%
            </td>
            <td className="px-4 py-3 text-right num">{tot.unidades}</td>
            <td className="px-4 py-3 text-right num">{fmtBRL(tot.receita)}</td>
            <td className="px-4 py-3 text-right num">{fmtBRL(tot.repasses)}</td>
          </tr>
        </Table>
      )}
    </div>
  );
}
