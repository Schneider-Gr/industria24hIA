"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { TablesInsert } from "@/lib/supabase/database.types";

export type ProdutoFormState = { ok: boolean; error?: string };

function num(fd: FormData, key: string): number | null {
  const v = fd.get(key);
  if (typeof v !== "string" || v.trim() === "") return null;
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function str(fd: FormData, key: string): string | null {
  const v = fd.get(key);
  const s = typeof v === "string" ? v.trim() : "";
  return s === "" ? null : s;
}

export async function criarProduto(
  _prev: ProdutoFormState,
  formData: FormData,
): Promise<ProdutoFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada. Faça login novamente." };

  // owner_id explícito: a policy pública lojas_public_read (Ativa) combina via OR
  // com a do dono, então sem este filtro isto podia gravar o produto na loja de
  // OUTRO seller (bug real encontrado em QA — ver auth.ts:getMinhaLoja).
  const { data: loja } = await supabase
    .from("lojas")
    .select("id")
    .eq("owner_id", user.id)
    .limit(1)
    .maybeSingle();
  if (!loja) return { ok: false, error: "Cadastre sua loja antes de adicionar produtos." };

  const nome = str(formData, "nome");
  const valor = num(formData, "valor");
  if (!nome) return { ok: false, error: "O nome do produto é obrigatório." };
  if (valor == null) return { ok: false, error: "Informe um valor válido." };

  const porcentagemAfiliado = num(formData, "porcentagem_afiliado");
  if (porcentagemAfiliado != null && (porcentagemAfiliado < 0 || porcentagemAfiliado > 100)) {
    return { ok: false, error: "A porcentagem de afiliado deve estar entre 0 e 100." };
  }
  const estoqueAtual = num(formData, "estoque_atual") ?? 0;
  const quantidadeMinima = num(formData, "quantidade_minima");
  const altura = num(formData, "altura");
  const comprimento = num(formData, "comprimento");
  const largura = num(formData, "largura");
  const peso = num(formData, "peso");
  for (const [campo, v] of [
    ["estoque_atual", estoqueAtual],
    ["quantidade_minima", quantidadeMinima],
    ["altura", altura],
    ["comprimento", comprimento],
    ["largura", largura],
    ["peso", peso],
  ] as const) {
    if (v != null && v < 0) return { ok: false, error: `O campo ${campo} não pode ser negativo.` };
  }

  const payload: TablesInsert<"produtos"> = {
    loja_id: loja.id,
    nome,
    valor,
    descricao: str(formData, "descricao"),
    sku: str(formData, "sku"),
    cep_produto: str(formData, "cep_produto"),
    quantidade_minima: quantidadeMinima,
    estoque_atual: estoqueAtual,
    categoria_id: str(formData, "categoria_id"),
    subcategoria_id: str(formData, "subcategoria_id"),
    permite_afiliacao: formData.get("permite_afiliacao") === "on",
    porcentagem_afiliado: porcentagemAfiliado,
    altura,
    comprimento,
    largura,
    peso,
    frete_gratis: formData.get("frete_gratis") === "on",
  };

  const { data: produto, error } = await supabase
    .from("produtos")
    .insert(payload)
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };

  // Vincula centros de distribuição selecionados (multi).
  const centros = formData.getAll("centros").filter((c): c is string => typeof c === "string");
  if (centros.length) {
    const vinculos = centros.map((centro_id) => ({ produto_id: produto.id, centro_id }));
    const { error: errCentro } = await supabase.from("produto_centros").insert(vinculos);
    if (errCentro) return { ok: false, error: errCentro.message };
  }

  revalidatePath("/seller/produtos");
  return { ok: true };
}

// Garante que o produto pertence à loja do usuário logado antes de mutar
// (mesma razão do owner_id explícito em criarProduto).
async function produtoDaMinhaLoja(produtoId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("produtos")
    .select("id, lojas!inner(owner_id)")
    .eq("id", produtoId)
    .eq("lojas.owner_id", user.id)
    .maybeSingle();
  return data ? supabase : null;
}

export async function excluirProduto(formData: FormData) {
  const id = formData.get("id");
  if (typeof id !== "string") return;
  const supabase = await produtoDaMinhaLoja(id);
  if (!supabase) return;
  await supabase.from("produtos").delete().eq("id", id);
  revalidatePath("/seller/produtos");
}

// "Cadastrar Valor mínimo" do Bubble: define a quantidade mínima (estoque
// crítico) de um produto direto na listagem.
export async function salvarValorMinimo(formData: FormData) {
  const id = formData.get("id");
  const minimo = num(formData, "quantidade_minima");
  if (typeof id !== "string" || minimo == null || minimo < 0) return;
  const supabase = await produtoDaMinhaLoja(id);
  if (!supabase) return;
  await supabase.from("produtos").update({ quantidade_minima: minimo }).eq("id", id);
  revalidatePath("/seller/produtos");
}

// Chamado pelo ImageUpload (client) depois do upload direto pro Storage —
// só grava a linha em produto_imagens, o arquivo já está no bucket.
export async function anexarImagemProduto(produtoId: string, url: string) {
  const supabase = await produtoDaMinhaLoja(produtoId);
  if (!supabase) return;
  await supabase.from("produto_imagens").insert({ produto_id: produtoId, url });
  revalidatePath("/seller/produtos");
}

export async function atualizarProduto(
  _prev: ProdutoFormState,
  formData: FormData,
): Promise<ProdutoFormState> {
  const id = formData.get("id");
  if (typeof id !== "string") return { ok: false, error: "Produto inválido." };

  const supabase = await produtoDaMinhaLoja(id);
  if (!supabase) return { ok: false, error: "Produto não encontrado." };

  const nome = str(formData, "nome");
  const valor = num(formData, "valor");
  if (!nome) return { ok: false, error: "O nome do produto é obrigatório." };
  if (valor == null) return { ok: false, error: "Informe um valor válido." };

  const porcentagemAfiliado = num(formData, "porcentagem_afiliado");
  if (porcentagemAfiliado != null && (porcentagemAfiliado < 0 || porcentagemAfiliado > 100)) {
    return { ok: false, error: "A porcentagem de afiliado deve estar entre 0 e 100." };
  }

  const payload = {
    nome,
    valor,
    descricao: str(formData, "descricao"),
    sku: str(formData, "sku"),
    cep_produto: str(formData, "cep_produto"),
    quantidade_minima: num(formData, "quantidade_minima"),
    estoque_atual: num(formData, "estoque_atual") ?? 0,
    categoria_id: str(formData, "categoria_id"),
    subcategoria_id: str(formData, "subcategoria_id"),
    permite_afiliacao: formData.get("permite_afiliacao") === "on",
    porcentagem_afiliado: porcentagemAfiliado,
    altura: num(formData, "altura"),
    comprimento: num(formData, "comprimento"),
    largura: num(formData, "largura"),
    peso: num(formData, "peso"),
    frete_gratis: formData.get("frete_gratis") === "on",
  };

  const { error } = await supabase.from("produtos").update(payload).eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/seller/produtos");
  return { ok: true };
}

// Reenvia produto Recusado/Em análise pra fila de moderação (0052 permite
// só essa transição pro dono; aprovar continua exclusivo de admin).
export async function solicitarAprovacao(formData: FormData) {
  const id = formData.get("id");
  if (typeof id !== "string") return;
  const supabase = await produtoDaMinhaLoja(id);
  if (!supabase) return;
  await supabase.from("produtos").update({ status_produto: "Pendente" }).eq("id", id);
  revalidatePath("/seller/produtos");
}
