"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { checarLimite } from "@/lib/rate-limit";
import { criarColetivaSchema, participarColetivaSchema } from "@/lib/coletiva/schemas";

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

  // Entrega conjunta (regra 0076 com frete_conjunto): a coletiva tem UM
  // destino, definido por quem cria — é o que torna o frete rateável.
  const cep = String(formData.get("entrega_cep") ?? "").trim();
  const entrega = cep
    ? {
        cep,
        rua: String(formData.get("entrega_rua") ?? "").trim(),
        numero: String(formData.get("entrega_numero") ?? "").trim(),
        bairro: String(formData.get("entrega_bairro") ?? "").trim(),
        cidade: String(formData.get("entrega_cidade") ?? "").trim(),
        complemento: String(formData.get("entrega_complemento") ?? "").trim(),
      }
    : null;

  const parse = criarColetivaSchema.safeParse({
    produto_id: String(formData.get("produto_id") ?? ""),
    quantidade: Number(formData.get("quantidade") ?? 0),
    entrega,
  });
  if (!parse.success) {
    return { ok: false, error: parse.error.issues[0]?.message ?? "Dados inválidos." };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- assinatura nova (0077) fora dos tipos gerados
  const { data: id, error } = await (supabase.rpc as any)("coletiva_criar", {
    p_produto_id: parse.data.produto_id,
    p_quantidade: parse.data.quantidade,
    p_prazo_dias: null,
    p_entrega: parse.data.entrega,
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

  const parse = participarColetivaSchema.safeParse({
    coletiva_id: coletivaId,
    quantidade: Number(formData.get("quantidade") ?? 0),
  });
  if (!parse.success) {
    return { ok: false, error: parse.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { data, error } = await supabase.rpc("coletiva_participar", {
    p_coletiva_id: parse.data.coletiva_id,
    p_quantidade: parse.data.quantidade,
  });
  if (error) return { ok: false, error: error.message };

  const resultado = data as { status?: string; pedido_id?: string | null } | null;
  if (resultado?.pedido_id) redirect(`/pedido/${resultado.pedido_id}?novo=1`);
  redirect(`/coletiva/${coletivaId}`);
}
