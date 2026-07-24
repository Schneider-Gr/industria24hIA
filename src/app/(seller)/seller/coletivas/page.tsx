import { getUser, getMinhaLoja } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ErrorState } from "@/components/ErrorState";
import { PageTitle, PrecisaLogin, SemLoja, VazioBox } from "@/components/seller/states";
import { formatBRL } from "@/components/seller/format";
import { cancelarColetiva, fecharColetiva, expirarPagamentos } from "./actions";
import {
  ColetivaRegraForm,
  type ProdutoOpcao,
  type RegraExistente,
} from "@/components/seller/ColetivaRegraForm";
import { precoLote, proximoLote, type Lote } from "@/lib/coletiva";

export const dynamic = "force-dynamic";

type ColetivaLinha = {
  id: string;
  produto_id: string;
  meta_qtd: number;
  qtd_atual: number;
  valor_unitario: number;
  preco_base: number;
  prazo: string;
  pagamento_ate: string | null;
  status: string;
  created_at: string;
  lotes: Lote[] | null;
  min_participantes: number;
  max_participantes: number | null;
  produtos: { nome: string } | null;
  coletiva_participacoes: { id: string; quantidade: number; pedido_id: string | null }[] | null;
};

// Painel do seller: configuração da coletiva por produto (migration 0076) e
// acompanhamento das coletivas em andamento. Escrita só via RPC/policy.
export default async function ColetivasSellerPage() {
  const user = await getUser();
  if (!user) return <PrecisaLogin />;

  const loja = await getMinhaLoja();
  if (!loja) return <SemLoja />;

  const supabase = await createClient();
  const { data: produtos } = await supabase
    .from("produtos")
    .select("id, nome, valor, estoque_atual")
    .eq("loja_id", loja.id)
    .gt("valor", 0)
    .order("nome");

  const opcoes: ProdutoOpcao[] = (produtos ?? []).map((p) => ({
    id: p.id,
    nome: p.nome,
    valor: Number(p.valor),
    estoque_atual: Number(p.estoque_atual ?? 0),
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- tabelas 0076/0077 fora dos tipos gerados
  const sb = supabase as any;
  const ids = opcoes.map((p) => p.id);
  const { data: regrasRaw } = ids.length
    ? await sb
        .from("coletiva_regras")
        .select(
          "produto_id, ativo, meta_qtd, min_participantes, max_participantes, prazo_dias, lotes, frete_conjunto",
        )
        .in("produto_id", ids)
    : { data: [] };
  const regras = (regrasRaw ?? []) as RegraExistente[];

  const { data, error } = await sb
    .from("compras_coletivas")
    .select(
      "id, produto_id, meta_qtd, qtd_atual, valor_unitario, preco_base, prazo, pagamento_ate, status, created_at, lotes, min_participantes, max_participantes, produtos(nome), coletiva_participacoes(id, quantidade, pedido_id)",
    )
    .eq("loja_id", loja.id)
    .order("created_at", { ascending: false });

  if (error) {
    return <ErrorState title="Falha ao carregar coletivas" detail={error.message} />;
  }

  const coletivas = (data ?? []) as ColetivaLinha[];

  const { data: pagamentos } = coletivas.length
    ? await sb
        .from("coletiva_pagamentos")
        .select("coletiva_id, pedidos_pagos, pedidos_gerados")
        .in(
          "coletiva_id",
          coletivas.map((c) => c.id),
        )
    : { data: [] };
  const pagosPorColetiva = new Map(
    ((pagamentos ?? []) as { coletiva_id: string; pedidos_pagos: number }[]).map((p) => [
      p.coletiva_id,
      p.pedidos_pagos,
    ]),
  );

  return (
    <div>
      <PageTitle
        title="Compras coletivas"
        subtitle="Você define a meta, os lotes de desconto e quantos compradores participam. A coletiva fica aberta até o prazo e todos pagam o melhor lote atingido."
      />

      <div className="mb-8 rounded border border-line bg-white p-4">
        <h2 className="mb-3 text-[15px] font-semibold text-ink">Configuração por produto</h2>
        <ColetivaRegraForm produtos={opcoes} regras={regras} />
      </div>

      {regras.length > 0 && (
        <div className="mb-8 overflow-x-auto rounded border border-line bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-[12px] uppercase tracking-wider text-muted">
                <th className="px-4 py-3">Produto</th>
                <th className="px-4 py-3">Lotes</th>
                <th className="px-4 py-3">Meta</th>
                <th className="px-4 py-3">Participantes</th>
                <th className="px-4 py-3">Prazo</th>
                <th className="px-4 py-3">Ativa</th>
              </tr>
            </thead>
            <tbody>
              {regras.map((r) => {
                const nome = opcoes.find((p) => p.id === r.produto_id)?.nome ?? "—";
                return (
                  <tr key={r.produto_id} className="border-b border-line last:border-0">
                    <td className="px-4 py-3 font-medium text-ink">{nome}</td>
                    <td className="num px-4 py-3">
                      {(r.lotes ?? [])
                        .map((l) => `${l.min_qtd}un → ${formatBRL(l.valor_unitario)}`)
                        .join(" · ") || "—"}
                    </td>
                    <td className="num px-4 py-3">{r.meta_qtd ?? "1º lote"}</td>
                    <td className="num px-4 py-3">
                      {r.min_participantes}
                      {r.max_participantes ? `–${r.max_participantes}` : "+"}
                    </td>
                    <td className="num px-4 py-3">{r.prazo_dias} dias</td>
                    <td className="px-4 py-3">{r.ativo ? "Sim" : "Não"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <h2 className="mb-3 text-[15px] font-semibold text-ink">Coletivas em andamento</h2>
      {coletivas.length === 0 ? (
        <VazioBox>
          Nenhuma compra coletiva ainda. Depois de configurar a regra acima, os
          compradores criam a coletiva na página do produto.
        </VazioBox>
      ) : (
        <div className="overflow-x-auto rounded border border-line bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-[12px] uppercase tracking-wider text-muted">
                <th className="px-4 py-3">Produto</th>
                <th className="px-4 py-3">Progresso</th>
                <th className="px-4 py-3">Preço atual</th>
                <th className="px-4 py-3">Próximo lote</th>
                <th className="px-4 py-3">Prazo</th>
                <th className="px-4 py-3">Participantes</th>
                <th className="px-4 py-3">Pedidos</th>
                <th className="px-4 py-3">Pagos</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {coletivas.map((c) => {
                const participacoes = c.coletiva_participacoes ?? [];
                const pedidos = participacoes.filter((p) => p.pedido_id).length;
                const lotes = Array.isArray(c.lotes) ? c.lotes : [];
                const emAndamento = c.status === "Aberta" || c.status === "Viavel";
                const expirada = emAndamento && new Date(c.prazo) < new Date();
                const status = expirada ? "Expirada" : c.status;
                const atual = lotes.length
                  ? precoLote(lotes, c.qtd_atual, Number(c.preco_base))
                  : Number(c.valor_unitario);
                const proximo = proximoLote(lotes, c.qtd_atual);
                const viavel =
                  c.qtd_atual >= c.meta_qtd &&
                  participacoes.length >= (c.min_participantes ?? 1);
                const pagos = pagosPorColetiva.get(c.id) ?? 0;
                const naoPagos = pedidos - pagos;
                const janelaVencida =
                  !!c.pagamento_ate && new Date(c.pagamento_ate) < new Date();
                return (
                  <tr key={c.id} className="border-b border-line last:border-0">
                    <td className="px-4 py-3 font-medium text-ink">
                      {c.produtos?.nome ?? "—"}
                    </td>
                    <td className="num px-4 py-3">
                      {c.qtd_atual}/{c.meta_qtd} un
                    </td>
                    <td className="num px-4 py-3">
                      {formatBRL(atual)}{" "}
                      <span className="text-muted line-through">{formatBRL(c.preco_base)}</span>
                    </td>
                    <td className="num px-4 py-3">
                      {proximo
                        ? `${proximo.min_qtd - c.qtd_atual} un → ${formatBRL(proximo.valor_unitario)}`
                        : "—"}
                    </td>
                    <td className="num px-4 py-3">
                      {new Date(c.prazo).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="num px-4 py-3">
                      {participacoes.length}
                      {c.max_participantes ? `/${c.max_participantes}` : ""}
                    </td>
                    <td className="num px-4 py-3">{pedidos}</td>
                    <td className="num px-4 py-3">
                      {pagos}
                      {pedidos > 0 ? `/${pedidos}` : ""}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          status === "Atingida"
                            ? "text-verde-24h"
                            : status === "Aberta" || status === "Viavel"
                              ? "text-ink"
                              : "text-muted"
                        }
                      >
                        {status === "Viavel" ? "Meta batida" : status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {emAndamento && !expirada && (
                        <div className="flex gap-2">
                          {viavel && (
                            <form action={fecharColetiva}>
                              <input type="hidden" name="coletiva_id" value={c.id} />
                              <button
                                type="submit"
                                className="rounded border border-verde-24h px-3 py-1 text-xs font-semibold text-verde-24h hover:bg-verde-24h-tint"
                              >
                                Fechar agora
                              </button>
                            </form>
                          )}
                          <form action={cancelarColetiva}>
                            <input type="hidden" name="coletiva_id" value={c.id} />
                            <button
                              type="submit"
                              className="rounded border border-line px-3 py-1 text-xs text-ink hover:border-red-400 hover:text-red-600"
                            >
                              Cancelar
                            </button>
                          </form>
                        </div>
                      )}
                      {c.status === "Atingida" && naoPagos > 0 && (
                        janelaVencida ? (
                          <form action={expirarPagamentos}>
                            <input type="hidden" name="coletiva_id" value={c.id} />
                            <button
                              type="submit"
                              className="rounded border border-red-400 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                            >
                              Cancelar {naoPagos} não pago{naoPagos > 1 ? "s" : ""}
                            </button>
                          </form>
                        ) : (
                          <span className="text-xs text-muted">
                            {naoPagos} aguardando pagamento
                            {c.pagamento_ate
                              ? ` até ${new Date(c.pagamento_ate).toLocaleDateString("pt-BR")}`
                              : ""}
                          </span>
                        )
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
