"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { REF_COOKIE } from "@/components/vitrine/CapturaRef";
import * as Sentry from "@sentry/nextjs";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient, isServiceConfigured } from "@/lib/supabase/service";
import { ensureCustomer, createPayment, cancelPayment, isAsaasConfigured } from "@/lib/asaas";
import { setSentryUserContext } from "@/lib/sentry-context";
import { checarLimite } from "@/lib/rate-limit";
import { itensCarrinhoSchema, fretePorLojaSchema, billingTypeSchema, cpfCnpjSchema } from "@/lib/checkout/schemas";

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

  // 5 tentativas de finalizar compra por minuto: bloqueia script batendo
  // finalizarCompra em loop sem travar um comprador legítimo re-tentando.
  if (!checarLimite(`checkout:${user.id}`, 5, 60_000)) {
    Sentry.captureMessage("Rate limit: checkout", {
      level: "warning",
      tags: { area: "checkout", signal: "rate_limit" },
    });
    return { ok: false, error: "Muitas tentativas seguidas. Aguarde um minuto e tente de novo." };
  }

  let itensBrutos: unknown;
  try {
    itensBrutos = JSON.parse(String(formData.get("itens") ?? "[]"));
  } catch {
    return { ok: false, error: "Carrinho inválido." };
  }
  const itensParse = itensCarrinhoSchema.safeParse(itensBrutos);
  if (!itensParse.success) {
    return { ok: false, error: itensParse.error.issues[0]?.message ?? "Carrinho inválido." };
  }
  const itens = itensParse.data;

  // Cada loja vira um pedido próprio (redesign 2026-07-29) — o schema
  // (`pedidos.loja_id` FK not null) nunca suportou pedido multi-vendedor.
  const grupos = new Map<string, typeof itens>();
  for (const item of itens) {
    const grupo = grupos.get(item.loja_id);
    if (grupo) grupo.push(item);
    else grupos.set(item.loja_id, [item]);
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
  // Frete por loja (PRD 008, Milestone 1): cada grupo (loja) pode ter uma
  // transportadora/cotação diferente — gravado pelo checkout client em
  // page.tsx como JSON keyed por loja_id.
  let fretePorLojaBruto: unknown;
  try {
    fretePorLojaBruto = JSON.parse(String(formData.get("frete_por_loja") ?? "{}"));
  } catch {
    fretePorLojaBruto = {};
  }
  const fretePorLojaParse = fretePorLojaSchema.safeParse(fretePorLojaBruto);
  const fretePorLoja = fretePorLojaParse.success ? fretePorLojaParse.data : {};

  const billingTypeParse = billingTypeSchema.safeParse(formData.get("forma_pagamento") ?? "PIX");
  if (!billingTypeParse.success) {
    return { ok: false, error: "Forma de pagamento inválida." };
  }
  const billingType = billingTypeParse.data;
  const cpfCnpj = String(formData.get("cpf_cnpj") ?? "").replace(/\D/g, "");
  const nome = String(formData.get("nome") ?? "").trim();

  if (isAsaasConfigured) {
    const cpfCnpjParse = cpfCnpjSchema.safeParse(cpfCnpj);
    if (!cpfCnpjParse.success) {
      return { ok: false, error: "Informe um CPF ou CNPJ válido." };
    }
    if (!nome) return { ok: false, error: "Informe seu nome completo." };
  }

  // Gate B2B do Mercado Futuro (docs/e5-seller-onboarding-b2b-auditoria.md):
  // se o carrinho tem item de venda futura, grava o perfil PJ ANTES do
  // checkout — a RPC checkout_criar_pedido rejeita sem isso, mas gravar
  // aqui evita depender só da mensagem de erro do banco.
  const temVendaFutura = itens.some((i) => i.venda_futura_id);
  // Versão vigente dos Termos do Mercado Futuro (atualizado_em da página CMS),
  // carimbada no pedido após a criação (via RPC carimbar_aceite_mf).
  if (temVendaFutura) {
    const documentoTipo = String(formData.get("documento_tipo") ?? "");
    const documentoPj = String(formData.get("documento_pj") ?? "").trim();
    const produtorRural = formData.get("produtor_rural") === "on";
    const razaoSocial = String(formData.get("razao_social") ?? "").trim() || null;

    if (!documentoTipo || !documentoPj) {
      return {
        ok: false,
        error: "Compra no Mercado Futuro exige CNPJ ou Inscrição Estadual de produtor rural.",
      };
    }
    if (formData.get("aceite_termos_mf") !== "on") {
      return {
        ok: false,
        error: "É necessário aceitar os Termos de Compra do Mercado Futuro.",
      };
    }
    const { error: perfilError } = await supabase.rpc("salvar_perfil_comprador_pj", {
      p_tipo_documento: documentoTipo,
      p_documento: documentoPj,
      p_produtor_rural: produtorRural,
      // RPC aceita SQL NULL (sem NOT NULL na coluna); o gerador de tipos não expressa isso.
      p_razao_social: razaoSocial as string,
    });
    if (perfilError) {
      return { ok: false, error: perfilError.message };
    }
  }

  // Item perecível (PRD 010): revalida no servidor, não confia no client.
  const produtoIds = [...new Set(itens.map((i) => i.produto_id))];
  const { data: produtosCarrinho } = await supabase
    .from("produtos")
    .select("id, perecivel")
    .in("id", produtoIds);
  const temPerecivel = (produtosCarrinho ?? []).some((p) => p.perecivel);
  if (temPerecivel && formData.get("aceite_termos_pereciveis") !== "on") {
    return {
      ok: false,
      error: "É necessário aceitar os Termos de Produtos Perecíveis.",
    };
  }

  // ?ref= do link do afiliado, gravado em cookie na página de produto.
  const refAfiliado =
    decodeURIComponent((await cookies()).get(REF_COOKIE)?.value ?? "").trim() || null;

  // Frete consolidado (0074): 30% de desconto, pedido aguarda lote de rota.
  // Só vale para entrega — retirada não tem frete.
  const freteConsolidado = tipo === "entrega" && formData.get("frete_consolidado") === "on";

  const telefone = String(formData.get("telefone") ?? "").replace(/\D/g, "");
  const pedidoIds: string[] = [];

  for (const [lojaId, itensDaLoja] of grupos.entries()) {
    const freteLoja = fretePorLoja[lojaId];
    // transportadora_id e cotacao_externa_id (PRD 008) viajam DENTRO de
    // `entrega` (não como parâmetro novo do RPC): checkout_criar_pedido tem
    // uma cadeia de overloads por aridade (3→4→5→6 args, ver 0065/0074/0107/
    // 0119) onde cada wrapper repassa `entrega` intacto pro de baixo — um
    // parâmetro novo exigiria replicar em toda a cadeia e arriscaria colisão
    // de tipo entre overloads (ver comentário da 0107).
    const entregaComTransportadora =
      tipo === "entrega" && freteLoja?.transportadora_id
        ? {
            ...entrega,
            transportadora_id: freteLoja.transportadora_id,
            cotacao_externa_id: freteLoja.cotacao_uber_direct_id ?? null,
          }
        : entrega;
    const { data: pedidoId, error } = await Sentry.startSpan(
      { name: "checkout.criar_pedido", op: "db.rpc" },
      () =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- assinatura 0140 fora dos tipos gerados
        (supabase as any).rpc("checkout_criar_pedido", {
          itens: itensDaLoja.map(({ produto_id, quantidade, venda_futura_id }) => ({
            produto_id,
            quantidade,
            venda_futura_id,
          })),
          entrega: entregaComTransportadora,
          forma_pagamento: billingType,
          // Link do afiliado (?ref=) capturado na página de produto: sem ele o
          // banco escolhe a afiliação mais recente, ignorando quem divulgou.
          ref: refAfiliado,
          frete_consolidado: freteConsolidado,
          // 0107: grava pedidos.cliente_nome, lido em vários painéis
          // admin/seller mas nunca preenchido até então.
          cliente_nome: nome || null,
        }),
    );
    if (error || !pedidoId) {
      if (error?.message?.includes("Estoque insuficiente")) {
        Sentry.captureMessage(error.message, {
          level: "warning",
          tags: { area: "estoque", signal: "estoque_insuficiente" },
        });
      }
      // Alguns pedidos já podem ter sido criados nesta mesma submissão — o
      // comprador vê o erro e pode re-tentar; os pedidos já criados ficam
      // visíveis em /pedido/{id} (não há rollback entre lojas independentes).
      return {
        ok: false,
        error:
          (error?.message ?? "Não foi possível criar o pedido.") +
          (pedidoIds.length > 0
            ? ` (${pedidoIds.length} pedido(s) de outra(s) loja(s) já foram criados)`
            : ""),
      };
    }
    Sentry.addBreadcrumb({ category: "checkout", message: "Pedido criado", level: "info" });
    pedidoIds.push(pedidoId);

    // WhatsApp de contato do pedido (0073): usado no disparo do código de
    // retirada quando o pagamento confirmar. Best-effort: falha não desfaz
    // o pedido (o comprador ainda vê o código na página do pedido).
    if (telefone) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- RPC 0073 fora dos tipos gerados
      const { error: contatoError } = await (supabase as any).rpc("pedido_registrar_contato", {
        p_pedido_id: pedidoId,
        p_telefone: telefone,
      });
      if (contatoError) {
        Sentry.captureException(contatoError, {
          tags: { area: "checkout", signal: "telefone_contato" },
        });
      }
    }

    // Carimba o aceite dos Termos do Mercado Futuro no pedido (prova por
    // transação). RPC SECURITY DEFINER: grava como owner sem depender do service
    // role (desligado em prod) nem esbarrar nas policies de pedidos (só seller/
    // admin). Best-effort: falha aqui não desfaz o pedido já criado.
    if (itensDaLoja.some((i) => i.venda_futura_id)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- RPC 0062 fora dos tipos gerados
      const { error: carimboError } = await (supabase as any).rpc("carimbar_aceite_mf", {
        p_pedido_id: pedidoId,
      });
      if (carimboError) {
        Sentry.captureException(carimboError, {
          tags: { area: "checkout", signal: "aceite_termos_mf" },
        });
      }
    }

    // Carimba o aceite dos Termos de Produtos Perecíveis (PRD 010 US02),
    // mesmo padrão do carimbo do Mercado Futuro acima.
    if (temPerecivel) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- RPC 0106 fora dos tipos gerados
      const { error: carimboPereciveisError } = await (supabase as any).rpc(
        "carimbar_aceite_pereciveis",
        { p_pedido_id: pedidoId },
      );
      if (carimboPereciveisError) {
        Sentry.captureException(carimboPereciveisError, {
          tags: { area: "checkout", signal: "aceite_termos_pereciveis" },
        });
      }
    }

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
  }

  // Compra concluída: apaga o espelho server-side do carrinho abandonado
  // (best-effort — o localStorage já é limpo no client após o redirect).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- tabela 0094 fora dos tipos gerados
  await (supabase as any).from("carrinhos_abandonados").delete().eq("user_id", user.id);

  redirect(
    pedidoIds.length === 1
      ? `/pedido/${pedidoIds[0]}?novo=1`
      : `/pedido/confirmacao?ids=${pedidoIds.join(",")}`,
  );
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

  const dadosCobranca = {
    billingType: (pedido.forma_pagamento ?? "PIX") as "PIX" | "BOLETO" | "CREDIT_CARD",
    value: Number(pedido.valor_pedido),
    pedidoId: pedido.id,
    descricao: `Pedido ${pedido.id_venda} — Indústria 24h`,
  };

  let cobranca;
  try {
    cobranca = await createPayment({ customerId, ...dadosCobranca });
  } catch (erro) {
    // customer_id cacheado pode ter ficado órfão de uma conta/chave Asaas
    // anterior (ex.: rotação de ASAAS_API_KEY) — recria o customer uma vez.
    if ((erro as { asaasCode?: string }).asaasCode !== "invalid_customer") throw erro;
    customerId = await ensureCustomer({ nome, email, cpfCnpj });
    await svc.from("asaas_clientes").upsert({ user_id: userId, customer_id: customerId, cpf_cnpj: cpfCnpj });
    cobranca = await createPayment({ customerId, ...dadosCobranca });
  }

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
// PRD 010: antes, erro/timeout do Asaas subia cru pro global-error (o
// comprador via "Algo deu errado" genérico, sem poder re-tentar direto) —
// agora vira ?erro= na própria página, mesmo padrão de finalizarCompra.
export async function gerarCobranca(formData: FormData): Promise<void> {
  const pedidoId = String(formData.get("pedido_id") ?? "");

  // PRD 010 US03: sem isso, cliques repetidos durante uma tentativa em
  // andamento (ex.: comprador re-clicando por não ver resposta) podiam
  // disparar chamadas concorrentes ao Asaas para o mesmo pedido.
  if (!checarLimite(`gerar-cobranca:${pedidoId}`, 1, 15_000)) {
    redirect(
      `/pedido/${pedidoId}?erro=${encodeURIComponent("Já existe uma tentativa em andamento. Aguarde alguns segundos.")}`,
    );
  }

  const cpfCnpj = String(formData.get("cpf_cnpj") ?? "").replace(/\D/g, "");
  const nome = String(formData.get("nome") ?? "").trim();

  try {
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
  } catch (erro) {
    Sentry.captureException(erro, { tags: { area: "checkout", gateway: "asaas", step: "retry" } });
    const msg = erro instanceof Error ? erro.message : "Falha ao gerar cobrança.";
    redirect(`/pedido/${pedidoId}?erro=${encodeURIComponent(msg)}`);
  }
  redirect(`/pedido/${pedidoId}`);
}
