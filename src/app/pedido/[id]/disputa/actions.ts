"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient, isServiceConfigured } from "@/lib/supabase/service";
import { enviarEmail } from "@/lib/email";
import {
  podeAbrirDisputa,
  slaLojaVenceEm,
  validarFotosAbertura,
  validarMotivo,
} from "@/lib/disputas";

// Abre uma disputa (PRD 009 US01 / PRD 010 US03): cria a conversa vinculada
// ao pedido, a disputa, sobe as fotos anexadas e notifica a loja por e-mail.
// Validação de negócio roda no servidor além da RLS (defesa em profundidade,
// mesmo padrão de src/app/mensagens/actions.ts).
export async function abrirDisputa(formData: FormData) {
  const pedidoId = formData.get("pedido_id");
  const linhaItemId = formData.get("linha_item_id");
  const motivo = formData.get("motivo");
  const descricao = formData.get("descricao");
  const fotos = formData.getAll("fotos").filter((f): f is File => f instanceof File && f.size > 0);

  if (!pedidoId || typeof pedidoId !== "string") throw new Error("Pedido inválido.");
  if (!linhaItemId || typeof linhaItemId !== "string") throw new Error("Item inválido.");
  if (!motivo || typeof motivo !== "string") throw new Error("Selecione um motivo.");
  if (!descricao || typeof descricao !== "string" || descricao.trim().length === 0) {
    throw new Error("Descreva o problema.");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/pedido/${pedidoId}`);

  // Item precisa ser do próprio comprador (RLS da view já garante, mas
  // buscamos aqui os dados necessários para as regras de negócio).
  const { data: item } = await supabase
    .from("linha_itens_cliente")
    .select("id, pedido_id, produto_nome, produto_id, entregue_em, perecivel, valor")
    .eq("id", linhaItemId)
    .maybeSingle();
  if (!item || item.pedido_id !== pedidoId) throw new Error("Item não encontrado neste pedido.");
  if (!item.produto_id) throw new Error("Item sem produto vinculado.");

  const perecivel = item.perecivel ?? false;
  validarMotivo(motivo, perecivel);
  validarFotosAbertura(perecivel, fotos.length);

  if (item.entregue_em) {
    if (!podeAbrirDisputa(new Date(item.entregue_em), perecivel)) {
      throw new Error(
        perecivel
          ? "Prazo de 24h após a entrega para disputa de produto perecível expirou."
          : "Prazo de 7 dias após a entrega para abrir disputa expirou.",
      );
    }
  }

  // Loja do produto (view do comprador não expõe loja_id do pedido).
  const { data: produto } = await supabase
    .from("produtos")
    .select("id, loja_id")
    .eq("id", item.produto_id)
    .maybeSingle();
  if (!produto) throw new Error("Não foi possível identificar a loja deste item.");

  // Reaproveita conversa existente vinculada a este pedido, ou cria uma nova.
  const { data: conversaExistente } = await supabase
    .from("conversas")
    .select("id")
    .eq("comprador_id", user.id)
    .eq("loja_id", produto.loja_id)
    .eq("pedido_id", pedidoId)
    .maybeSingle();

  let conversaId = conversaExistente?.id;
  if (!conversaId) {
    const { data: conversaNova, error: erroConversa } = await supabase
      .from("conversas")
      .insert({
        comprador_id: user.id,
        comprador_nome: user.email ?? null,
        loja_id: produto.loja_id,
        produto_id: item.produto_id,
        pedido_id: pedidoId,
      })
      .select("id")
      .single();
    if (erroConversa || !conversaNova) throw new Error("Não foi possível iniciar a conversa da disputa.");
    conversaId = conversaNova.id;
  }

  const abertaEm = new Date();
  const { data: disputa, error: erroDisputa } = await supabase
    .from("disputas")
    .insert({
      pedido_id: pedidoId,
      linha_item_id: linhaItemId,
      comprador_id: user.id,
      loja_id: produto.loja_id,
      conversa_id: conversaId,
      motivo,
      descricao: descricao.trim(),
      status: "aberta",
      aberta_em: abertaEm.toISOString(),
      sla_loja_vence_em: slaLojaVenceEm(abertaEm).toISOString(),
    })
    .select("id")
    .single();
  if (erroDisputa || !disputa) {
    throw new Error("Não foi possível abrir a disputa. Já existe uma disputa ativa para este item?");
  }

  for (const foto of fotos.slice(0, 5)) {
    const caminho = `${disputa.id}/${crypto.randomUUID()}-${foto.name}`;
    const { error: erroUpload } = await supabase.storage.from("disputas").upload(caminho, foto);
    if (erroUpload) continue;
    // Bucket privado: grava o caminho, não a URL pública (que não existe
    // aqui) — quem exibe a foto gera uma URL assinada sob demanda.
    await supabase.from("disputa_fotos").insert({
      disputa_id: disputa.id,
      url: caminho,
      enviado_por: user.id,
    });
  }

  const { data: loja } = await supabase.from("lojas").select("email, nome").eq("id", produto.loja_id).maybeSingle();
  if (loja?.email) {
    await enviarEmail({
      to: loja.email,
      subject: `Nova disputa aberta — pedido ${pedidoId}`,
      text: `Um comprador abriu uma disputa sobre "${item.produto_nome}". Motivo: ${motivo}. Responda em até 48h pelo painel: https://industria24.com.br/seller/disputas`,
    });
  }

  revalidatePath(`/pedido/${pedidoId}`);
  revalidatePath("/seller/disputas");
  redirect(`/pedido/${pedidoId}`);
}

