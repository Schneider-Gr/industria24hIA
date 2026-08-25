import * as Sentry from "@sentry/nextjs";
import { createServiceClient } from "@/lib/supabase/service";
import { calcularTrajeto, linkTrajeto } from "@/lib/geo";
import {
  enviarWhatsapp,
  normalizeWhatsapp,
  mensagemRota,
  mensagemCodigoComprador,
  mensagemPedidoPagoSeller,
} from "@/lib/whatsapp";
import { enviarBubblewhats } from "@/lib/bubblewhats";
import { isUberDirectConfigured, cotarEntrega, criarEntrega } from "@/lib/uber-direct";
import { notificarMudancaStatusPedido } from "@/lib/email";
import { somarRepasseVendedor } from "@/lib/pagamentos-financeiro/cartao";

// Mesmo UUID fixo inserido na migration 0139_uber_direct_transportadora.sql.
const TRANSPORTADORA_UBER_DIRECT_ID = "00000000-0000-4000-8000-0000000000e1";

type ServiceClient = ReturnType<typeof createServiceClient>;

// Tipos manuais para RPC/tabelas das migrations 0022/0043: ainda fora de
// database.types.ts (o projeto Supabase acessível via MCP/CLI local diverge
// do de produção — ver memória project-industria24h-rebuild; regenerar os
// tipos requer `supabase login` com a conta certa, não disponível aqui).
// `unknown` em vez de `any` mantém o TypeScript honesto no resto do arquivo.
type RpcResult<T> = { data: T | null; error: { message: string } | null };
type MaybeSingleResult<T> = { data: T | null };
interface ServiceClientSemTipos {
  rpc(fn: string, args: Record<string, unknown>): Promise<RpcResult<unknown>>;
  from(table: string): {
    select(cols: string): {
      eq(col: string, val: unknown): {
        maybeSingle<T>(): Promise<MaybeSingleResult<T>>;
      };
    };
    update(values: Record<string, unknown>): {
      eq(col: string, val: unknown): Promise<{ error: { message: string } | null }>;
    };
  };
}
type Corrida = {
  origem_endereco: string;
  destino_endereco: string;
  preco_final: number | null;
  valor_parceiro: number | null;
  afiliado_exclusivo_id: string | null;
};
type ParceiroLogistico = { telefone: string | null };

// Despacha corrida automática para o pedido pago (entrega), via
// despachar_corrida_automatica (migration 0043). Se houver afiliado
// logístico Aprovado da loja, ele ganha 5 min de exclusividade (avisado por
// WhatsApp); expirado ou sem afiliado, a corrida já nasce visível pro pool
// geral de parceiros de plataforma (RLS cuida disso, sem passo extra aqui).
async function despacharCorridaParaPedido(svc: ServiceClient, pedidoId: string) {
  const untyped = svc as unknown as ServiceClientSemTipos;

  const { data: corridaId, error } = await untyped.rpc("despachar_corrida_automatica", {
    p_pedido_id: pedidoId,
  });
  if (error) throw new Error(`corrida não despachada: ${error.message}`);
  const idCorrida = corridaId as string | null;
  if (!idCorrida) return idCorrida; // retirada na loja ou frete_consolidado: sem corrida

  const { data: corrida } = await untyped
    .from("corridas")
    .select("origem_endereco, destino_endereco, preco_final, valor_parceiro, afiliado_exclusivo_id")
    .eq("id", idCorrida)
    .maybeSingle<Corrida>();
  if (!corrida) return idCorrida;

  // Percurso: grava distância/duração/link na corrida para o afiliado ver
  // (antes só ia pro WhatsApp, atrás do early return de telefone). Sem
  // GOOGLE_MAPS_API_KEY grava só o link_mapa — nunca um número plausível.
  const r = await calcularTrajeto(corrida.origem_endereco, corrida.destino_endereco);
  const trajeto = r.ok ? r.valor : null;
  const linkMapa = trajeto?.link_mapa ?? linkTrajeto(corrida.origem_endereco, corrida.destino_endereco);
  await untyped
    .from("corridas")
    .update({ distancia_m: trajeto?.distancia_m ?? null, duracao_s: trajeto?.duracao_s ?? null, link_mapa: linkMapa })
    .eq("id", idCorrida);

  if (!corrida.afiliado_exclusivo_id) return idCorrida;

  const { data: parceiro } = await untyped
    .from("parceiros_logisticos")
    .select("telefone")
    .eq("user_id", corrida.afiliado_exclusivo_id)
    .maybeSingle<ParceiroLogistico>();
  if (!parceiro?.telefone) return idCorrida;

  await enviarWhatsapp(
    parceiro.telefone,
    mensagemRota({
      origem: corrida.origem_endereco,
      destino: corrida.destino_endereco,
      ganho: corrida.valor_parceiro ? `R$ ${Number(corrida.valor_parceiro).toFixed(2)}` : "a combinar",
      distancia: trajeto?.distancia_m ? `${(trajeto.distancia_m / 1000).toFixed(1)} km` : undefined,
      linkMapa,
    })
  );
  return idCorrida;
}

