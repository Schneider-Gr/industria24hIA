"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";

// Tabelas/RPCs da migration 0039/0040 ainda fora dos tipos gerados — o cast
// justificado fica concentrado nestes helpers.
async function db() {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return supabase as any;
}

export async function salvarCadastroParceiro(formData: FormData) {
  const user = await getUser();
  if (!user) throw new Error("Faça login.");

  const campos = {
    user_id: user.id,
    tipo: String(formData.get("tipo") ?? "motorista"),
    nome: String(formData.get("nome") ?? "").trim(),
    telefone: String(formData.get("telefone") ?? "").trim() || null,
    cnh: String(formData.get("cnh") ?? "").trim() || null,
    doc_veiculo: String(formData.get("doc_veiculo") ?? "").trim() || null,
    placa: String(formData.get("placa") ?? "").trim() || null,
    capacidade_kg: Number(formData.get("capacidade_kg")) || null,
    capacidade_m3: Number(formData.get("capacidade_m3")) || null,
    area_atuacao: String(formData.get("area_atuacao") ?? "").trim() || null,
    cep_base: String(formData.get("cep_base") ?? "").trim() || null,
    valor_minimo_entrega: Number(formData.get("valor_minimo_entrega")) || null,
  };
  if (!campos.nome) throw new Error("Informe o nome.");
  if (!["motorista", "transportadora"].includes(campos.tipo)) throw new Error("Tipo inválido.");

  const supabase = await db();
  const { error } = await supabase
    .from("parceiros_logisticos")
    .upsert(campos, { onConflict: "user_id" });
  if (error) throw new Error(`Não foi possível salvar o cadastro: ${error.message}`);
  revalidatePath("/parceiro");
}

export async function aceitarCorrida(formData: FormData) {
  const supabase = await db();
  const { error } = await supabase.rpc("aceitar_corrida", {
    p_corrida_id: String(formData.get("corrida_id")),
  });
  if (error) throw new Error(error.message);
  revalidatePath("/parceiro");
}

export async function darLanceCorrida(formData: FormData) {
  const supabase = await db();
  const { error } = await supabase.rpc("dar_lance_corrida", {
    p_corrida_id: String(formData.get("corrida_id")),
    p_valor: Number(formData.get("valor")),
    p_prazo: String(formData.get("prazo") ?? "").trim() || null,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/parceiro");
}

export async function atualizarStatusCorrida(formData: FormData) {
  const user = await getUser();
  if (!user) throw new Error("Faça login.");
  const corridaId = String(formData.get("corrida_id"));
  const status = String(formData.get("status"));
  const supabase = await db();

  let fotoUrl: string | null = null;
  const foto = formData.get("foto");
  if (foto instanceof File && foto.size > 0) {
    const path = `${corridaId}/${Date.now()}-${foto.name.replace(/[^\w.-]/g, "_")}`;
    const { error: upErr } = await supabase.storage.from("entregas").upload(path, foto);
    if (upErr) throw new Error(`Falha no upload da foto: ${upErr.message}`);
    fotoUrl = supabase.storage.from("entregas").getPublicUrl(path).data.publicUrl;
  }

  const { error } = await supabase.rpc("atualizar_status_corrida", {
    p_corrida_id: corridaId,
    p_status: status,
    p_foto_url: fotoUrl,
    p_assinatura_url: null,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/parceiro");
}

export async function atualizarStatusRota(formData: FormData) {
  const supabase = await db();
  const { error } = await supabase.rpc("atualizar_status_rota", {
    p_rota_id: String(formData.get("rota_id")),
    p_status: String(formData.get("status")),
  });
  if (error) throw new Error(error.message);
  revalidatePath("/parceiro");
}

export async function alterarChavePixParceiro(formData: FormData) {
  const supabase = await db();
  const { error } = await supabase.rpc("alterar_chave_pix_parceiro", {
    p_chave_pix: String(formData.get("chave_pix") ?? "").trim(),
    p_tipo_chave_pix: String(formData.get("tipo_chave_pix") ?? ""),
  });
  if (error) throw new Error(error.message);
  revalidatePath("/parceiro/cadastro");
}
