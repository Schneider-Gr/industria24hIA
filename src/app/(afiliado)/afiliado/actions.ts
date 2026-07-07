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
  const loja_id = formData.get("loja_id") as string | null;

  if (!produto_id || !loja_id) {
    throw new Error();
  }

  const supabase = await createClient();

  const { data: produto, error: produtoError } = await supabase
    .from("produtos")
    .select("porcentagem_afiliado")
    .eq("id", produto_id)
    .single();

  if (produtoError) {
    throw new Error(`Erro ao buscar produto: ${produtoError.message}`);
  }

  const porcentagem = produto?.porcentagem_afiliado ?? 5;

  const { error: insertError } = await supabase.from("afiliacoes").insert({
    afiliado_id: user.id,
    produto_id,
    loja_id,
    porcentagem,
    status: "Pendente",
    identificador: gerarIdentificador(),
  });

  if (insertError) {
    throw new Error(`Erro ao solicitar afiliação: ${insertError.message}`);
  }

  revalidatePath("/afiliado/solicitar");
  revalidatePath("/afiliado");
}