interface RotasInsertSemTipos {
  from(table: "rotas"): {
    insert(values: Record<string, unknown>): Promise<{ error: { message: string } | null }>;
  };
}

// Fallback Uber Direct (PRD 008, US01/US02): só roda quando o despacho
// automático interno (despacharCorridaParaPedido, tabela `corridas`) NÃO
// criou corrida — `corridaId` null aqui só acontece por retirada na loja
// (já filtrado abaixo pelo itemEntrega) ou frete_consolidado (fluxo à parte,
// também abortado abaixo).
async function despacharUberDirectSeElegivel(
  svc: ServiceClient,
  pedidoId: string,
  corridaId: string | null | undefined,
) {
  if (!isUberDirectConfigured) return;
  if (corridaId) return; // já despachado via afiliado/pool geral (corridas)

  const { data: pedido } = await svc
    .from("pedidos")
    .select("id_venda, loja_id, telefone_contato, frete_consolidado")
    .eq("id", pedidoId)
    .maybeSingle();
  if (!pedido?.loja_id) return;
  if (pedido.frete_consolidado) return; // fluxo de lote do admin (0074), não é "sem cobertura"

  const { data: itens } = await svc
    .from("linha_itens")
    .select(
      "retirar_na_loja, entrega_cep, entrega_rua, entrega_numero, entrega_bairro, entrega_cidade, entrega_complemento",
    )
    .eq("pedido_id", pedidoId);
  const itemEntrega = (itens ?? []).find(
    (i) => !i.retirar_na_loja && i.entrega_cep && i.entrega_rua && i.entrega_numero,
  );
  if (!itemEntrega) return; // só retirada, ou endereço do comprador incompleto

  const { data: loja } = await svc
    .from("lojas")
    .select("razao_social, whatsapp, cep, rua, numero, bairro, cidade, estado, complemento")
    .eq("id", pedido.loja_id)
    .maybeSingle();
  if (!loja?.cep || !loja.rua || !loja.numero || !loja.cidade || !loja.estado) {
    Sentry.captureMessage("Uber Direct: endereço da loja incompleto para pickup", {
      level: "warning",
      tags: { area: "logistica", gateway: "uber_direct" },
      extra: { pedidoId, lojaId: pedido.loja_id },
    });
    return;
  }

  const origem = {
    rua: loja.rua,
    numero: loja.numero,
    bairro: loja.bairro ?? undefined,
    cidade: loja.cidade,
    uf: loja.estado,
    cep: loja.cep,
    complemento: loja.complemento ?? undefined,
  };
  const destino = {
    rua: itemEntrega.entrega_rua!,
    numero: itemEntrega.entrega_numero!,
    bairro: itemEntrega.entrega_bairro ?? undefined,
    cidade: itemEntrega.entrega_cidade ?? loja.cidade,
    uf: loja.estado,
    cep: itemEntrega.entrega_cep!,
    complemento: itemEntrega.entrega_complemento ?? undefined,
  };

  const cotacao = await cotarEntrega({ origem, destino });
  const entrega = await criarEntrega({
    quoteId: cotacao.id,
    origem,
    origemNomeContato: loja.razao_social ?? "Vendedor Indústria24h",
    origemTelefone: loja.whatsapp ?? "",
    destino,
    destinoNomeContato: "Comprador Indústria24h",
    destinoTelefone: pedido.telefone_contato ?? "",
    manifestoDescricao: `Pedido ${pedido.id_venda}`,
    pedidoId,
  });

  const { error } = await (svc as unknown as RotasInsertSemTipos).from("rotas").insert({
    pedido_id: pedidoId,
    origem_cep: loja.cep,
    destino_cep: itemEntrega.entrega_cep,
    frete_calculado: cotacao.feeCentavos / 100,
    status: "Atribuida",
    uber_delivery_id: entrega.id,
    uber_tracking_url: entrega.trackingUrl,
    uber_status: entrega.status,
  });
  if (error) throw new Error(`rota Uber Direct não gravada: ${error.message}`);
}