// Comprador escala para mediação do admin (PRD 009 US03) — só permitido
// depois do SLA de 48h vencido, ou se a loja já respondeu e o comprador
// discorda. A verificação de SLA roda no servidor (defesa em profundidade).
export async function escalarParaAdmin(formData: FormData) {
  const disputaId = formData.get("disputa_id");
  if (!disputaId || typeof disputaId !== "string") throw new Error("Disputa inválida.");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sessão expirada.");

  const { data: disputa } = await supabase
    .from("disputas")
    .select("id, pedido_id, comprador_id, loja_id, motivo, sla_loja_vence_em, status")
    .eq("id", disputaId)
    .maybeSingle();
  if (!disputa || disputa.comprador_id !== user.id) throw new Error("Disputa não encontrada.");
  if (disputa.status === "resolvida" || disputa.status === "resolvida_pela_loja") {
    throw new Error("Disputa já foi encerrada.");
  }

  // Escala por SLA de 48h vencido (loja nunca respondeu), OU recusando uma
  // resolução proposta pela loja (0115) — sem trava de tempo neste segundo
  // caso, o comprador pode recusar assim que a proposta chega.
  const podeEscalarPorSla = new Date() >= new Date(disputa.sla_loja_vence_em);
  const podeEscalarPorRecusa = disputa.status === "aguardando_confirmacao_comprador";
  if (!podeEscalarPorSla && !podeEscalarPorRecusa) {
    throw new Error("Aguarde o prazo de 48h da loja antes de escalar.");
  }

  const { error } = await supabase
    .from("disputas")
    .update({ status: "em_mediacao_admin", escalada_em: new Date().toISOString() })
    .eq("id", disputaId);
  if (error) throw new Error("Não foi possível escalar a disputa.");

  await notificarEscalonamento(disputa);

  revalidatePath(`/pedido/${disputa.pedido_id}`);
  revalidatePath("/admin/disputas");
}

// Notifica loja (perdeu a janela de resolver sozinha) e admin (novo caso na
// fila de mediação). E-mail de admin usa service role — a lista de admins
// (public.admins) não guarda e-mail, só existe em auth.users. Best-effort:
// falha de e-mail não desfaz o escalonamento já registrado.
async function notificarEscalonamento(disputa: {
  id: string;
  pedido_id: string;
  loja_id: string;
  motivo: string;
}) {
  const supabase = await createClient();
  const { data: loja } = await supabase.from("lojas").select("email").eq("id", disputa.loja_id).maybeSingle();
  if (loja?.email) {
    await enviarEmail({
      to: loja.email,
      subject: `Disputa escalada para mediação — pedido ${disputa.pedido_id}`,
      text: `A disputa sobre "${disputa.motivo}" foi escalada para mediação do Indústria24h. Acompanhe em https://industria24.com.br/seller/disputas`,
    });
  }

  if (!isServiceConfigured) return;
  const svc = createServiceClient();
  const { data: admins } = await svc.from("admins").select("user_id");
  for (const admin of admins ?? []) {
    const { data } = await svc.auth.admin.getUserById(admin.user_id);
    if (data.user?.email) {
      await enviarEmail({
        to: data.user.email,
        subject: `Nova disputa em mediação — pedido ${disputa.pedido_id}`,
        text: `Uma disputa foi escalada e aguarda arbitragem: https://industria24.com.br/admin/disputas/${disputa.id}`,
      });
    }
  }
}

// Comprador confirma (aceita) a resolução proposta pela loja (PRD 009 US02,
// revisão 0115) — RLS/guard só permitem essa transição a partir de
// "aguardando_confirmacao_comprador".
export async function confirmarResolucao(formData: FormData) {
  const disputaId = formData.get("disputa_id");
  if (!disputaId || typeof disputaId !== "string") throw new Error("Disputa inválida.");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sessão expirada.");

  const { data: disputa } = await supabase
    .from("disputas")
    .select("id, pedido_id, comprador_id, status")
    .eq("id", disputaId)
    .maybeSingle();
  if (!disputa || disputa.comprador_id !== user.id) throw new Error("Disputa não encontrada.");
  if (disputa.status !== "aguardando_confirmacao_comprador") {
    throw new Error("Não há resolução pendente de confirmação para esta disputa.");
  }

  const { error } = await supabase
    .from("disputas")
    .update({ status: "resolvida_pela_loja", resolvida_em: new Date().toISOString() })
    .eq("id", disputaId);
  if (error) throw new Error("Não foi possível confirmar a resolução.");

  revalidatePath(`/pedido/${disputa.pedido_id}`);
  revalidatePath("/seller/disputas");
}

// Mensagem do comprador no canal privado de mediação (só visível a ele e ao
// admin) — usada quando a disputa já está em "em_mediacao_admin".
export async function responderMediacaoComprador(formData: FormData) {
  const disputaId = formData.get("disputa_id");
  const corpo = formData.get("corpo");
  if (!disputaId || typeof disputaId !== "string") throw new Error("Disputa inválida.");
  if (!corpo || typeof corpo !== "string" || corpo.trim().length === 0) {
    throw new Error("Escreva uma mensagem.");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sessão expirada.");

  const { data: disputa } = await supabase
    .from("disputas")
    .select("id, pedido_id")
    .eq("id", disputaId)
    .maybeSingle();
  if (!disputa) throw new Error("Disputa não encontrada.");

  const { error } = await supabase.from("disputa_mensagens_mediacao").insert({
    disputa_id: disputaId,
    destinatario: "comprador",
    autor_id: user.id,
    corpo: corpo.trim(),
  });
  if (error) throw new Error("Não foi possível enviar a mensagem.");

  revalidatePath(`/pedido/${disputa.pedido_id}`);
}
