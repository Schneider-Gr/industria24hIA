import { createClient } from "@supabase/supabase-js";

// service_role fica SÓ aqui, no servidor. Nunca sai para o parceiro — o parceiro
// só tem o token i24_ dele, que é validado contra api_keys via RPC.
const clean = (v: string | undefined) => (v ?? "").replace(/^[﻿​]+/, "").trim();

const url = clean(process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL);
const key = clean(process.env.SUPABASE_SERVICE_ROLE_KEY);

if (!url || !key) {
  console.error("Faltam envs SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

export const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});
