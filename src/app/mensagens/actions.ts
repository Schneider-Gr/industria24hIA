"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Chat comprador↔vendedor (MPDD-15). Validação de participante é feita no
// servidor além da RLS (defesa em profundidade — lição do bug getMinhaLoja).

// Só libera contato direto após pedido pago (evita chat pré-venda/spam;
// negociação de preço acontece pelos mecanismos já existentes — faixas de
// desconto, leilão). RPC 0114 roda como owner: evita join views×tabela sem
// relação PostgREST configurada.
export async function podeFalarComVendedor(lojaId: string, produtoId?: string | null) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- RPC 0114 fora dos tipos gerados
  const { data } = await (supabase as any).rpc("comprador_tem_pedido_pago", {
    p_loja_id: lojaId,
    p_produto_id: produtoId ?? null,
  });
  return data === true;
}

// Cria (ou reaproveita) a conversa comprador×loja×produto e leva para a thread.
export async function iniciarConversa(formData: FormData) {
  const lojaId = formData.get("loja_id");
  const produtoIdRaw = formData.get("produto_id");
  if (!lojaId || typeof lojaId !== "string") throw new Error("Loja inválida.");
  const produtoId =
    typeof produtoIdRaw === "string" && produtoIdRaw.length > 0 ? produtoIdRaw : null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(produtoId ? `/produto/${produtoId}` : `/loja/${lojaId}`)}`);

  // Loja precisa existir e não ser do próprio usuário. Via RPC (0113): a
  // tabela `lojas` só é legível pelo dono/admin desde a 0012, então um
  // select direto aqui nunca encontra a linha para o comprador comum.
  const { data: checagem } = await (
    supabase as unknown as {
      rpc(
        fn: "loja_existe_e_e_dono",
        args: { p_loja_id: string },
      ): Promise<{ data: { existe: boolean; eh_dono: boolean }[] | null }>;
    }
  ).rpc("loja_existe_e_e_dono", { p_loja_id: lojaId });
  const loja = checagem?.[0];
  if (!loja) throw new Error("Loja não encontrada.");
  if (loja.eh_dono) throw new Error("Você é o dono desta loja.");

  // Produto (se veio) precisa pertencer à loja — não confiar no hidden input.
  if (produtoId) {
    const { data: produto } = await supabase
      .from("produtos")
      .select("id")
      .eq("id", produtoId)
      .eq("loja_id", lojaId)
      .maybeSingle();
    if (!produto) throw new Error("Produto não pertence a esta loja.");
  }

  // Defesa em profundidade — o botão já vem oculto sem pedido pago, mas a
  // action não confia só na UI.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- RPC 0114 fora dos tipos gerados
  const { data: liberado } = await (supabase as any).rpc("comprador_tem_pedido_pago", {
    p_loja_id: lojaId,
    p_produto_id: produtoId,
  });
  if (liberado !== true) {
    throw new Error("Disponível após concluir uma compra nesta loja.");
  }

  // Reaproveita conversa existente (unicidade comprador+loja+produto).
  let query = supabase
    .from("conversas")
    .select("id")
    .eq("comprador_id", user.id)
    .eq("loja_id", lojaId);
  query = produtoId ? query.eq("produto_id", produtoId) : query.is("produto_id", null);
  const { data: existente } = await query.maybeSingle();
  if (existente) redirect(`/mensagens/${existente.id}`);

  const { data: nova, error } = await supabase
    .from("conversas")
    .insert({
      comprador_id: user.id,
      comprador_nome: user.email ?? null,
      loja_id: lojaId,
      produto_id: produtoId,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  redirect(`/mensagens/${nova.id}`);
}

export type MensagemEnviada = {
  id: string;
  autor_id: string;
  corpo: string;
  created_at: string;
};

export type EnviarMensagemState = {
  ok: boolean;
  erro?: string;
  /** Mensagem gravada, devolvida para a thread exibir sem esperar o realtime. */
  mensagem?: MensagemEnviada;
};

export async function enviarMensagem(
  _prev: EnviarMensagemState,
  formData: FormData,
): Promise<EnviarMensagemState> {
  const conversaId = formData.get("conversa_id");
  const corpo = formData.get("corpo");
  if (!conversaId || typeof conversaId !== "string") {
    return { ok: false, erro: "Conversa inválida." };
  }
  if (!corpo || typeof corpo !== "string" || corpo.trim().length === 0) {
    return { ok: false, erro: "Escreva uma mensagem." };
  }
  if (corpo.length > 4000) {
    return { ok: false, erro: "Mensagem longa demais (máx. 4000 caracteres)." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, erro: "Sessão expirada. Entre novamente." };

  // RLS mensagens_participante_insert já barra não-participantes.
  const { data, error } = await supabase
    .from("mensagens")
    .insert({
      conversa_id: conversaId,
      autor_id: user.id,
      corpo: corpo.trim(),
    })
    .select("id, autor_id, corpo, created_at")
    .single();
  if (error || !data) {
    return { ok: false, erro: "Não foi possível enviar. Você participa desta conversa?" };
  }
  revalidatePath(`/mensagens/${conversaId}`);
  revalidatePath(`/seller/mensagens/${conversaId}`);
  return { ok: true, mensagem: data };
}

// Marca como lidas as mensagens do OUTRO participante nesta conversa.
export async function marcarLidas(conversaId: string) {
  if (!conversaId) return;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from("mensagens")
    .update({ lida_em: new Date().toISOString() })
    .eq("conversa_id", conversaId)
    .neq("autor_id", user.id)
    .is("lida_em", null);
}
