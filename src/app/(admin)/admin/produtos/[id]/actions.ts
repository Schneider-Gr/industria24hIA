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

// Edição dos dados cadastrais do produto pelo admin. Mesmos campos de
// atualizarProduto (seller), sem o filtro de dono — a escrita cross-seller vem
// da policy is_admin (0004). O gate de papel fica aqui porque server action é
// POST público.
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

export type ProdutoAdminFormState = { ok: boolean; error?: string };

export async function salvarProdutoAdmin(
  _prev: ProdutoAdminFormState,
  formData: FormData,
): Promise<ProdutoAdminFormState> {
  if (!(await isAdmin())) return { ok: false, error: "Acesso restrito a administradores." };

  const id = str(formData, "id");
  const nome = str(formData, "nome");
  const valor = num(formData, "valor");
  if (!id) return { ok: false, error: "Produto inválido." };
  if (!nome) return { ok: false, error: "O nome do produto é obrigatório." };
  if (valor == null) return { ok: false, error: "Informe um valor válido." };

  const porcentagemAfiliado = num(formData, "porcentagem_afiliado");
  if (porcentagemAfiliado != null && (porcentagemAfiliado < 0 || porcentagemAfiliado > 100)) {
    return { ok: false, error: "A porcentagem de afiliado deve estar entre 0 e 100." };
  }

  const supabase = await createClient();
  const { data: atualizados, error } = await supabase
    .from("produtos")
    .update({
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
      permite_logistica_afiliado: formData.get("permite_logistica_afiliado") === "on",
      altura: num(formData, "altura"),
      comprimento: num(formData, "comprimento"),
      largura: num(formData, "largura"),
      peso: num(formData, "peso"),
      frete_gratis: formData.get("frete_gratis") === "on",
    })
    .eq("id", id)
    .select("id");

  if (error) return { ok: false, error: error.message };
  if (!atualizados || atualizados.length === 0) {
    return { ok: false, error: "Produto não encontrado ou sem permissão para editar." };
  }

  const imagemUrl = str(formData, "imagem_url");
  if (imagemUrl) {
    await supabase.from("produto_imagens").insert({ produto_id: id, url: imagemUrl });
  }

  revalidatePath(`/admin/produtos/${id}`);
  revalidatePath("/admin/produtos");
  return { ok: true };
}

// Sugestões geradas pelo agente CrewAI de curadoria (produto_sugestoes_ia,
// migration 0082). O agente só grava propostas via service_role; aplicar ou
// descartar é sempre decisão humana do admin, nunca automático.
export async function aplicarSugestaoIA(formData: FormData) {
  if (!(await isAdmin())) throw new Error("Acesso restrito a administradores.");

  const sugestaoId = String(formData.get("sugestaoId") ?? "");
  const produtoId = String(formData.get("produtoId") ?? "");
  const tipo = String(formData.get("tipo") ?? "");
  const conteudo = String(formData.get("conteudo") ?? "");
  if (!sugestaoId || !produtoId || !tipo) throw new Error("Sugestão inválida.");

  const supabase = await createClient();

  if (tipo === "descricao") {
    await supabase.from("produtos").update({ descricao: conteudo }).eq("id", produtoId);
  } else if (tipo === "imagem") {
    await supabase.from("produto_imagens").insert({ produto_id: produtoId, url: conteudo });
  }
  // tipo "dados_loja" fica só como leitura no admin/lojas — não altera aqui.

  const {
    data: { user },
  } = await supabase.auth.getUser();
  await supabase
    .from("produto_sugestoes_ia")
    .update({ status: "aplicada", resolved_at: new Date().toISOString(), resolved_by: user?.id ?? null })
    .eq("id", sugestaoId);

  revalidatePath(`/admin/produtos/${produtoId}`);
}

export async function descartarSugestaoIA(formData: FormData) {
  if (!(await isAdmin())) throw new Error("Acesso restrito a administradores.");

  const sugestaoId = String(formData.get("sugestaoId") ?? "");
  const produtoId = String(formData.get("produtoId") ?? "");
  if (!sugestaoId) throw new Error("Sugestão inválida.");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  await supabase
    .from("produto_sugestoes_ia")
    .update({ status: "descartada", resolved_at: new Date().toISOString(), resolved_by: user?.id ?? null })
    .eq("id", sugestaoId);

  revalidatePath(`/admin/produtos/${produtoId}`);
}
