// Cliente Asaas (server-only). Sem chave configurada, isAsaasConfigured=false
// e o checkout cria o pedido sem cobrança, com aviso honesto (regra 1: nunca
// simular resposta de PSP).
// Envs: ASASS_API_KEY (obrigatória p/ cobrar — nome definitivo na Vercel;
// as envs Sensitive anteriores ASAAS_API_KEY/ASAAS_API_KEY2 ficaram
// write-only ou nunca foram criadas, 2026-08-05/06), ASAAS_ENV=sandbox|production.

import * as Sentry from "@sentry/nextjs";

const clean = (v: string | undefined) => (v ?? "").replace(/^[﻿​]+/, "").trim();

const API_KEY = clean(process.env.ASASS_API_KEY);
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
    if (erro instanceof Error && erro.name === "AbortError") {
      throw new Error("Tempo esgotado ao comunicar com o Asaas. Tente novamente.");
    }
    throw erro;
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
    const desc =
      (json as { errors?: { description?: string }[] })?.errors?.[0]?.description ??
      `Asaas ${r.status}`;
    throw new Error(desc);
  }
  return json as T;
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

// Cobrança única. Para PIX o QR vem de getPixQrCode; boleto/cartão usam o
// invoiceUrl (checkout hospedado do Asaas — cartão nunca passa pelo nosso app).
export async function createPayment(opts: {
  customerId: string;
  billingType: "PIX" | "BOLETO" | "CREDIT_CARD";
  value: number;
  pedidoId: string;
  descricao: string;
}): Promise<Cobranca> {
  const due = new Date();
  due.setDate(due.getDate() + 3);
  return asaas<Cobranca>("POST", "/payments", {
    customer: opts.customerId,
    billingType: opts.billingType,
    value: opts.value,
    dueDate: due.toISOString().slice(0, 10),
    description: opts.descricao,
    externalReference: opts.pedidoId,
  });
}

export async function cancelPayment(paymentId: string): Promise<void> {
  await asaas("DELETE", `/payments/${paymentId}`);
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
