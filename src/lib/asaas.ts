// Cliente Asaas (server-only). Sem chave configurada, isAsaasConfigured=false
// e o checkout cria o pedido sem cobrança, com aviso honesto (regra 1: nunca
// simular resposta de PSP).
// Envs: ASAAS_API_KEY (obrigatória p/ cobrar), ASAAS_ENV=sandbox|production.

import * as Sentry from "@sentry/nextjs";

const clean = (v: string | undefined) => (v ?? "").replace(/^[﻿​]+/, "").trim();

const API_KEY = clean(process.env.ASAAS_API_KEY);
const BASE =
  clean(process.env.ASAAS_ENV) === "production"
    ? "https://api.asaas.com/v3"
    : "https://api-sandbox.asaas.com/v3";

export const isAsaasConfigured = API_KEY.length > 0;

// PRD 010: sem timeout, um fetch travado prendia a Server Action inteira até
// o limite da plataforma, sem cair no catch dos chamadores — o comprador via
// a página travar em vez de um erro tratado. AbortController converte isso
// em um erro normal, que finalizarCompra/gerarCobranca já sabem tratar.
const ASAAS_TIMEOUT_MS = 12_000;

async function asaas<T>(method: string, path: string, body?: unknown): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ASAAS_TIMEOUT_MS);
  let r: Response;
  try {
    r = await fetch(`${BASE}${path}`, {
      method,
      headers: {
        access_token: API_KEY,
        "Content-Type": "application/json",
        "User-Agent": "industria24h-web",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (erro) {
    // Sem resposta: o Asaas pode ter executado a operação mesmo assim.
    const incerto =
      erro instanceof Error && erro.name === "AbortError"
        ? new Error("Tempo esgotado ao comunicar com o Asaas. Tente novamente.")
        : erro instanceof Error
          ? erro
          : new Error(String(erro));
    throw Object.assign(incerto, { incerto: true });
  } finally {
    clearTimeout(timeout);
  }
  const json = await r.json().catch((erro) => {
    Sentry.captureMessage(erro instanceof Error ? erro.message : "Falha ao parsear resposta Asaas", {
      level: "warning",
      tags: { area: "checkout", gateway: "asaas" },
      extra: { status: r.status, path },
    });
    return null;
  });
  if (!r.ok) {
    const primeiroErro = (json as { errors?: { code?: string; description?: string }[] })
      ?.errors?.[0];
    const erro = new Error(primeiroErro?.description ?? `Asaas ${r.status}`) as Error & {
      asaasCode?: string;
    };
    erro.asaasCode = primeiroErro?.code;
    // 5xx não garante que nada foi gravado do lado do Asaas.
    throw Object.assign(erro, { incerto: r.status >= 500 });
  }
  return json as T;
}

/** Erro em que o Asaas pode ter executado a operação: timeout, rede ou 5xx.
 * Repetir uma escrita (ex.: PIX) nesse estado arrisca duplicar. */
export function erroAsaasIncerto(erro: unknown): boolean {
  return (erro as { incerto?: boolean } | null)?.incerto === true;
}

// Cria (ou localiza por CPF/CNPJ) o customer do comprador.
export async function ensureCustomer(opts: {
  nome: string;
  email: string;
  cpfCnpj: string;
}): Promise<string> {
  const cpf = opts.cpfCnpj.replace(/\D/g, "");
  if (cpf.length !== 11 && cpf.length !== 14) {
    throw new Error("CPF/CNPJ inválido.");
  }
  const found = await asaas<{ data: { id: string }[] }>(
    "GET",
    `/customers?cpfCnpj=${cpf}&limit=1`,
  );
  if (found.data.length > 0) return found.data[0].id;

  const created = await asaas<{ id: string }>("POST", "/customers", {
    name: opts.nome,
    email: opts.email,
    cpfCnpj: cpf,
  });
  return created.id;
}

export type Cobranca = {
  id: string;
  invoiceUrl: string;
  status: string;
};

// Cobrança única. Para PIX o QR vem de getPixQrCode e o boleto de
// getBoleto (ambos exibidos na nossa página); cartão usa o invoiceUrl
// (checkout hospedado do Asaas — cartão nunca passa pelo nosso app).
// A fatura não pode ir num iframe (X-Frame-Options: SAMEORIGIN, verificado
// 28/09/2026), então abre na mesma aba e `successUrl` traz o comprador de
// volta ao pedido após pagar.
export async function createPayment(opts: {
  customerId: string;
  billingType: "PIX" | "BOLETO" | "CREDIT_CARD";
  value: number;
  pedidoId: string;
  descricao: string;
  successUrl?: string;
}): Promise<Cobranca> {
  const due = new Date();
  due.setDate(due.getDate() + 3);
  const corpo = {
    customer: opts.customerId,
    billingType: opts.billingType,
    value: opts.value,
    dueDate: due.toISOString().slice(0, 10),
    description: opts.descricao,
    externalReference: opts.pedidoId,
  };
  if (!opts.successUrl) return asaas<Cobranca>("POST", "/payments", corpo);
  try {
    return await asaas<Cobranca>("POST", "/payments", {
      ...corpo,
      callback: { successUrl: opts.successUrl, autoRedirect: true },
    });
  } catch (erro) {
    // O Asaas só aceita callback se a conta tiver um site cadastrado (Minha
    // Conta → Informações) — e o domínio precisa bater, o que nunca vale para
    // previews. Sem isso a cobrança inteira falhava (29/09/2026); o retorno
    // automático é conveniência, cobrar não pode depender dele.
    if (!(erro instanceof Error && /dom[ií]nio/i.test(erro.message))) throw erro;
    Sentry.captureMessage("Asaas recusou callback.successUrl; cobrança criada sem retorno automático", {
      level: "warning",
      tags: { area: "checkout", gateway: "asaas" },
      extra: { motivo: erro.message },
    });
    return asaas<Cobranca>("POST", "/payments", corpo);
  }
}

// Boleto exibido na página do pedido (linha digitável + PDF), sem mandar o
// comprador para a fatura do Asaas.
export async function getBoleto(paymentId: string): Promise<{
  linhaDigitavel: string;
  pdfUrl: string | null;
}> {
  const [linha, cobranca] = await Promise.all([
    asaas<{ identificationField: string }>("GET", `/payments/${paymentId}/identificationField`),
    asaas<{ bankSlipUrl?: string | null }>("GET", `/payments/${paymentId}`),
  ]);
  return { linhaDigitavel: linha.identificationField, pdfUrl: cobranca.bankSlipUrl ?? null };
}

export async function cancelPayment(paymentId: string): Promise<void> {
  await asaas("DELETE", `/payments/${paymentId}`);
}

export type StatusPayment = {
  id: string;
  status: string;
  value: number;
  paymentDate: string | null;
};

// Consulta direta o status da cobrança na Asaas — usada como fallback quando
// o webhook (assíncrono, fora do nosso controle de entrega) não confirma o
// pagamento a tempo. Ver verificarPagamentoPedido em asaas-confirmar.ts.
export async function getPayment(paymentId: string): Promise<StatusPayment> {
  return asaas("GET", `/payments/${paymentId}`);
}

export async function getPixQrCode(paymentId: string): Promise<{
  encodedImage: string;
  payload: string;
}> {
  return asaas("GET", `/payments/${paymentId}/pixQrCode`);
}

export type TransferenciaPix = { id: string; status: string };

// Transferência PIX (repasse ao seller, disparada pela confirmação de
// entrega — migration 0111). Não é split: o valor já está na conta Asaas
// da Indústria24h desde o pagamento; isto move a fração do lojista pra
// fora. `pixAddressKeyType` usa os mesmos valores de `lojas.tipo_chave_pix`
// (CPF/CNPJ/EMAIL/PHONE, migration 0002).
export async function createPixTransfer(opts: {
  value: number;
  pixAddressKey: string;
  pixAddressKeyType: "CPF" | "CNPJ" | "EMAIL" | "PHONE";
  description: string;
  externalReference: string;
}): Promise<TransferenciaPix> {
  return asaas("POST", "/transfers", {
    value: opts.value,
    pixAddressKey: opts.pixAddressKey,
    pixAddressKeyType: opts.pixAddressKeyType,
    description: opts.description,
    externalReference: opts.externalReference,
  });
}
