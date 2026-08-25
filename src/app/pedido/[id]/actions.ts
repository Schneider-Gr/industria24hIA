"use server";

import { redirect } from "next/navigation";
import * as Sentry from "@sentry/nextjs";
import { createClient } from "@/lib/supabase/server";
import { getPayment, isAsaasConfigured } from "@/lib/asaas";
import { confirmarPagamentoPedido } from "@/lib/asaas-confirmar";
import { checarLimite } from "@/lib/rate-limit";

// Fallback de confirmação de pagamento: consulta o status da cobrança direto
// na Asaas e credita se estiver paga. Existe porque o webhook (a via normal,
// em confirmarPagamentoPedido) depende de o webhook estar cadastrado no
// painel Asaas do ambiente certo (produção x sandbox têm cadastros
// separados) — se não estiver, ou se a entrega falhar/atrasar do lado da
// Asaas, o pedido fica preso em "Aguardando Pagamento" para sempre sem este
// botão. Nunca chamar isso num loop automático — é ação do comprador,
// limitada por rate-limit, para não virar polling disfarçado.
export async function verificarPagamento(formData: FormData): Promise<void> {
  const pedidoId = String(formData.get("pedido_id") ?? "");

  if (!checarLimite(`verificar-pagamento:${pedidoId}`, 1, 15_000)) {
    redirect(
      `/pedido/${pedidoId}?erro=${encodeURIComponent("Já existe uma verificação em andamento. Aguarde alguns segundos.")}`,
    );
  }

  // redirect() do Next.js funciona via throw — nunca chamar dentro do try
  // abaixo, ou o catch trataria o redirect como erro genérico e o
  // reembrulharia numa Sentry.captureException + outro redirect.
  let erroMsg: string | null = null;
  try {
    if (!isAsaasConfigured) throw new Error("Pagamento ainda não configurado nesta instalação.");

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Faça login.");

    // view: só devolve o pedido se for do próprio comprador (0025)
    const { data: pedido } = await supabase
      .from("pedidos_cliente")
      .select("id, asaas_cobranca_id")
      .eq("id", pedidoId)
      .maybeSingle();
    if (!pedido) throw new Error("Pedido não encontrado.");

    if (pedido.asaas_cobranca_id) {
      const cobranca = await getPayment(pedido.asaas_cobranca_id);
      const pago = cobranca.status === "RECEIVED" || cobranca.status === "CONFIRMED";
      if (!pago) {
        erroMsg = "Ainda não identificamos o pagamento. Se você já pagou, aguarde alguns instantes e tente de novo.";
      } else {
        await confirmarPagamentoPedido(pedidoId, {
          id: cobranca.id,
          value: cobranca.value,
          paymentDate: cobranca.paymentDate,
        });
      }
    }
  } catch (erro) {
    Sentry.captureException(erro, { tags: { area: "checkout", gateway: "asaas", step: "verificacao_manual" } });
    erroMsg = erro instanceof Error ? erro.message : "Falha ao verificar pagamento.";
  }

  redirect(erroMsg ? `/pedido/${pedidoId}?erro=${encodeURIComponent(erroMsg)}` : `/pedido/${pedidoId}`);
}
