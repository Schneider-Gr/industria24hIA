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

async function asaas<T>(method: string, path: string, body?: unknown): Promise<T> {
  const r = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      access_token: API_KEY,
      "Content-Type": "application/json",
      "User-Agent": "industria24h-web",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
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

export type Transferencia = {
  id: string;
  status: string;
};

// Transferência PIX de repasse (docs/e4-split-repasse-bpmn.md, Processo 2):
// dinheiro sai da conta Asaas da plataforma para a chave PIX do seller/afiliado.
// externalReference = repasses.id para reconciliação no extrato Asaas.
export async function createPixTransfer(opts: {
  value: number;
  pixAddressKey: string;
  pixAddressKeyType: "CPF" | "CNPJ" | "EMAIL" | "PHONE";
  description: string;
  repasseId: string;
}): Promise<Transferencia> {
  return asaas<Transferencia>("POST", "/transfers", {
    value: opts.value,
    operationType: "PIX",
    pixAddressKey: opts.pixAddressKey,
    pixAddressKeyType: opts.pixAddressKeyType,
    description: opts.description,
    externalReference: opts.repasseId,
  });
}
