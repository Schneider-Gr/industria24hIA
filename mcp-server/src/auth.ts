import crypto from "node:crypto";
import { supabase } from "./supabase.js";

export type Escopo = "read" | "write";

export interface AuthContext {
  keyId: string;
  lojaId: string;
  escopo: Escopo;
}

// O token do parceiro nunca é guardado em claro: comparamos o SHA-256.
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token.trim()).digest("hex");
}

// Valida o Bearer contra api_keys (RPC security definer). Devolve o contexto de
// escopo/loja ou null. Um token de escopo 'write' também satisfaz 'read'.
export async function autenticar(
  bearer: string | undefined,
  escopoMinimo: Escopo
): Promise<AuthContext | null> {
  if (!bearer) return null;
  const token = bearer.replace(/^Bearer\s+/i, "").trim();
  if (!token.startsWith("i24_")) return null;

  const { data, error } = await supabase.rpc("api_validar_token", {
    p_token_hash: hashToken(token),
    p_escopo: escopoMinimo,
  });
  if (error || !data || data.length === 0) return null;

  const row = data[0] as { key_id: string; loja_id: string; escopo: Escopo };
  return { keyId: row.key_id, lojaId: row.loja_id, escopo: row.escopo };
}

export async function registrarUso(
  ctx: AuthContext,
  tool: string,
  params: unknown,
  ok: boolean,
  erro: string | null,
  ip: string | null
): Promise<void> {
  await supabase.rpc("api_registrar_uso", {
    p_key_id: ctx.keyId,
    p_loja_id: ctx.lojaId,
    p_tool: tool,
    p_params: params ?? null,
    p_ok: ok,
    p_erro: erro,
    p_ip: ip,
  });
}
