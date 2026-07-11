import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { SUPABASE_URL } from "./env";

// Client com service role — SÓ para código de servidor que precisa passar
// pelos guards de campos financeiros (trigger 0012): gravação da cobrança
// Asaas no pedido e confirmação de pagamento via webhook. Nunca importar
// em componente/página; nunca expor a chave.
const clean = (v: string | undefined) => (v ?? "").replace(/^[﻿​]+/, "").trim();
const SERVICE_KEY = clean(process.env.SUPABASE_SERVICE_ROLE_KEY);

export const isServiceConfigured = SERVICE_KEY.length > 0;

export function createServiceClient() {
  if (!isServiceConfigured) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY não configurada no servidor.");
  }
  return createSupabaseClient<Database>(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
