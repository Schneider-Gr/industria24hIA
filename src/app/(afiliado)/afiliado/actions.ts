"use server";

import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

// Erro que o usuário pode causar (aceite faltando, afiliação repetida) volta como
// mensagem na própria tela. `throw` aqui viraria digest genérico, porque estes
// forms usam `action={fn}` puro, sem useActionState para receber o erro.
function erroUsuario(msg: string): never {
  redirect(`/afiliado/solicitar?erro=${encodeURIComponent(msg)}`);
}

function gerarIdentificador() {
  return (
    Math.random().toString(36).substring(2, 7) +
    Math.random().toString(36).substring(2, 7)
  )
    .toUpperCase()
    .slice(0, 10);
}

const TERMOS_SLUG = {
  vendas: "termos-afiliado-vendas",
  logistica: "termos-afiliado-logistica",
} as const;

// Carimba a versão do termo aceito = atualizado_em da página CMS vigente. Se a
// página não existir (seed não aplicado), grava o instante do aceite como fallback
// para nunca deixar o campo vazio quando o aceite ocorreu.
async function versaoTermosVigente(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tipo: keyof typeof TERMOS_SLUG,
): Promise<string> {
  const { data } = await supabase
    .from("paginas_cms")
    .select("atualizado_em")
    .eq("slug", TERMOS_SLUG[tipo])
    .maybeSingle();
  return data?.atualizado_em ?? new Date().toISOString();
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

  if (!formData.get("aceite_termos")) {
    erroUsuario("É necessário aceitar os Termos do Afiliado de Vendas.");
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
    erroUsuario("Este produto não permite afiliação.");
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
    termos_aceitos_em: new Date().toISOString(),
    termos_versao: await versaoTermosVigente(supabase, "vendas"),
  });

  if (insertError) {
    throw new Error(`Erro ao solicitar afiliação: ${insertError.message}`);
  }

  revalidatePath("/afiliado/solicitar");
  revalidatePath("/afiliado");
}

export type ChavePixFormState = { ok: boolean; error?: string };

// Troca de chave PIX: caminho dedicado (RPC alterar_chave_pix_afiliado,
// 0129), nunca UPDATE genérico. Valida formato, audita e reinicia a
// carência de 24h antes de a chave ficar elegível para repasse automático
// — mesmo modelo de segurança usado para lojas (0035).
export async function alterarChavePixAfiliado(
  _prev: ChavePixFormState,
  formData: FormData,
): Promise<ChavePixFormState> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Sessão expirada. Faça login novamente." };

  const chavePix = String(formData.get("chave_pix") ?? "").trim();
  const tipoChavePix = String(formData.get("tipo_chave_pix") ?? "").trim();
  if (!chavePix || !tipoChavePix) {
    return { ok: false, error: "Preencha a chave PIX e o tipo." };
  }

  // RPC da migration 0129 ainda fora de database.types.ts (mesmo motivo do
  // webhook Asaas — ver comentário em api/asaas/webhook/route.ts).
  const supabase = (await createClient()) as unknown as {
    rpc(
      fn: "alterar_chave_pix_afiliado",
      args: { p_chave_pix: string; p_tipo_chave_pix: string },
    ): Promise<{ error: { message: string } | null }>;
  };
  const { error } = await supabase.rpc("alterar_chave_pix_afiliado", {
    p_chave_pix: chavePix,
    p_tipo_chave_pix: tipoChavePix,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/afiliado");
  return { ok: true };
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

  if (!formData.get("aceite_termos")) {
    erroUsuario("É necessário aceitar os Termos.");
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
    erroUsuario("Você já solicitou afiliação para esta loja.");
  }

  const { error: insertError } = await supabase.from("afiliacoes").insert({
    afiliado_id: user.id,
    loja_id,
    tipo,
    porcentagem: 5,
    status: "Pendente",
    identificador: gerarIdentificador(),
    termos_aceitos_em: new Date().toISOString(),
    termos_versao: await versaoTermosVigente(supabase, tipo),
  });

  if (insertError) {
    throw new Error(`Erro ao solicitar afiliação: ${insertError.message}`);
  }

  revalidatePath("/afiliado/solicitar");
  revalidatePath("/afiliado");
}
