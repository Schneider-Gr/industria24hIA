"use server";

import { redirect } from "next/navigation";
import * as Sentry from "@sentry/nextjs";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient, isServiceConfigured } from "@/lib/supabase/service";
import { ensureCustomer, createPayment, cancelPayment, isAsaasConfigured } from "@/lib/asaas";
import { setSentryUserContext } from "@/lib/sentry-context";

export type CheckoutState = { ok: boolean; error?: string };

// Finaliza a compra: RPC valida preços/estoque no banco e cria o pedido;
// depois (se Asaas configurado) cria o customer + cobrança e grava no pedido
// via service role (trigger 0012 bloqueia update financeiro por usuário).
// Falha no Asaas NÃO desfaz o pedido: a página do pedido oferece re-tentar.
export async function finalizarCompra(
  _prev: CheckoutState,
  formData: FormData,
): Promise<CheckoutState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Faça login para finalizar a compra." };
  setSentryUserContext(user.id);

  let itens: { produto_id: string; quantidade: number; venda_futura_id?: string | null }[];
  try {
    itens = JSON.parse(String(formData.get("itens") ?? "[]"));
  } catch {
    return { ok: false, error: "Carrinho inválido." };
  }

  const tipo = String(formData.get("tipo_entrega") ?? "retirada");
  const entrega =
    tipo === "retirada"
      ? { tipo: "retirada" }
      : {
          tipo: "entrega",
          cep: String(formData.get("cep") ?? ""),
          rua: String(formData.get("rua") ?? ""),
          numero: String(formData.get("numero") ?? ""),
          bairro: String(formData.get("bairro") ?? ""),
          cidade: String(formData.get("cidade") ?? ""),
          complemento: String(formData.get("complemento") ?? ""),
        };
  const billingType = String(formData.get("forma_pagamento") ?? "PIX") as
    | "PIX"
    | "BOLETO"
    | "CREDIT_CARD";
  const cpfCnpj = String(formData.get("cpf_cnpj") ?? "").replace(/\D/g, "");
  const nome = String(formData.get("nome") ?? "").trim();

  if (isAsaasConfigured) {
    if (cpfCnpj.length !== 11 && cpfCnpj.length !== 14) {
      return { ok: false, error: "Informe um CPF ou CNPJ válido." };
    }
    if (!nome) return { ok: false, error: "Informe seu nome completo." };
  }

  const { data: pedidoId, error } = await Sentry.startSpan(
    { name: "checkout.criar_pedido", op: "db.rpc" },
    () =>
      supabase.rpc("checkout_criar_pedido", {
        itens,
        entrega,
        forma_pagamento: billingType,
      }),
  );
  if (error || !pedidoId) {
    if (error?.message?.includes("Estoque insuficiente")) {
      Sentry.captureMessage(error.message, {
        level: "warning",
        tags: { area: "estoque", signal: "estoque_insuficiente" },
      });
    }
    return { ok: false, error: error?.message ?? "Não foi possível criar o pedido." };
  }
  Sentry.addBreadcrumb({ category: "checkout", message: "Pedido criado", level: "info" });

  // Cobrança Asaas (best-effort: pedido já existe; retry na página do pedido)
  if (isAsaasConfigured && isServiceConfigured) {
    try {
      await criarCobrancaPedido(pedidoId, user.id, user.email ?? "", nome, cpfCnpj);
      Sentry.addBreadcrumb({
        category: "checkout",
        message: "Cobrança Asaas criada",
        level: "info",
      });
    } catch (erro) {
      // página do pedido mostra "cobrança pendente" + botão re-tentar
      Sentry.captureException(erro, { tags: { area: "checkout", gateway: "asaas" } });
    }
  }

  redirect(`/pedido/${pedidoId}?novo=1`);
}

async function criarCobrancaPedido(
  pedidoId: string,
  userId: string,
  email: string,
  nome: string,
  cpfCnpj: string,
) {
  const svc = createServiceClient();

  const { data: cliente } = await svc
    .from("asaas_clientes")
    .select("customer_id")
    .eq("user_id", userId)
    .maybeSingle();

  let customerId = cliente?.customer_id;
  if (!customerId) {
    customerId = await ensureCustomer({ nome, email, cpfCnpj });
    await svc
      .from("asaas_clientes")
      .upsert({ user_id: userId, customer_id: customerId, cpf_cnpj: cpfCnpj });
  }

  const { data: pedido } = await svc
    .from("pedidos")
    .select("id, id_venda, valor_pedido, forma_pagamento, asaas_cobranca_id")
    .eq("id", pedidoId)
    .single();
  if (!pedido || pedido.asaas_cobranca_id) return;

  const cobranca = await createPayment({
    customerId,
    billingType: (pedido.forma_pagamento ?? "PIX") as "PIX" | "BOLETO" | "CREDIT_CARD",
    value: Number(pedido.valor_pedido),
    pedidoId: pedido.id,
    descricao: `Pedido ${pedido.id_venda} — Indústria 24h`,
  });

  // update condicional: se outro submit concorrente já gravou uma cobrança
  // entre o SELECT acima e aqui, esta linha não muda nada (count=0) — cancela
  // a cobrança recém-criada no Asaas em vez de deixar duas vivas.
  const { data: gravado } = await svc
    .from("pedidos")
    .update({ asaas_cobranca_id: cobranca.id, link_cobranca: cobranca.invoiceUrl })
    .eq("id", pedido.id)
    .is("asaas_cobranca_id", null)
    .select("id");

  if (!gravado || gravado.length === 0) {
    await cancelPayment(cobranca.id).catch((erro) => {
      Sentry.captureException(erro, {
        tags: { area: "checkout", gateway: "asaas", signal: "possible_ghost_charge" },
        extra: { cobrancaId: cobranca.id, pedidoId: pedido.id },
      });
    });
  }
}

// Re-tentativa de cobrança pela página do pedido (dono do pedido apenas).
export async function gerarCobranca(formData: FormData): Promise<void> {
  const pedidoId = String(formData.get("pedido_id") ?? "");
  const cpfCnpj = String(formData.get("cpf_cnpj") ?? "").replace(/\D/g, "");
  const nome = String(formData.get("nome") ?? "").trim();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Faça login.");

  // view: só devolve o pedido se for do próprio comprador (0025)
  const { data: pedido } = await supabase
    .from("pedidos_cliente")
    .select("id")
    .eq("id", pedidoId)
    .maybeSingle();
  if (!pedido) throw new Error("Pedido não encontrado.");

  if (cpfCnpj.length !== 11 && cpfCnpj.length !== 14) {
    throw new Error("Informe um CPF ou CNPJ válido.");
  }
  if (!nome) throw new Error("Informe seu nome completo.");

  if (!isAsaasConfigured || !isServiceConfigured) {
    throw new Error("Pagamento ainda não configurado nesta instalação.");
  }
  await criarCobrancaPedido(pedidoId, user.id, user.email ?? "", nome, cpfCnpj);
  redirect(`/pedido/${pedidoId}`);
}
