"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient, isServiceConfigured } from "@/lib/supabase/service";
import { responderBotConversa, PREFIXO_BOT, type ContextoPedido } from "@/lib/ai/botConversa";

// Usuário de sistema fixo, dono das mensagens do bot (migration 0117) —
// nunca loga, só existe como FK-alvo de mensagens.autor_id.
const AUTOR_BOT_ID = "00000000-0000-4000-8000-0000000000b0";

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

  await tratarBotAposMensagem(conversaId, user.id);

  revalidatePath(`/mensagens/${conversaId}`);
  revalidatePath(`/seller/mensagens/${conversaId}`);
  return { ok: true, mensagem: data };
}

// Bot "sempre responde primeiro" (pedido do dono do produto, 0117): se quem
// mandou a mensagem foi o COMPRADOR e o bot ainda está ativo na conversa,
// aciona o bot e insere a resposta dele na mesma thread. Se foi a LOJA
// respondendo, ela assumiu — desativa o bot para essa conversa (ela não
// volta a responder sozinho até a loja reabrir manualmente, fora de escopo
// desta versão).
async function tratarBotAposMensagem(conversaId: string, autorId: string) {
  const supabase = await createClient();
  const { data: conversa } = await supabase
    .from("conversas")
    .select("comprador_id, loja_id, bot_ativo, comprador_nome, produto_id, pedido_id")
    .eq("id", conversaId)
    .maybeSingle();
  if (!conversa || !conversa.bot_ativo) return;

  // Não há policy de UPDATE em `conversas` para usuário comum (só
  // insert/select) — usa service role para desativar bot_ativo nos dois
  // ramos abaixo. A Server Action já validou a participação via RLS do
  // insert de mensagens acima; isto não abre nada que o usuário não tenha
  // acabado de provar que pode fazer.
  if (!isServiceConfigured) return;
  const svc = createServiceClient();

  if (autorId !== conversa.comprador_id) {
    // Loja (ou admin) respondeu — encerra a participação do bot.
    await svc.from("conversas").update({ bot_ativo: false }).eq("id", conversaId);
    return;
  }

  const { data: loja } = await svc.from("lojas").select("nome").eq("id", conversa.loja_id).maybeSingle();
  const { data: historicoRaw } = await svc
    .from("mensagens")
    .select("autor_id, corpo")
    .eq("conversa_id", conversaId)
    .order("created_at", { ascending: true })
    .limit(30);

  // Remove o PREFIXO_BOT antes de repassar como histórico ao modelo — senão
  // ele aprende a imitar o próprio prefixo e passa a duplicá-lo nas respostas
  // seguintes (o prefixo só existe para o comprador identificar quem fala,
  // ver PREFIXO_BOT em botConversa.ts).
  const historico = (historicoRaw ?? []).map((m) => {
    const ehBot = m.autor_id === AUTOR_BOT_ID;
    const corpo = ehBot && m.corpo.startsWith(PREFIXO_BOT) ? m.corpo.slice(PREFIXO_BOT.length).trim() : m.corpo;
    return { autor: (ehBot ? "bot" : "comprador") as "bot" | "comprador", corpo };
  });

  const contexto: ContextoPedido = {};
  contexto.compradorNome = conversa.comprador_nome ?? null;

  if (conversa.produto_id) {
    const { data: produto } = await svc
      .from("produtos")
      .select("nome, perecivel")
      .eq("id", conversa.produto_id)
      .maybeSingle();
    contexto.produtoNome = produto?.nome ?? null;
    contexto.perecivel = produto?.perecivel ?? false;
  }

  if (conversa.pedido_id) {
    const { data: disputa } = await svc
      .from("disputas")
      .select("motivo, status")
      .eq("pedido_id", conversa.pedido_id)
      .neq("status", "resolvida")
      .maybeSingle();
    contexto.disputaAberta = disputa ?? null;
  }

  const { resposta, handoff } = await responderBotConversa(loja?.nome ?? "a loja", historico, contexto);
  // Defesa contra o modelo imitar o próprio PREFIXO_BOT na resposta gerada.
  const respostaLimpa = resposta.trim().startsWith(PREFIXO_BOT)
    ? resposta.trim().slice(PREFIXO_BOT.length).trim()
    : resposta.trim();

  if (respostaLimpa.length > 0) {
    await svc.from("mensagens").insert({
      conversa_id: conversaId,
      autor_id: AUTOR_BOT_ID,
      corpo: `${PREFIXO_BOT} ${respostaLimpa}`,
    });
  }
  if (handoff) {
    await svc.from("conversas").update({ bot_ativo: false }).eq("id", conversaId);
  }
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
