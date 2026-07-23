"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { checarLimite } from "@/lib/rate-limit";

export type ColetivaState = { ok: boolean; error?: string };

// Cria uma compra coletiva (RPC valida faixa/estoque no banco) e leva o
// criador para a página da coletiva, de onde ele compartilha o convite.
export async function criarColetiva(
  _prev: ColetivaState,
  formData: FormData,
): Promise<ColetivaState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/produto/${String(formData.get("produto_id") ?? "")}`);

  if (!checarLimite(`coletiva:${user.id}`, 5, 60_000)) {
    return { ok: false, error: "Muitas tentativas seguidas. Aguarde um minuto." };
  }

  const { data: id, error } = await supabase.rpc("coletiva_criar", {
    p_produto_id: String(formData.get("produto_id") ?? ""),
    p_quantidade: Number(formData.get("quantidade") ?? 0),
  });
  if (error || !id) {
    return { ok: false, error: error?.message ?? "Não foi possível criar a coletiva." };
  }
  redirect(`/coletiva/${id}`);
}

// Entra numa coletiva. Se a meta for atingida nesta chamada, a RPC cria os
// pedidos de todos os participantes e devolve o do chamador — vai direto
// pagar em /pedido/[id].
export async function participarColetiva(
  _prev: ColetivaState,
  formData: FormData,
): Promise<ColetivaState> {
  const coletivaId = String(formData.get("coletiva_id") ?? "");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/coletiva/${coletivaId}`);

  if (!checarLimite(`coletiva:${user.id}`, 5, 60_000)) {
    return { ok: false, error: "Muitas tentativas seguidas. Aguarde um minuto." };
  }

  const { data, error } = await supabase.rpc("coletiva_participar", {
    p_coletiva_id: coletivaId,
    p_quantidade: Number(formData.get("quantidade") ?? 0),
  });
  if (error) return { ok: false, error: error.message };

  const resultado = data as { status?: string; pedido_id?: string | null } | null;
  if (resultado?.pedido_id) redirect(`/pedido/${resultado.pedido_id}?novo=1`);
  redirect(`/coletiva/${coletivaId}`);
}