// Avisos de pagamento por WhatsApp (0073). Comprador recebe o CÓDIGO de
// retirada/entrega; seller recebe só o aviso de pedido pago (o código com
// ele anularia a prova de que a pessoa certa retirou). Pedidos de compra
// coletiva não têm telefone próprio — cai no último telefone_contato do
// mesmo cliente, se houver.
async function notificarPagamento(svc: ServiceClient, pedidoId: string) {
  const { data: pedido } = await svc
    .from("pedidos")
    .select("id_venda, valor_pedido, codigo_retirada, telefone_contato, cliente_id, loja_id")
    .eq("id", pedidoId)
    .maybeSingle();
  if (!pedido) return;

  const { data: itens } = await svc
    .from("linha_itens")
    .select("retirar_na_loja")
    .eq("pedido_id", pedidoId);
  const retirada = (itens ?? []).every((i) => i.retirar_na_loja);

  // Comprador: telefone do pedido, ou o último informado pelo mesmo cliente.
  let telComprador = pedido.telefone_contato;
  if (!telComprador && pedido.cliente_id) {
    const { data: anterior } = await svc
      .from("pedidos")
      .select("telefone_contato")
      .eq("cliente_id", pedido.cliente_id)
      .not("telefone_contato", "is", null)
      .order("data", { ascending: false })
      .limit(1)
      .maybeSingle();
    telComprador = anterior?.telefone_contato ?? null;
  }
  if (telComprador && pedido.codigo_retirada) {
    await enviarBubblewhats(
      normalizeWhatsapp(telComprador),
      mensagemCodigoComprador({
        idVenda: pedido.id_venda,
        codigo: pedido.codigo_retirada,
        retirada,
        linkPedido: `https://industria24.com.br/pedido/${pedidoId}`,
      }),
    );
  }

  // Seller: aviso de pedido pago no WhatsApp da loja.
  if (pedido.loja_id) {
    const { data: loja } = await svc
      .from("lojas")
      .select("whatsapp")
      .eq("id", pedido.loja_id)
      .maybeSingle();
    if (loja?.whatsapp) {
      await enviarWhatsapp(
        loja.whatsapp,
        mensagemPedidoPagoSeller({
          idVenda: pedido.id_venda,
          valor: `R$ ${Number(pedido.valor_pedido).toFixed(2)}`,
          retirada,
        }),
      );
    }
  }
}

export type PagamentoConfirmado = {
  id: string;
  value: number;
  paymentDate: string | null;
};

export type ResultadoConfirmacao =
  | { ok: true; ja_estava_pago: false }
  | { ok: true; ja_estava_pago: true }
  | { ok: false; motivo: "pedido_nao_encontrado" | "cobranca_nao_confere" | "valor_nao_confere" };

