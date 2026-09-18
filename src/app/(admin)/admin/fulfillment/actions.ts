"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function adicionarLojaPiloto(formData: FormData) {
  const centroId = formData.get("centro_id") as string;
  const lojaId = formData.get("loja_id") as string;

  const supabase = await createClient();
  const { error } = await supabase
    .from("cd_lojas_piloto")
    .insert({
      loja_id: lojaId,
      centro_id: centroId,
      criado_por: (await supabase.auth.getUser()).data.user?.id || ""
    });

  if (error) {
    return { sucesso: false, erro: error.message };
  }

  revalidatePath("/admin/fulfillment");
  return { sucesso: true, mensagem: "Loja adicionada ao piloto" };
}

export async function removerLojaPiloto(formData: FormData) {
  const lojaId = formData.get("loja_id") as string;
  const centroId = formData.get("centro_id") as string;

  const supabase = await createClient();
  const { error } = await supabase
    .from("cd_lojas_piloto")
    .delete()
    .eq("loja_id", lojaId)
    .eq("centro_id", centroId);

  if (error) {
    return { sucesso: false, erro: error.message };
  }

  revalidatePath("/admin/fulfillment");
  return { sucesso: true, mensagem: "Loja removida do piloto" };
}

export async function registrarEntrada(formData: FormData) {
  const produtoId = formData.get("produto_id") as string;
  const centroId = formData.get("centro_id") as string;
  const enderecoId = formData.get("endereco_id") as string;
  const quantidade = parseInt(formData.get("quantidade") as string, 10);
  const motivo = formData.get("motivo") as string;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_cd_registrar_entrada", {
    p_produto_id: produtoId,
    p_centro_id: centroId,
    p_endereco_id: enderecoId,
    p_quantidade: quantidade,
    p_motivo: motivo
  });

  if (error) {
    return { sucesso: false, erro: error.message };
  }

  if (data && !data.sucesso) {
    return { sucesso: false, erro: data.erro };
  }

  revalidatePath("/admin/fulfillment");
  return { sucesso: true, mensagem: "Entrada registrada com sucesso" };
}
