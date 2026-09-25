"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient, isServiceConfigured } from "@/lib/supabase/service";
import { isAdmin } from "@/lib/auth";
import { enviarEmail } from "@/lib/email";
import type { TablesInsert } from "@/lib/supabase/database.types";
import { parseListaTransportadoras } from "@/lib/transportadoras/parser-lista";
import { paraRpc, prepararTabela, resumoPreview, type PreviewTabela } from "@/lib/transportadoras/parser-tabela-frete";
import { cadastroDoForm } from "@/lib/transportadoras/cadastro";
import { lerLinhasArquivo } from "@/lib/transportadoras/arquivo";
import type { ResultadoForm } from "@/app/(seller)/seller/transportadoras/actions";

// Transportadoras globais (spec admin-transportadoras/transportadora-global)
// e moderação das próprias das lojas. Escrita protegida pela RLS de admin e
// pelos triggers da 0199; aqui a action confere o papel de novo.

const CAMINHO = "/admin/transportadoras";

async function exigirAdmin() {
  if (!(await isAdmin())) throw new Error("Acesso restrito ao admin.");
}

export async function salvarTransportadora(_: ResultadoForm | null, fd: FormData): Promise<ResultadoForm> {
  await exigirAdmin();
  const id = String(fd.get("id") ?? "").trim() || null;
  const { erros, payload } = cadastroDoForm(fd);
  if (Object.keys(erros).length > 0) return { ok: false, erros: erros as Record<string, string> };
  const encerra = String(fd.get("encerra_em") ?? "").trim();
  if (encerra && !/^\d{4}-\d{2}-\d{2}$/.test(encerra)) return { ok: false, erros: { encerra_em: "Data inválida." } };

  const supabase = await createClient();
  const dados = { ...payload, encerra_em: encerra || null };
  const { error } = id
    ? await supabase.from("transportadoras").update(dados).eq("id", id).is("loja_id", null)
    : await supabase.from("transportadoras").insert({ ...dados, fonte: "tabela_importada", ativo: true, loja_id: null });
  if (error) return { ok: false, erro: error.message };
  revalidatePath(CAMINHO);
  if (id) revalidatePath(`${CAMINHO}/${id}`);
  return { ok: true };
}

export type RelatorioImport = { total: number; ok: number; erros: string[] };

// Cadastro em massa de globais (nome, fonte, prazo), CSV ou XLSX.
export async function importarListaTransportadoras(formData: FormData): Promise<RelatorioImport> {
  await exigirAdmin();
  const arquivo = formData.get("arquivo");
  if (!(arquivo instanceof File) || arquivo.size === 0) {
    throw new Error("Selecione um arquivo CSV ou XLSX.");
  }

  const linhas = await lerLinhasArquivo(arquivo);
  const { validas, rejeitadas } = parseListaTransportadoras(linhas);

  const supabase = await createClient();
  if (validas.length > 0) {
    const payload: TablesInsert<"transportadoras">[] = validas.map((v) => ({
      nome: v.nome,
      fonte: v.fonte,
      prazo_dias: v.prazoDias,
      ativo: true,
      loja_id: null,
    }));
    const { error } = await supabase.from("transportadoras").insert(payload);
    if (error) throw new Error(error.message);
  }

  revalidatePath(CAMINHO);
  return {
    total: linhas.length,
    ok: validas.length,
    erros: rejeitadas.map((r) => `${r.linha.nome ?? "(sem nome)"}: ${r.motivo}`),
  };
}

async function lerTabela(fd: FormData) {
  const arquivo = fd.get("arquivo");
  if (!(arquivo instanceof File) || arquivo.size === 0) throw new Error("Selecione um arquivo CSV ou XLSX.");
  return prepararTabela(await lerLinhasArquivo(arquivo, "Faixas"));
}

export async function pravisualizarTabelaFrete(fd: FormData): Promise<PreviewTabela> {
  await exigirAdmin();
  return resumoPreview(await lerTabela(fd));
}

