"use server";

import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";

function gerarSlug(nome: string) {
  const base = nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  const sufixo = Math.random().toString(36).slice(2, 7);
  return `${base || "vitrine"}-${sufixo}`;
}

export async function criarVitrine(formData: FormData) {
  const user = await getUser();
  if (!user) throw new Error("Você precisa estar logado.");

  const nome = (formData.get("nome") as string | null)?.trim();
  if (!nome) throw new Error("Informe um nome para a coleção.");

  const supabase = await createClient();
  const { error } = await supabase.from("afiliado_vitrines").insert({
    afiliado_id: user.id,
    nome,
    slug: gerarSlug(nome),
  });

  if (error) throw new Error(`Erro ao criar coleção: ${error.message}`);

  revalidatePath("/afiliado/vitrines");
}

export async function renomearVitrine(formData: FormData) {
  const user = await getUser();
  if (!user) throw new Error("Você precisa estar logado.");

  const vitrine_id = formData.get("vitrine_id") as string | null;
  const nome = (formData.get("nome") as string | null)?.trim();
  if (!vitrine_id || !nome) throw new Error("Dados inválidos.");

  const supabase = await createClient();
  // RLS já restringe ao dono; filtro explícito também aqui deixa a intenção clara.
  const { error } = await supabase
    .from("afiliado_vitrines")
    .update({ nome })
    .eq("id", vitrine_id)
    .eq("afiliado_id", user.id);

  if (error) throw new Error(`Erro ao renomear coleção: ${error.message}`);

  revalidatePath("/afiliado/vitrines");
  revalidatePath(`/afiliado/vitrines/${vitrine_id}`);
}

export async function adicionarProdutoNaVitrine(formData: FormData) {
  const user = await getUser();
  if (!user) throw new Error("Você precisa estar logado.");

  const vitrine_id = formData.get("vitrine_id") as string | null;
  const afiliacao_id = formData.get("afiliacao_id") as string | null;
  if (!vitrine_id || !afiliacao_id) throw new Error("Dados inválidos.");

  const supabase = await createClient();

  // A afiliação precisa ser do próprio usuário — o trigger
  // afiliado_vitrine_produtos_valida_dono também barra isto no banco, mas
  // buscar aqui evita o erro genérico do trigger e dá a mensagem certa.
  const { data: afiliacao, error: afiliacaoError } = await supabase
    .from("afiliacoes")
    .select("id, produto_id, afiliado_id")
    .eq("id", afiliacao_id)
    .eq("afiliado_id", user.id)
    .single();

  if (afiliacaoError || !afiliacao?.produto_id) {
    throw new Error("Você não possui essa afiliação.");
  }

  const { error } = await supabase.from("afiliado_vitrine_produtos").insert({
    vitrine_id,
    produto_id: afiliacao.produto_id,
    afiliacao_id: afiliacao.id,
  });

  if (error) throw new Error(`Erro ao adicionar produto: ${error.message}`);

  revalidatePath(`/afiliado/vitrines/${vitrine_id}`);
}

export async function removerProdutoDaVitrine(formData: FormData) {
  const user = await getUser();
  if (!user) throw new Error("Você precisa estar logado.");

  const vitrine_id = formData.get("vitrine_id") as string | null;
  const item_id = formData.get("item_id") as string | null;
  if (!vitrine_id || !item_id) throw new Error("Dados inválidos.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("afiliado_vitrine_produtos")
    .delete()
    .eq("id", item_id)
    .eq("vitrine_id", vitrine_id);

  if (error) throw new Error(`Erro ao remover produto: ${error.message}`);

  revalidatePath(`/afiliado/vitrines/${vitrine_id}`);
}
