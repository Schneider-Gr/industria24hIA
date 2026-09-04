import type { ReactNode } from "react";
import { getUser, getMinhaLoja } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ErrorState } from "@/components/ErrorState";
import { PageTitle, PrecisaLogin, SemLoja, VazioBox } from "@/components/seller/states";
import { formatBRL, formatData } from "@/components/seller/format";
import { StatusBadge } from "@/components/admin/ui";
import {
  IconCaixa,
  IconCalendario,
  IconCaminhao,
  IconChave,
  IconCheck,
  IconChevron,
  IconDesfazer,
  IconRepasse,
} from "@/components/seller/icons";
import { marcarEntrega, confirmarEntregaCodigo, avancarStatusPedido } from "./actions";
import { CancelarPedido } from "@/components/seller/CancelarPedido";
import { SolicitarRepasse } from "@/components/seller/SolicitarRepasse";

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

// Mesmos status que repasse_solicitar_pedido (0158) aceita como "pago". Sem
// isso o botão aparecia em pedido "Aguardando Pagamento" e a RPC rejeitava.
const STATUS_PAGOS: string[] = ["Pagamento Realizado", "Em Separação", "Enviado"];

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
        {FILTROS.map((f) => {
          const n = (pedidos ?? []).filter((p) => f.match(p.status_pedido ?? "")).length;
          return (
            <a
              key={f.key}
              href={f.key === "todos" ? "/seller/pedidos" : `/seller/pedidos?filtro=${f.key}`}
              className={`rounded-full border px-3 py-1 text-sm ${
                f.key === filtroAtivo.key
                  ? "border-lm-azul bg-lm-azul font-semibold text-white"
                  : "border-line hover:bg-lm-cinza"
              }`}
            >
              {f.label}
              <span
                className={`num ml-1.5 ${f.key === filtroAtivo.key ? "opacity-80" : "text-muted"}`}
              >
                {n}
              </span>
            </a>
          );
        })}
      </div>

      {lista.length === 0 ? (
        <VazioBox>
          Nenhum pedido {filtroAtivo.key === "todos" ? "registrado ainda" : "neste filtro"}.
        </VazioBox>
      ) : (
        <>
          {/* Cabeçalho da lista: só no desktop, alinhado às colunas do <summary>. */}
          <div className="hidden items-center gap-3 px-3 pb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted lg:flex">
            <span className="w-4 shrink-0" />
            <span className="w-28 shrink-0">Id Venda</span>
            <span className="min-w-0 flex-1">Cliente</span>
            <span className="w-20 shrink-0">Data</span>
            <span className="w-40 shrink-0">Status</span>
            <span className="w-28 shrink-0 text-center">Entrega · Repasse</span>
            <span className="w-24 shrink-0 text-right">Valor</span>
          </div>

          <div className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
            {lista.map((p) => {
              const agg = porPedido.get(p.id);
              const total = agg?.total ?? 0;
              const tudoEntregue = total > 0 && agg!.entreg === total;
              const tudoTransferido = total > 0 && agg!.transf === total;
              // Mesma condição do botão "Solicitar repasse" lá embaixo: sobe
              // para o resumo como aviso, senão o dinheiro parado só aparece
              // para quem abre o pedido.
              const repasseDisponivel =
                tudoEntregue && !tudoTransferido && STATUS_PAGOS.includes(p.status_pedido ?? "");
              const itensDoPedido = itensPorPedido.get(p.id) ?? [];
              return (
                // <details> nativo: expandir/recolher sem JS nem estado de
                // cliente, com teclado e leitor de tela de graça. Antes a tela
                // renderizava o bloco de itens de TODOS os pedidos aberto.
                <details key={p.id} className="group open:bg-lm-cinza/25">
                  <summary className="flex cursor-pointer list-none items-center gap-3 px-3 py-2.5 hover:bg-lm-cinza/60 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-lm-azul [&::-webkit-details-marker]:hidden">
                    <IconChevron className="size-4 shrink-0 text-muted transition-transform group-open:rotate-90" />
                    <span className="hidden w-28 shrink-0 truncate font-mono text-xs text-ink-2 lg:block">
                      {p.id_venda}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm">{p.cliente_nome ?? "—"}</span>
                      <span className="block truncate text-[11px] text-muted lg:hidden">
                        <span className="font-mono">{p.id_venda}</span> · {formatData(p.data)}
                      </span>
                    </span>
                    <span className="num hidden w-20 shrink-0 text-xs text-muted lg:block">
                      {formatData(p.data)}
                    </span>
                    {/* Status nunca some: é o dado que diz se o pedido precisa
                        de ação, e escondê-lo obrigava a expandir um a um. */}
                    <span className="shrink-0 lg:w-40">
                      <StatusBadge status={p.status_pedido} />
                    </span>
                    {/* Slot de largura fixa mesmo vazio: sem isso a tag empurra
                        data e status só nas linhas que a têm, e a lista perde o
                        alinhamento de coluna. */}
                    <span className="hidden w-36 shrink-0 sm:block">
                      {repasseDisponivel && (
                        <Tag tom="warn" icone={<IconRepasse className="size-3" />}>
                          Repasse disponível
                        </Tag>
                      )}
                    </span>
                    <span className="hidden w-28 shrink-0 items-center justify-center gap-2 lg:flex">
                      <Progresso
                        titulo="Itens entregues"
                        feito={agg?.entreg ?? 0}
                        total={total}
                        icone={<IconCaminhao className="size-3.5" />}
                        completo={tudoEntregue}
                      />
                      <Progresso
                        titulo="Itens com repasse transferido"
                        feito={agg?.transf ?? 0}
                        total={total}
                        icone={<IconRepasse className="size-3.5" />}
                        completo={tudoTransferido}
                      />
                    </span>
                    <span className="num w-24 shrink-0 text-right text-sm font-semibold">
                      {formatBRL(p.valor_pedido)}
                    </span>
                  </summary>

                  <div className="border-t border-line px-3 py-3">
                    {/* Status e progresso somem do resumo nas quebras sm/lg;
                        reaparecem aqui para não perder informação no celular. */}
                    <div className="mb-3 flex flex-wrap items-center gap-2 lg:hidden">
                      <span className="sm:hidden">
                        <StatusBadge status={p.status_pedido} />
                      </span>
                      <Progresso
                        titulo="Itens entregues"
                        feito={agg?.entreg ?? 0}
                        total={total}
                        icone={<IconCaminhao className="size-3.5" />}
                        completo={tudoEntregue}
                      />
                      <Progresso
                        titulo="Itens com repasse transferido"
                        feito={agg?.transf ?? 0}
                        total={total}
                        icone={<IconRepasse className="size-3.5" />}
                        completo={tudoTransferido}
                      />
                    </div>

                    {itensDoPedido.length === 0 ? (
                      <span className="text-xs text-muted">
                        Nenhum item encontrado para este pedido.
                      </span>
                    ) : (
                      <ul className="divide-y divide-line rounded border border-line">
                        {itensDoPedido.map((item) => (
                          <li
                            key={item.id}
                            className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-2.5 py-2 text-xs"
                          >
                            <span className="min-w-0 flex-1 truncate font-medium">
                              {item.produto_nome ?? "—"}
                            </span>
                            <span className="num text-muted">{item.quantidade ?? 0}x</span>
                            <span className="num w-20 text-right font-semibold">
                              {formatBRL(item.valor ?? 0)}
                            </span>
                            <span
                              className="num w-20 text-right text-muted"
                              title="Repasse da indústria"
                            >
                              {item.repasse_ind != null ? formatBRL(item.repasse_ind) : "—"}
                            </span>
                            {item.previsao_vf && (
                              <Tag tom="info" icone={<IconCalendario className="size-3" />}>
                                Venda futura · {formatData(item.previsao_vf)}
                              </Tag>
                            )}
                            <Tag
                              tom={item.transferido ? "ok" : "warn"}
                              icone={<IconRepasse className="size-3" />}
                            >
                              {item.transferido ? "Repasse feito" : "Repasse pendente"}
                            </Tag>
                            <Tag
                              tom={item.entregue ? "ok" : "warn"}
                              icone={
                                item.entregue ? (
                                  <IconCheck className="size-3" />
                                ) : (
                                  <IconCaminhao className="size-3" />
                                )
                              }
                            >
                              {item.entregue ? "Entregue" : "Pendente"}
                            </Tag>
                            <form action={marcarEntrega}>
                              <input type="hidden" name="item_id" value={item.id} />
                              <input type="hidden" name="entregue" value={String(!item.entregue)} />
                              <BotaoIcone
                                icone={
                                  item.entregue ? (
                                    <IconDesfazer className="size-3.5" />
                                  ) : (
                                    <IconCheck className="size-3.5" />
                                  )
                                }
                              >
                                {item.entregue ? "Desfazer" : "Marcar entregue"}
                              </BotaoIcone>
                            </form>
                          </li>
                        ))}
                      </ul>
                    )}

                    {/* Pagamento Realizado tem DOIS caminhos excludentes:
                        retirada no balcão contra o código de 4 dígitos do
                        comprador, ou separação + envio. Antes os dois botões
                        vinham lado a lado na mesma fileira, e não dava para
                        saber que era um ou outro. */}
                    {p.status_pedido === "Pagamento Realizado" && (
                      <fieldset className="mt-3 rounded border border-line px-3 py-2">
                        <legend className="px-1 text-[11px] font-medium uppercase tracking-wider text-muted">
                          Como este pedido sai
                        </legend>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                          <form
                            action={confirmarEntregaCodigo}
                            className="flex items-center gap-1.5"
                          >
                            <input type="hidden" name="pedido_id" value={p.id} />
                            <IconChave className="size-3.5 text-muted" />
                            <label htmlFor={`cod-${p.id}`} className="text-xs">
                              Retirada no balcão
                            </label>
                            <input
                              id={`cod-${p.id}`}
                              type="text"
                              name="codigo"
                              inputMode="numeric"
                              maxLength={4}
                              placeholder="0000"
                              required
                              aria-label="Código de 4 dígitos do comprador"
                              className="num w-16 rounded border border-line px-1.5 py-1 text-sm"
                            />
                            <BotaoIcone primario icone={<IconCheck className="size-3.5" />}>
                              Confirmar retirada
                            </BotaoIcone>
                          </form>
                          <span className="text-xs text-muted">ou</span>
                          <form action={avancarStatusPedido}>
                            <input type="hidden" name="pedido_id" value={p.id} />
                            <input type="hidden" name="novo_status" value="Em Separação" />
                            <BotaoIcone primario icone={<IconCaixa className="size-3.5" />}>
                              Enviar: iniciar separação
                            </BotaoIcone>
                          </form>
                        </div>
                      </fieldset>
                    )}

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {p.status_pedido === "Em Separação" && (
                        <form action={avancarStatusPedido}>
                          <input type="hidden" name="pedido_id" value={p.id} />
                          <input type="hidden" name="novo_status" value="Enviado" />
                          <BotaoIcone primario icone={<IconCaminhao className="size-3.5" />}>
                            Marcar como enviado
                          </BotaoIcone>
                        </form>
                      )}

                      {/* Paridade com o "Solicitar Transferência" do Bubble:
                          aparece só depois que todo item do pedido está
                          entregue, e enquanto sobrar item não transferido.
                          Fica fora do bloco de status acima porque um pedido
                          já "Enviado" também pode ter repasse pendente.
                          A RPC 0158 revalida dono, pagamento e entrega. */}
                      {repasseDisponivel && <SolicitarRepasse pedidoId={p.id} />}
                      {/* Sem isso o botão de repasse simplesmente não existia e
                          o seller não sabia que faltava marcar item entregue. */}
                      {!tudoEntregue &&
                        total > 0 &&
                        STATUS_PAGOS.includes(p.status_pedido ?? "") && (
                          <span className="text-[11px] text-muted">
                            Repasse libera quando os {total - agg!.entreg} item(ns) restantes
                            estiverem entregues.
                          </span>
                        )}

                      {p.status_pedido !== "Enviado" && p.status_pedido !== "Cancelado" && (
                        <CancelarPedido pedidoId={p.id} />
                      )}
                    </div>
                  </div>
                </details>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// Contador "feito/total" com ícone; verde quando a etapa fechou.
function Progresso({
  titulo,
  feito,
  total,
  icone,
  completo,
}: {
  titulo: string;
  feito: number;
  total: number;
  icone: ReactNode;
  completo: boolean;
}) {
  return (
    <span
      title={`${titulo}: ${feito} de ${total}`}
      className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium ${
        completo ? "bg-ok/15 text-ink" : "bg-lm-cinza text-ink-2"
      }`}
    >
      <span className={completo ? "text-ok" : "text-muted"}>{icone}</span>
      <span className="num">
        {feito}/{total}
      </span>
    </span>
  );
}

// Par fundo-claro/texto-escuro exigido pelo DESIGN.md: o texto fica em `ink`
// (contraste AA sobra em 11px) e a cor semântica vive no fundo e no ícone —
// `text-ok`/`text-warn` como cor de texto renderiam ~3:1 sobre o próprio tint.
const TONS = {
  ok: ["bg-ok/15", "text-ok"],
  warn: ["bg-warn/20", "text-warn"],
  info: ["bg-info/15", "text-info"],
} as const;

function Tag({
  tom,
  icone,
  children,
}: {
  tom: keyof typeof TONS;
  icone: ReactNode;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium text-ink ${TONS[tom][0]}`}
    >
      <span className={TONS[tom][1]}>{icone}</span>
      {children}
    </span>
  );
}

function BotaoIcone({
  icone,
  primario,
  children,
}: {
  icone: ReactNode;
  primario?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="submit"
      className={`inline-flex min-h-8 items-center gap-1.5 rounded px-2.5 py-1.5 text-[11px] font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lm-azul ${
        primario
          ? "bg-lm-azul text-white hover:bg-lm-azul-escuro"
          : "border border-line hover:bg-lm-cinza"
      }`}
    >
      {icone}
      {children}
    </button>
  );
}