// Núcleo da confirmação de pagamento — chamado pelo webhook Asaas (caminho
// normal) e pela verificação manual/fallback em asaas-verificar.ts (quando o
// webhook não chega: painel não configurado, timeout, fila de retry
// estourada etc.). As duas entradas convergem aqui para nunca duplicar
// crédito, notificação ou despacho de entrega.
export async function confirmarPagamentoPedido(
  pedidoId: string,
  payment: PagamentoConfirmado,
): Promise<ResultadoConfirmacao> {
  const svc = createServiceClient();

  const { data: pedido } = await svc
    .from("pedidos")
    .select("asaas_cobranca_id, valor_pedido, status_pedido, parcelas, loja_id, split_nativo_aplicado")
    .eq("id", pedidoId)
    .maybeSingle();
  if (!pedido) return { ok: false, motivo: "pedido_nao_encontrado" };

  // Idempotente: webhook e verificação manual podem chegar quase juntos
  // (usuário clica "verificar" no instante em que o webhook também dispara).
  if (pedido.status_pedido === "Pagamento Realizado" || pedido.status_pedido === "Em Separação" || pedido.status_pedido === "Enviado") {
    return { ok: true, ja_estava_pago: true };
  }

  // Cartão parcelado (migration 0148): pedidos.asaas_cobranca_id guarda o id
  // da 1ª parcela — é o único payment.id que casa aqui. As parcelas 2..N têm
  // id próprio na Asaas, então cobrancaConfere já as ignora sozinho (não
  // precisa checar installmentNumber): webhook de parcela seguinte só cai no
  // "cobranca_nao_confere" abaixo, sem re-creditar nem duplicar nada.
  const cobrancaConfere = pedido.asaas_cobranca_id === payment.id;
  if (!cobrancaConfere) return { ok: false, motivo: "cobranca_nao_confere" };

  // O valor da 1ª parcela é uma fração do total (payment.value = valor da
  // parcela, não do pedido inteiro) — compara contra o valor por parcela,
  // não contra pedido.valor_pedido. Sem parcelamento (parcelas=1) o cálculo
  // devolve o próprio total, mesmo comportamento de antes.
  const parcelas = pedido.parcelas ?? 1;
  const valorPorParcela =
    typeof pedido.valor_pedido === "number" ? pedido.valor_pedido / parcelas : null;
  // epsilon de 1 centavo: arredondamento de divisão não exata (ex.: 100/3)
  // não pode reprovar um pagamento legítimo.
  const valorConfere = typeof valorPorParcela === "number" && payment.value >= valorPorParcela - 0.01;
  if (!valorConfere) return { ok: false, motivo: "valor_nao_confere" };

  const { error } = await svc
    .from("pedidos")
    .update({
      status_pedido: "Pagamento Realizado",
      dt_pagamento: payment.paymentDate ? new Date(payment.paymentDate).toISOString() : new Date().toISOString(),
      // coluna é text (migration 0005); grava o valor recebido, não o status do evento
      valor_recebido_industria: String(payment.value ?? pedido.valor_pedido),
    })
    .eq("id", pedidoId);
  if (error) throw new Error(`falha ao gravar pagamento: ${error.message}`);

  await svc
    .from("linha_itens")
    .update({ pago: true, dt_pagamento_cliente: new Date().toISOString() })
    .eq("pedido_id", pedidoId);

  // Split nativo (migration 0148): o valor do seller já saiu direto pra
  // subconta Asaas dele no ato do pagamento — grava o repasse como
  // 'transferido' de cara (não 'pendente'), pra aparecer no ledger com o
  // status certo e pra repasses_recalcular_pedido (chamado na confirmação de
  // entrega) não tentar recriar um repasse manual pra dinheiro que a loja já
  // recebeu. O guard `where status = 'pendente'` daquela função já impede a
  // sobrescrita — só precisamos garantir que esta linha nasce não-pendente.
  if (pedido.split_nativo_aplicado && pedido.loja_id) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- repasse_vendedor fora dos tipos gerados
    const { data: itens } = await (svc as any)
      .from("linha_itens")
      .select("repasse_vendedor")
      .eq("pedido_id", pedidoId);
    const valorSeller = somarRepasseVendedor(itens ?? []);
    if (valorSeller > 0) {
      const { error: repasseError } = await svc.from("repasses").upsert(
        {
          pedido_id: pedidoId,
          destino: "seller",
          loja_id: pedido.loja_id,
          valor: valorSeller,
          status: "transferido",
          transferido_em: new Date().toISOString(),
        },
        { onConflict: "pedido_id,destino,afiliado_id" },
      );
      if (repasseError) {
        Sentry.captureException(new Error(repasseError.message), {
          tags: { area: "pagamentos-financeiro", signal: "repasse_split_nativo" },
          extra: { pedidoId },
        });
      }
    }
  }

  // Avisos por WhatsApp (0073): código de retirada ao comprador; aviso de
  // pedido pago ao seller. Best-effort: falha não derruba a confirmação.
  try {
    await notificarPagamento(svc, pedidoId);
  } catch (erro) {
    Sentry.captureException(erro, {
      tags: { area: "whatsapp", signal: "notificacao_pagamento" },
      extra: { pedidoId },
    });
  }
  // E-mail de confirmação de pagamento ao comprador — já é best-effort
  // internamente (nunca lança), não precisa de try/catch aqui.
  await notificarMudancaStatusPedido(svc, pedidoId, "Pagamento Realizado");

  // Despacho automático (MPDD-22): pedido pago com entrega vira corrida no
  // feed de parceiros/afiliado logístico. Falha aqui não pode derrubar a
  // confirmação (pagamento já registrado) — loga no Sentry e segue.
  //
  // PRD 008 §7/§9: comprador que escolheu Uber Direct no checkout tem sinal
  // EXPLÍCITO — linha_itens.transportadora_id aponta pra transportadora Uber
  // Direct — e nesse caso a corrida nem é criada (não faz sentido publicar
  // no pool um pedido que já vai de Uber Direct).
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- transportadora_id (migration 0099) fora dos tipos gerados
    const { data: itemUberDirect } = await (svc as any)
      .from("linha_itens")
      .select("id")
      .eq("pedido_id", pedidoId)
      .eq("transportadora_id", TRANSPORTADORA_UBER_DIRECT_ID)
      .limit(1)
      .maybeSingle();

    const corridaId = itemUberDirect ? null : await despacharCorridaParaPedido(svc, pedidoId);
    await despacharUberDirectSeElegivel(svc, pedidoId, corridaId);
  } catch (erro) {
    Sentry.captureException(erro, {
      tags: { area: "logistica", signal: "roteirizacao_pos_pagamento" },
      extra: { pedidoId },
    });
  }

  return { ok: true, ja_estava_pago: false };
}

export async function cancelarPedidoPorPagamento(pedidoId: string): Promise<void> {
  const svc = createServiceClient();
  const { error } = await (svc as unknown as ServiceClientSemTipos).rpc(
    "pedido_cancelar_devolver_estoque",
    { p_pedido_id: pedidoId },
  );
  if (error) throw new Error(error.message);
  await notificarMudancaStatusPedido(svc, pedidoId, "Cancelado");
}
