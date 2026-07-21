"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth";
import { enviarEmail } from "@/lib/email";

// Grava a imagem já enviada pro bucket 'produtos' (upload client-side, ver
// ImageUpload) — mesmo padrão de anexarImagemProduto do seller, mas com o
// gate de admin em vez de dono da loja.
export async function anexarImagemProdutoAdmin(produtoId: string, url: string) {
  if (!(await isAdmin())) throw new Error("Acesso restrito a administradores.");
  const supabase = await createClient();
  const { data: max } = await supabase
    .from("produto_imagens")
    .select("ordem")
    .eq("produto_id", produtoId)
    .order("ordem", { ascending: false })
    .limit(1)
    .maybeSingle();
  const proximaOrdem = (max?.ordem ?? -1) + 1;
  const { error } = await supabase
    .from("produto_imagens")
    .insert({ produto_id: produtoId, url, ordem: proximaOrdem });
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/produtos/${produtoId}`);
}

export async function excluirImagemProduto(formData: FormData) {
  if (!(await isAdmin())) throw new Error("Acesso restrito a administradores.");
  const id = String(formData.get("id") ?? "");
  const produtoId = String(formData.get("produtoId") ?? "");
  if (!id || !produtoId) throw new Error("Parâmetros inválidos.");

  const supabase = await createClient();
  const { error } = await supabase.from("produto_imagens").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/produtos/${produtoId}`);
}

// Reordena a galeria inteira: recebe os ids na ordem final desejada e grava
// 0..n-1 em `ordem` — normaliza empates em vez de só trocar dois valores.
export async function reordenarImagens(produtoId: string, idsEmOrdem: string[]) {
  if (!(await isAdmin())) throw new Error("Acesso restrito a administradores.");
  const supabase = await createClient();
  for (let i = 0; i < idsEmOrdem.length; i++) {
    const { error } = await supabase
      .from("produto_imagens")
      .update({ ordem: i })
      .eq("id", idsEmOrdem[i]);
    if (error) throw new Error(error.message);
  }
  revalidatePath(`/admin/produtos/${produtoId}`);
}

// Curadoria: parecer do admin gravado em produto_curadoria + status refletido em
// produtos.status_produto + e-mail pro seller. As três coisas juntas porque é a
// mesma decisão — separar daria estado divergente (parecer sem status, ou
// "Recusado" sem motivo, que é exatamente o problema de hoje).
const DECISAO_STATUS = {
  aprovado: "Aprovado",
  reprovado: "Recusado",
  sugestao: "Pendente",
} as const;
type Decisao = keyof typeof DECISAO_STATUS;

export async function registrarCuradoria(formData: FormData) {
  if (!(await isAdmin())) throw new Error("Acesso restrito a administradores.");
  const produtoId = String(formData.get("produtoId") ?? "");
  const decisao = String(formData.get("decisao") ?? "") as Decisao;
  const observacao = String(formData.get("observacao") ?? "").trim();

  if (!produtoId || !(decisao in DECISAO_STATUS)) {
    throw new Error("Parâmetros inválidos para curadoria.");
  }
  // Reprovar ou sugerir sem dizer o motivo é o defeito que esta feature corrige.
  if (decisao !== "aprovado" && !observacao) {
    throw new Error("Descreva o motivo para reprovar ou sugerir ajustes.");
  }

  const supabase = await createClient();
  const { data: produto, error: erroProduto } = await supabase
    .from("produtos")
    .select("id, nome, loja_id")
    .eq("id", produtoId)
    .maybeSingle();
  if (erroProduto) throw new Error(erroProduto.message);
  if (!produto) throw new Error("Produto não encontrado.");

  const { error: erroInsert } = await supabase
    .from("produto_curadoria")
    .insert({ produto_id: produtoId, decisao, observacao: observacao || null });
  if (erroInsert) throw new Error(erroInsert.message);

  const { error: erroStatus } = await supabase
    .from("produtos")
    .update({ status_produto: DECISAO_STATUS[decisao] })
    .eq("id", produtoId);
  if (erroStatus) throw new Error(erroStatus.message);

  const { data: loja } = await supabase
    .from("lojas")
    .select("nome, email")
    .eq("id", produto.loja_id)
    .maybeSingle();

  if (loja?.email) {
    const assunto = {
      aprovado: `Produto aprovado: ${produto.nome}`,
      reprovado: `Produto reprovado: ${produto.nome}`,
      sugestao: `Ajustes sugeridos: ${produto.nome}`,
    }[decisao];
    const abertura = {
      aprovado: "Seu produto foi aprovado e já está publicado no marketplace.",
      reprovado: "Seu produto foi reprovado e não está publicado.",
      sugestao: "Revisamos seu produto e sugerimos ajustes antes da publicação.",
    }[decisao];
    // Falha de e-mail não desfaz a curadoria (já gravada e auditável); só
    // aparece pro admin no log.
    const { enviado, erro } = await enviarEmail({
      to: loja.email,
      subject: assunto,
      text: [
        `Olá, ${loja.nome ?? "vendedor"}.`,
        "",
        abertura,
        observacao ? `\nParecer da curadoria:\n${observacao}` : "",
        "",
        "Acesse o painel do vendedor para acompanhar: https://www.industria24.com.br/seller/produtos",
        "",
        "Indústria 24h",
      ].join("\n"),
    });
    if (!enviado) console.error("[curadoria] e-mail não enviado:", erro);
  }

  revalidatePath(`/admin/produtos/${produtoId}`);
  revalidatePath("/admin/produtos");
}