export async function confirmarImportTabelaFrete(fd: FormData): Promise<{ ok: number }> {
  await exigirAdmin();
  const id = String(fd.get("transportadora_id") ?? "");
  if (!id) throw new Error("Selecione a transportadora.");
  const tabela = await lerTabela(fd);
  if (!tabela.podeGravar) throw new Error(tabela.recusa ?? "A tabela tem faixas sobrepostas ou nenhuma faixa válida.");

  const supabase = await createClient();
  const { data: t } = await supabase.from("transportadoras").select("nome, fator_cubagem").eq("id", id).maybeSingle();
  if (!t) throw new Error("Transportadora não encontrada.");
  if (!(t.fator_cubagem && t.fator_cubagem > 0)) {
    throw new Error("Informe o fator de cubagem da transportadora antes de subir a tabela.");
  }
  const { data, error } = await supabase.rpc("substituir_faixas_transportadora", {
    p_transportadora_id: id,
    p_faixas: tabela.faixas.map(paraRpc),
  });
  if (error) throw new Error(error.message);

  await avisarTabelaAtualizada(id, t.nome);
  revalidatePath(CAMINHO);
  revalidatePath(`${CAMINHO}/${id}`);
  return { ok: data ?? 0 };
}

// Lojas que ativaram a global recebem o aviso de tabela nova (design D11).
// Falha de e-mail não desfaz a troca da tabela: o painel do seller também
// mostra a data da atualização.
async function avisarTabelaAtualizada(transportadoraId: string, nome: string) {
  if (!isServiceConfigured) return;
  const svc = createServiceClient();
  const { data: ativacoes } = await svc
    .from("loja_transportadoras")
    .select("lojas(email)")
    .eq("transportadora_id", transportadoraId)
    .eq("ativo", true);
  const emails = [...new Set((ativacoes ?? []).map((a) => a.lojas?.email).filter((e): e is string => !!e))];
  const data = new Date().toLocaleDateString("pt-BR");
  for (const to of emails) {
    await enviarEmail({
      to,
      subject: `Tabela de frete da ${nome} atualizada`,
      text: `A Indústria 24h atualizou em ${data} a tabela de frete da ${nome}, que está ativa na sua loja. Os novos valores já valem no checkout. Confira em https://industria24.com.br/seller/transportadoras`,
    });
  }
}

export async function alternarFaixaFrete(formData: FormData) {
  await exigirAdmin();
  const id = String(formData.get("id") ?? "").trim();
  const ativo = formData.get("ativo") === "true";
  const transportadoraId = String(formData.get("transportadora_id") ?? "").trim();
  if (!id) return;

  const supabase = await createClient();
  const { error } = await supabase.from("transportadora_faixas_frete").update({ ativo: !ativo }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`${CAMINHO}/${transportadoraId}`);
}

export async function alternarTransportadora(formData: FormData) {
  await exigirAdmin();
  const id = String(formData.get("id") ?? "").trim();
  const ativo = formData.get("ativo") === "true";
  if (!id) return;

  const supabase = await createClient();
  const { error } = await supabase.from("transportadoras").update({ ativo: !ativo }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(CAMINHO);
}

// Moderação de transportadora própria de loja (decisão 18 do PRD 049): o
// admin desativa com motivo; só o admin reativa (trigger da 0199).
export async function moderarTransportadoraPropria(formData: FormData) {
  await exigirAdmin();
  const id = String(formData.get("id") ?? "").trim();
  const acao = String(formData.get("acao") ?? "");
  const motivo = String(formData.get("motivo") ?? "").trim();
  if (!id) return;
  if (acao === "desativar" && !motivo) throw new Error("Informe o motivo da desativação.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("transportadoras")
    .update(
      acao === "desativar"
        ? { ativo: false, desativada_por_admin: true, motivo_desativacao: motivo }
        : { ativo: true, desativada_por_admin: false, motivo_desativacao: null },
    )
    .eq("id", id)
    .not("loja_id", "is", null);
  if (error) throw new Error(error.message);
  revalidatePath(CAMINHO);
}
