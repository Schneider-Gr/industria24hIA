"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getOpenAIClient, OPENAI_MODEL } from "@/lib/ai/openai";

// CRUD real da taxonomia. As tabelas categorias/subcategorias não têm dono;
// as policies de escrita (admin) virão numa migration futura — enquanto isso
// o INSERT/UPDATE/DELETE pode ser barrado pela RLS deny-by-default (sem erro
// silencioso: o Supabase retorna erro de permissão, exibido pela action).
// Escrita garantida pela policy is_admin (migration 0004, FOR ALL).

export async function criarCategoria(formData: FormData) {
  const nome = String(formData.get("nome") ?? "").trim();
  if (!nome) throw new Error("Nome da categoria é obrigatório.");

  const supabase = await createClient();
  const { error } = await supabase.from("categorias").insert({ nome });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/categorias");
}

export async function renomearCategoria(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const nome = String(formData.get("nome") ?? "").trim();
  if (!id || !nome) throw new Error("Parâmetros inválidos.");

  const supabase = await createClient();
  const { error } = await supabase.from("categorias").update({ nome }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/categorias");
}

export async function excluirCategoria(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Categoria inválida.");

  const supabase = await createClient();
  const { error } = await supabase.from("categorias").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/categorias");
}

export async function criarSubcategoria(formData: FormData) {
  const categoria_id = String(formData.get("categoria_id") ?? "");
  const nome = String(formData.get("nome") ?? "").trim();
  if (!categoria_id || !nome) throw new Error("Parâmetros inválidos.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("subcategorias")
    .insert({ categoria_id, nome });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/categorias");
}

export async function excluirSubcategoria(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Subcategoria inválida.");

  const supabase = await createClient();
  const { error } = await supabase.from("subcategorias").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/categorias");
}

// ============ Sugestões de taxonomia por IA ============

export type SugestaoCategoria = {
  categoria: string;
  subcategorias: string[];
  produtos_exemplo: string[];
};

export type SugestaoIAResultado =
  | { sugestoes: SugestaoCategoria[]; mensagem?: string }
  | { erro: string };

// Analisa produtos sem categoria e pede à IA para agrupá-los em
// categorias/subcategorias novas. Não grava nada — só devolve sugestões
// para o admin revisar e aplicar (aplicarSugestaoIA) ou descartar.
export async function sugerirCategoriasIA(): Promise<SugestaoIAResultado> {
  const supabase = await createClient();

  const [{ data: produtosSemCategoria, error: eProd }, { data: categorias, error: eCat }] =
    await Promise.all([
      supabase.from("produtos").select("nome").is("categoria_id", null).limit(200),
      supabase.from("categorias").select("nome").order("nome"),
    ]);

  if (eProd) return { erro: eProd.message };
  if (eCat) return { erro: eCat.message };

  if (!produtosSemCategoria || produtosSemCategoria.length === 0) {
    return { sugestoes: [], mensagem: "Nenhum produto sem categoria encontrado." };
  }

  let client;
  try {
    client = getOpenAIClient();
  } catch (e) {
    return { erro: e instanceof Error ? e.message : String(e) };
  }

  const nomesProdutos = produtosSemCategoria.map((p) => p.nome);
  const nomesCategoriasExistentes = (categorias ?? []).map((c) => c.nome);

  const completion = await client.chat.completions.create({
    model: OPENAI_MODEL,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "Você organiza a taxonomia de um marketplace industrial brasileiro. " +
          "Agrupe os produtos recebidos em categorias e subcategorias novas, coerentes " +
          "com o ramo de cada produto. Não repita categorias que já existem, a menos " +
          "que o produto realmente pertença a elas. Responda apenas em JSON no formato " +
          '{"sugestoes":[{"categoria":"string","subcategorias":["string"],"produtos_exemplo":["string"]}]}.',
      },
      {
        role: "user",
        content:
          `Categorias já existentes: ${nomesCategoriasExistentes.join(", ") || "nenhuma"}.\n\n` +
          `Produtos sem categoria (nome):\n${nomesProdutos.join("\n")}`,
      },
    ],
  });

  const conteudo = completion.choices[0]?.message?.content;
  if (!conteudo) return { erro: "A IA não retornou conteúdo." };

  let json: unknown;
  try {
    json = JSON.parse(conteudo);
  } catch {
    return { erro: "Resposta da IA não é um JSON válido." };
  }

  const sugestoesBrutas = (json as { sugestoes?: unknown }).sugestoes;
  if (!Array.isArray(sugestoesBrutas)) {
    return { erro: "Formato de resposta inesperado da IA." };
  }

  const sugestoes: SugestaoCategoria[] = sugestoesBrutas
    .filter(
      (s): s is SugestaoCategoria =>
        !!s &&
        typeof s === "object" &&
        typeof (s as SugestaoCategoria).categoria === "string" &&
        Array.isArray((s as SugestaoCategoria).subcategorias),
    )
    .map((s) => ({
      categoria: s.categoria,
      subcategorias: s.subcategorias.filter((x): x is string => typeof x === "string"),
      produtos_exemplo: Array.isArray(s.produtos_exemplo)
        ? s.produtos_exemplo.filter((x): x is string => typeof x === "string")
        : [],
    }));

  return { sugestoes };
}

// Aplica uma sugestão aprovada pelo admin: cria a categoria (se não existir)
// e as subcategorias marcadas.
export async function aplicarSugestaoIA(formData: FormData) {
  const categoriaNome = String(formData.get("categoria") ?? "").trim();
  const subcategoriasNomes = formData.getAll("subcategorias").map(String);
  if (!categoriaNome) throw new Error("Categoria inválida.");

  const supabase = await createClient();

  const { data: existente, error: eSelect } = await supabase
    .from("categorias")
    .select("id")
    .eq("nome", categoriaNome)
    .maybeSingle();
  if (eSelect) throw new Error(eSelect.message);

  let categoriaId = existente?.id as string | undefined;
  if (!categoriaId) {
    const { data: criada, error: eInsert } = await supabase
      .from("categorias")
      .insert({ nome: categoriaNome })
      .select("id")
      .single();
    if (eInsert) throw new Error(eInsert.message);
    categoriaId = criada.id;
  }

  if (subcategoriasNomes.length > 0) {
    const { error: eSub } = await supabase
      .from("subcategorias")
      .insert(subcategoriasNomes.map((nome) => ({ categoria_id: categoriaId, nome })));
    if (eSub) throw new Error(eSub.message);
  }

  revalidatePath("/admin/categorias");
}
