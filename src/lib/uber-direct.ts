// Cliente Uber Direct (server-only). Sem credenciais configuradas,
// isUberDirectConfigured=false e o fallback de frete fica desligado sem
// quebrar o checkout (mesmo padrão de isAsaasConfigured em asaas.ts).
// Envs: UBER_DIRECT_CUSTOMER_ID, UBER_DIRECT_CLIENT_ID, UBER_DIRECT_CLIENT_SECRET.
// Sandbox vs produção é decidido por QUAL client_id/secret está configurado
// (painel Uber Direct tem toggle "credenciais de teste/produção") — não por
// URL diferente. Ver PRD 008 (docs/prds/008-frete-uber-direct-fallback.md).

import * as Sentry from "@sentry/nextjs";

const clean = (v: string | undefined) => (v ?? "").replace(/^[﻿​]+/, "").trim();

const CUSTOMER_ID = clean(process.env.UBER_DIRECT_CUSTOMER_ID);
const CLIENT_ID = clean(process.env.UBER_DIRECT_CLIENT_ID);
const CLIENT_SECRET = clean(process.env.UBER_DIRECT_CLIENT_SECRET);

export const isUberDirectConfigured =
  CUSTOMER_ID.length > 0 && CLIENT_ID.length > 0 && CLIENT_SECRET.length > 0;

const AUTH_URL = "https://auth.uber.com/oauth/v2/token";
const API_BASE = "https://api.uber.com/v1";

// Token client_credentials válido por ~30 dias (doc oficial) — cache em
// memória do processo. Serverless recicla a instância entre invocações,
// então isso economiza a maioria das chamadas sem precisar de storage extra.
let tokenCache: { token: string; expiraEm: number } | null = null;

async function obterToken(): Promise<string> {
  if (tokenCache && tokenCache.expiraEm > Date.now()) return tokenCache.token;

  const r = await fetch(AUTH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: "client_credentials",
      scope: "eats.deliveries",
    }),
  });
  const json = (await r.json().catch(() => null)) as
    | { access_token?: string; expires_in?: number }
    | null;
  if (!r.ok || !json?.access_token) {
    throw new Error(`Uber Direct auth ${r.status}: falha ao obter token`);
  }

  tokenCache = {
    token: json.access_token,
    // margem de 5 min antes de expirar de verdade
    expiraEm: Date.now() + (json.expires_in ?? 2592000) * 1000 - 5 * 60 * 1000,
  };
  return tokenCache.token;
}

async function uberDirect<T>(path: string, body: unknown): Promise<T> {
  const token = await obterToken();
  const r = await fetch(`${API_BASE}/customers/${CUSTOMER_ID}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const json = await r.json().catch((erro) => {
    Sentry.captureMessage(erro instanceof Error ? erro.message : "Falha ao parsear resposta Uber Direct", {
      level: "warning",
      tags: { area: "logistica", gateway: "uber_direct" },
      extra: { status: r.status, path },
    });
    return null;
  });
  if (!r.ok) {
    const msg = (json as { message?: string })?.message ?? `Uber Direct ${r.status}`;
    throw new Error(msg);
  }
  return json as T;
}

export type EnderecoUberDirect = {
  rua: string;
  numero: string;
  bairro?: string;
  cidade: string;
  uf: string;
  cep: string;
  complemento?: string;
};

// Uber Direct aceita endereço como string única "unstructured" (mais simples
// e robusto que o formato JSON estruturado deles, que exige campos que nosso
// cadastro de loja não garante 1:1 — ver risco no PRD 008 §7).
function formatarEndereco(e: EnderecoUberDirect): string {
  const partes = [
    `${e.rua}, ${e.numero}`,
    e.complemento,
    e.bairro,
    e.cidade,
    e.uf,
    e.cep,
    "Brasil",
  ].filter(Boolean);
  return partes.join(", ");
}

export type CotacaoUberDirect = {
  id: string;
  feeCentavos: number;
  duracaoMin: number;
  expiraEm: string;
};

export async function cotarEntrega(opts: {
  origem: EnderecoUberDirect;
  destino: EnderecoUberDirect;
}): Promise<CotacaoUberDirect> {
  const resp = await uberDirect<{
    id: string;
    fee: number;
    duration: number;
    expires: string;
  }>("/delivery_quotes", {
    pickup_address: formatarEndereco(opts.origem),
    dropoff_address: formatarEndereco(opts.destino),
  });
  return {
    id: resp.id,
    feeCentavos: resp.fee,
    duracaoMin: resp.duration,
    expiraEm: resp.expires,
  };
}

export type EntregaUberDirect = {
  id: string;
  status: string;
  trackingUrl: string;
};

export async function criarEntrega(opts: {
  quoteId: string;
  origem: EnderecoUberDirect;
  origemNomeContato: string;
  origemTelefone: string;
  destino: EnderecoUberDirect;
  destinoNomeContato: string;
  destinoTelefone: string;
  manifestoDescricao: string;
  pedidoId: string;
}): Promise<EntregaUberDirect> {
  const resp = await uberDirect<{
    id: string;
    status: string;
    tracking_url: string;
  }>("/deliveries", {
    quote_id: opts.quoteId,
    pickup_address: formatarEndereco(opts.origem),
    pickup_name: opts.origemNomeContato,
    pickup_phone_number: opts.origemTelefone,
    dropoff_address: formatarEndereco(opts.destino),
    dropoff_name: opts.destinoNomeContato,
    dropoff_phone_number: opts.destinoTelefone,
    manifest_items: [{ name: opts.manifestoDescricao, quantity: 1 }],
    external_id: opts.pedidoId,
  });
  return { id: resp.id, status: resp.status, trackingUrl: resp.tracking_url };
}
