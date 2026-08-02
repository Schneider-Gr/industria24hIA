"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createPublicClient } from "@/lib/supabase/public";

// Favoritos e avaliações de produto — tabelas novas (migrations 0096/0097),
// pedido explícito do dono em sessão de redesign mobile. Leitura de
// contagem/média é pública (createPublicClient); toggle/escrita exige
// usuário logado e respeita RLS (createClient, sessão do cookie).

export async function buscarFavoritoResumo(produtoId: string) {
  const supabase = createPublicClient();
  const [{ count: totalFavoritos }, { data: resumoAvaliacao }] = await Promise.all([
    supabase
      .from("favoritos")
      .select("id", { count: "exact", head: true })
      .eq("produto_id", produtoId),
    supabase
      .from("avaliacoes_produto_resumo")
      .select("media, total")
      .eq("produto_id", produtoId)
      .maybeSingle(),
  ]);
  return {
    totalFavoritos: totalFavoritos ?? 0,
    media: resumoAvaliacao?.media ? Number(resumoAvaliacao.media) : null,
    totalAvaliacoes: resumoAvaliacao?.total ?? 0,
  };
}

export async function buscarMeuFavorito(produtoId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase
    .from("favoritos")
    .select("id")
    .eq("produto_id", produtoId)
    .eq("user_id", user.id)
    .maybeSingle();
  return !!data;
}

export async function alternarFavorito(produtoId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Faça login para favoritar." };

  const { data: existente } = await supabase
    .from("favoritos")
    .select("id")
    .eq("produto_id", produtoId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existente) {
    await supabase.from("favoritos").delete().eq("id", existente.id);
    revalidatePath(`/produto/${produtoId}`);
    return { ok: true as const, favoritado: false };
  }

  await supabase.from("favoritos").insert({ produto_id: produtoId, user_id: user.id });
  revalidatePath(`/produto/${produtoId}`);
  return { ok: true as const, favoritado: true };
}

export type Avaliacao = {
  id: string;
  nota: number;
  comentario: string | null;
  criado_em: string;
};

export async function listarAvaliacoes(produtoId: string): Promise<Avaliacao[]> {
  const supabase = createPublicClient();
  const { data } = await supabase
    .from("avaliacoes_produto")
    .select("id, nota, comentario, criado_em")
    .eq("produto_id", produtoId)
    .order("criado_em", { ascending: false })
    .limit(20);
  return data ?? [];
}

export async function buscarMinhaAvaliacao(produtoId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("avaliacoes_produto")
    .select("id, nota, comentario")
    .eq("produto_id", produtoId)
    .eq("user_id", user.id)
    .maybeSingle();
  return data;
}

export type AvaliarState = { ok: boolean; error?: string };

export async function enviarAvaliacao(
  _prev: AvaliarState,
  formData: FormData,
): Promise<AvaliarState> {
  const produtoId = String(formData.get("produto_id") ?? "");
  const nota = Number(formData.get("nota"));
  const comentario = String(formData.get("comentario") ?? "").trim() || null;

  if (!produtoId || !Number.isInteger(nota) || nota < 1 || nota > 5) {
    return { ok: false, error: "Selecione uma nota de 1 a 5." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Faça login para avaliar este produto." };

  const { error } = await supabase
    .from("avaliacoes_produto")
    .upsert(
      { produto_id: produtoId, user_id: user.id, nota, comentario, atualizado_em: new Date().toISOString() },
      { onConflict: "user_id,produto_id" },
    );

  if (error) return { ok: false, error: "Não foi possível registrar sua avaliação agora." };

  revalidatePath(`/produto/${produtoId}`);
  return { ok: true };
}
