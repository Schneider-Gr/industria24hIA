"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function publicarCorrida(formData: FormData) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("publicar_corrida", {
    p_origem_cep: String(formData.get("origem_cep") ?? "").trim(),
    p_origem_endereco: String(formData.get("origem_endereco") ?? "").trim(),
    p_destino_cep: String(formData.get("destino_cep") ?? "").trim(),
    p_destino_endereco: String(formData.get("destino_endereco") ?? "").trim(),
    p_peso_kg: Number(formData.get("peso_kg")),
    // p_volume_m3/p_descricao_carga não têm default no Postgres (parâmetro
    // obrigatório), mas aceitam NULL como valor — o tipo gerado não reflete
    // isso, só a obrigatoriedade do argumento.
    p_volume_m3: (Number(formData.get("volume_m3")) || null) as number,
    p_descricao_carga: (String(formData.get("descricao_carga") ?? "").trim() || null) as string,
    p_janela_inicio: String(formData.get("janela_inicio")),
    p_janela_fim: String(formData.get("janela_fim")),
    p_urgencia: String(formData.get("urgencia") ?? "normal"),
    p_modo: String(formData.get("modo") ?? "primeiro_aceita"),
    p_pedido_id: String(formData.get("pedido_id") ?? "").trim() || undefined,
  });
  if (error) throw new Error(error.message);
  redirect(`/corridas/${data}`);
}

export async function escolherLanceCorrida(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("escolher_lance_corrida", {
    p_lance_id: String(formData.get("lance_id")),
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/corridas/${String(formData.get("corrida_id"))}`);
}

export async function cancelarCorrida(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("cancelar_corrida", {
    p_corrida_id: String(formData.get("corrida_id")),
  });
  if (error) throw new Error(error.message);
  revalidatePath("/corridas");
}

export async function avaliarCorrida(formData: FormData) {
  const supabase = await createClient();
  const corridaId = String(formData.get("corrida_id"));
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes?.user) throw new Error("Faça login.");
  const { error } = await supabase.from("corrida_avaliacoes").insert({
    corrida_id: corridaId,
    avaliador_id: userRes.user.id,
    nota: Number(formData.get("nota")),
    comentario: String(formData.get("comentario") ?? "").trim() || null,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/corridas/${corridaId}`);
}
