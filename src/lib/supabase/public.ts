import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./env";

// Client anon SEM cookies — para páginas de vitrine 100% públicas
// (loja/produto/categoria). Não chama cookies(), então a rota pode
// usar `export const revalidate` (ISR) de verdade; o client de
// src/lib/supabase/server.ts força renderização dinâmica por request.
// RLS continua valendo (é a mesma anon key) — só não carrega sessão de usuário.
export function createPublicClient() {
  return createSupabaseClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
