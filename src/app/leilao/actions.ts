"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { publicarLeilaoSchema, darLanceLeilaoSchema, adjudicarLeilaoSchema } from "@/lib/leilao/schemas";

async function db() {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- RPCs 0040 fora dos tipos gerados
  return supabase as any;
}

export async function publicarLeilao(formData: FormData) {
  const parse = publicarLeilaoSchema.safeParse({
    titulo: String(formData.get("titulo") ?? ""),
    descricao: String(formData.get("descricao") ?? ""),
    volume: String(formData.get("volume") ?? ""),
    categoria_id: String(formData.get("categoria_id") ?? "").trim() || null,
    prazo_desejado: String(formData.get("prazo_desejado") ?? "").trim() || null,
    janela_fim: String(formData.get("janela_fim") ?? ""),
  });
  if (!parse.success) throw new Error(parse.error.issues[0]?.message ?? "Dados inválidos.");

  const supabase = await db();
  const { data, error } = await supabase.rpc("publicar_leilao_fabricante", {
    p_titulo: parse.data.titulo,
    p_descricao: parse.data.descricao,
    p_volume: parse.data.volume,
    p_categoria_id: parse.data.categoria_id,
    p_prazo_desejado: parse.data.prazo_desejado,
    p_janela_fim: parse.data.janela_fim,
  });
  if (error) throw new Error(error.message);
  redirect(`/leilao/${data}`);
}

export async function darLanceLeilao(formData: FormData) {
  const parse = darLanceLeilaoSchema.safeParse({
    leilao_id: String(formData.get("leilao_id") ?? ""),
    preco: Number(formData.get("preco")),
    prazo: String(formData.get("prazo") ?? ""),
    condicoes: String(formData.get("condicoes") ?? "").trim() || null,
  });
  if (!parse.success) throw new Error(parse.error.issues[0]?.message ?? "Dados inválidos.");

  const supabase = await db();
  const { error } = await supabase.rpc("dar_lance_leilao", {
    p_leilao_id: parse.data.leilao_id,
    p_preco: parse.data.preco,
    p_prazo: parse.data.prazo,
    p_condicoes: parse.data.condicoes,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/seller/leiloes");
}

export async function adjudicarLeilao(formData: FormData) {
  const parse = adjudicarLeilaoSchema.safeParse({
    leilao_id: String(formData.get("leilao_id") ?? ""),
    lance_id: String(formData.get("lance_id") ?? ""),
  });
  if (!parse.success) throw new Error(parse.error.issues[0]?.message ?? "Dados inválidos.");

  const supabase = await db();
  const { error } = await supabase.rpc("adjudicar_leilao", {
    p_leilao_id: parse.data.leilao_id,
    p_lance_id: parse.data.lance_id,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/leilao/${parse.data.leilao_id}`);
}
