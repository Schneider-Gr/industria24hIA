import { createClient } from "@supabase/supabase-js";

// Cliente por comprador: usa a ANON key + o access token da SESSÃO DELE
// (não service_role) para que checkout_criar_pedido rode com o mesmo
// auth.uid()/RLS do checkout web — o agente nunca compra "como plataforma",
// só repassa uma sessão que o comprador já autenticou em outro lugar.
const clean = (v: string | undefined) => (v ?? "").replace(/^[﻿​]+/, "").trim();
const url = clean(process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL);
const anonKey = clean(process.env.SUPABASE_ANON_KEY);

export const isCheckoutConfigured = Boolean(url && anonKey);

export function criarClienteComprador(accessToken: string) {
  if (!isCheckoutConfigured) {
    throw new Error("SUPABASE_ANON_KEY não configurada no servidor MCP.");
  }
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}
