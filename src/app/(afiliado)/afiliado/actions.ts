"use server";

import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";

function gerarIdentificador() {
  return (
    Math.random().toString(36).substring(2, 7) +
    Math.random().toString(36).substring(2, 7)
  )
    .toUpperCase()
    .slice(0, 10);
}

export async function solicitarAfiliacao(formData: FormData) {
  const user = await getUser();

  if (!user) {
    throw new Error();
  }

  const produto_id = formData.get("produto_id") as string | null;

  if (!produto_id) {
    throw new Error("Produto inválido.");
  }

  const supabase = await createClient();

  // loja_id vem do PRÓPRIO produto, nunca do form: sem isto o afiliado plantava
  // uma afiliação apontando para a loja de terceiro (a RLS 0014 também barra,
  // mas derivar aqui evita o erro e mantém a fonte única).
  const { data: produto, error: produtoError } = await supabase
    .from("produtos")
    .select("loja_id, porcentagem_afiliado, permite_afiliacao")
    .eq("id", produto_id)
    .single();

  if (produtoError) {
    throw new Error(`Erro ao buscar produto: ${produtoError.message}`);
  }

  if (!produto?.permite_afiliacao) {
    throw new Error("Este produto não permite afiliação.");
  }

  const porcentagem = produto?.porcentagem_afiliado ?? 5;

  const { error: insertError } = await supabase.from("afiliacoes").insert({
    afiliado_id: user.id,
    produto_id,
    loja_id: produto.loja_id,
    porcentagem,
    tipo: "vendas",
    status: "Pendente",
    identificador: gerarIdentificador(),
  });

  if (insertError) {
    throw new Error(`Erro ao solicitar afiliação: ${insertError.message}`);
  }

  revalidatePath("/afiliado/solicitar");
  revalidatePath("/afiliado");
}

export async function solicitarAfiliacaoLoja(formData: FormData) {
  const user = await getUser();

  if (!user) {
    throw new Error("Você precisa estar logado para solicitar afiliação.");
  }

  const loja_id = formData.get("loja_id") as string | null;
  const tipo = formData.get("tipo") as string | null;

  if (!loja_id || (tipo !== "vendas" && tipo !== "logistica")) {
    throw new Error("Dados inválidos para solicitação de afiliação.");
  }

  const supabase = await createClient();

  const { data: existente, error: existenteError } = await supabase
    .from("afiliacoes")
    .select("id")
    .eq("afiliado_id", user.id)
    .eq("loja_id", loja_id)
    .eq("tipo", tipo)
    .maybeSingle();

  if (existenteError) {
    throw new Error(
      `Erro ao verificar afiliação existente: ${existenteError.message}`,
    );
  }

  if (existente) {
    throw new Error("Você já solicitou afiliação para esta loja.");
  }

  const { error: insertError } = await supabase.from("afiliacoes").insert({
    afiliado_id: user.id,
    loja_id,
    tipo,
    porcentagem: 5,
    status: "Pendente",
    identificador: gerarIdentificador(),
  });

  if (insertError) {
    throw new Error(`Erro ao solicitar afiliação: ${insertError.message}`);
  }

  revalidatePath("/afiliado/solicitar");
  revalidatePath("/afiliado");
}
