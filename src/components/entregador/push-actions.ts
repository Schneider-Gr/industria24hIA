"use server";

import { createClient } from "@/lib/supabase/server";

export type InscricaoPush = { endpoint: string; keys: { p256dh: string; auth: string } };

// Guarda a inscrição de push deste aparelho para o usuário logado (0216).
export async function inscreverPush(i: InscricaoPush): Promise<{ ok: boolean; erro?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc(
    "push_inscrever" as never,
    { p_endpoint: i?.endpoint ?? "", p_p256dh: i?.keys?.p256dh ?? "", p_auth: i?.keys?.auth ?? "" } as never,
  );
  return error ? { ok: false, erro: error.message } : { ok: true };
}

export async function desinscreverPush(endpoint: string): Promise<void> {
  const supabase = await createClient();
  await supabase.rpc("push_desinscrever" as never, { p_endpoint: endpoint } as never);
}
