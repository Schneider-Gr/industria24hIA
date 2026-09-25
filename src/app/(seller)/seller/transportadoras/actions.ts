"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getMinhaLoja } from "@/lib/auth";
import { cadastroDoForm } from "@/lib/transportadoras/cadastro";
import { lerLinhasArquivo } from "@/lib/transportadoras/arquivo";
import { paraRpc, prepararTabela, resumoPreview, type PreviewTabela } from "@/lib/transportadoras/parser-tabela-frete";

// Transportadoras próprias da loja (spec seller-transportadoras/
// cadastro-transportadora). A RLS (0099 e 0199) já restringe a escrita à loja
// do usuário; aqui a loja é resolvida por dono de novo, e a troca da tabela
// passa pela RPC substituir_faixas_transportadora, que confere dono,
// moderação e sobreposição no banco.

const CAMINHO = "/seller/transportadoras";

async function lojaOuErro() {
  const loja = await getMinhaLoja();
  if (!loja) throw new Error("Loja não encontrada.");
  return loja;
}

export type ResultadoForm = { ok: boolean; erro?: string; erros?: Record<string, string> };

export async function salvarTransportadoraPropria(_: ResultadoForm | null, fd: FormData): Promise<ResultadoForm> {
  const loja = await lojaOuErro();
  const id = String(fd.get("id") ?? "").trim() || null;
  const { erros, payload } = cadastroDoForm(fd);
  if (Object.keys(erros).length > 0) return { ok: false, erros: erros as Record<string, string> };

  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("transportadoras").update(payload).eq("id", id).eq("loja_id", loja.id)
    : await supabase.from("transportadoras").insert({ ...payload, fonte: "tabela_importada", ativo: true, loja_id: loja.id });
  if (error) {
    if (error.code === "23505") return { ok: false, erros: { nome: "Sua loja já tem uma transportadora com esse nome." } };
    return { ok: false, erro: error.message };
  }
  revalidatePath(CAMINHO);
  if (id) revalidatePath(`${CAMINHO}/${id}`);
  return { ok: true };
}

export async function alternarTransportadoraPropria(fd: FormData) {
  const loja = await lojaOuErro();
  const id = String(fd.get("id") ?? "");
  const ativo = fd.get("ativo") === "true";
  const supabase = await createClient();
  const { error } = await supabase
    .from("transportadoras")
    .update({ ativo: !ativo })
    .eq("id", id)
    .eq("loja_id", loja.id);
  if (error) throw new Error(error.message);
  revalidatePath(CAMINHO);
  revalidatePath(`${CAMINHO}/${id}`);
}

async function lerTabela(fd: FormData) {
  const arquivo = fd.get("arquivo");
  if (!(arquivo instanceof File) || arquivo.size === 0) throw new Error("Selecione um arquivo CSV ou XLSX.");
  return prepararTabela(await lerLinhasArquivo(arquivo, "Faixas"));
}

async function transportadoraPropria(id: string, lojaId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("transportadoras")
    .select("id, fator_cubagem, desativada_por_admin")
    .eq("id", id)
    .eq("loja_id", lojaId)
    .maybeSingle();
  if (!data) throw new Error("Selecione uma transportadora da sua loja.");
  if (data.desativada_por_admin) throw new Error("Transportadora desativada pelo admin.");
  if (!(data.fator_cubagem && data.fator_cubagem > 0)) {
    throw new Error("Informe o fator de cubagem da transportadora antes de subir a tabela.");
  }
  return data;
}

export async function previsualizarTabelaSeller(fd: FormData): Promise<PreviewTabela> {
  const loja = await lojaOuErro();
  await transportadoraPropria(String(fd.get("transportadora_id") ?? ""), loja.id);
  return resumoPreview(await lerTabela(fd));
}

export async function confirmarTabelaSeller(fd: FormData): Promise<{ ok: number }> {
  const loja = await lojaOuErro();
  const id = String(fd.get("transportadora_id") ?? "");
  await transportadoraPropria(id, loja.id);
  const tabela = await lerTabela(fd);
  if (!tabela.podeGravar) throw new Error(tabela.recusa ?? "A tabela tem faixas sobrepostas ou nenhuma faixa válida.");

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("substituir_faixas_transportadora", {
    p_transportadora_id: id,
    p_faixas: tabela.faixas.map(paraRpc),
  });
  if (error) throw new Error(error.message);
  revalidatePath(CAMINHO);
  revalidatePath(`${CAMINHO}/${id}`);
  return { ok: data ?? 0 };
}

export async function alternarFaixaPropria(fd: FormData) {
  await lojaOuErro();
  const id = String(fd.get("id") ?? "");
  const transportadoraId = String(fd.get("transportadora_id") ?? "");
  const ativo = fd.get("ativo") === "true";
  const supabase = await createClient();
  // RLS limita à loja; o trigger da 0199 só deixa mudar `ativo` e revalida
  // sobreposição ao religar.
  const { error } = await supabase.from("transportadora_faixas_frete").update({ ativo: !ativo }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`${CAMINHO}/${transportadoraId}`);
}

export async function salvarCategorias(transportadoraId: string, nos: string[]): Promise<ResultadoForm> {
  const loja = await lojaOuErro();
  const supabase = await createClient();
  const { data: t } = await supabase
    .from("transportadoras")
    .select("id")
    .eq("id", transportadoraId)
    .eq("loja_id", loja.id)
    .maybeSingle();
  if (!t) return { ok: false, erro: "Transportadora não encontrada na sua loja." };

  const unicos = [...new Set(nos)].slice(0, 50);
  const { error: delErr } = await supabase.from("transportadora_nos").delete().eq("transportadora_id", transportadoraId);
  if (delErr) return { ok: false, erro: delErr.message };
  if (unicos.length > 0) {
    const { error } = await supabase
      .from("transportadora_nos")
      .insert(unicos.map((n) => ({ transportadora_id: transportadoraId, taxonomia_no_id: n })));
    if (error) return { ok: false, erro: error.message };
  }
  await supabase.from("transportadoras").update({ revisar_categorias: false }).eq("id", transportadoraId);
  revalidatePath(CAMINHO);
  revalidatePath(`${CAMINHO}/${transportadoraId}`);
  return { ok: true };
}

export async function buscarNosTaxonomia(termo: string): Promise<{ id: string; nome: string; caminho: string }[]> {
  await lojaOuErro();
  const q = termo.trim();
  if (q.length < 2) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("taxonomia_nos")
    .select("id, nome, caminho")
    .eq("obsoleto", false)
    .ilike("nome", `%${q.replace(/[%_]/g, "")}%`)
    .order("nivel")
    .limit(20);
  return (data ?? []).map((n) => ({ id: n.id, nome: n.nome, caminho: n.caminho || n.nome }));
}

export async function ativarGlobal(_: ResultadoForm | null, fd: FormData): Promise<ResultadoForm> {
  const loja = await lojaOuErro();
  const transportadoraId = String(fd.get("transportadora_id") ?? "");
  const codigo = String(fd.get("codigo_cliente") ?? "").trim();
  if (!codigo) return { ok: false, erros: { codigo_cliente: "Informe o seu código de cliente nesta transportadora." } };
  if (fd.get("aceite") !== "on") return { ok: false, erros: { aceite: "Confirme que você tem contrato ativo com ela." } };

  const supabase = await createClient();
  const { error } = await supabase.from("loja_transportadoras").upsert(
    {
      loja_id: loja.id,
      transportadora_id: transportadoraId,
      codigo_cliente: codigo,
      // o trigger da 0199 troca pela hora do servidor
      contrato_aceito_em: new Date().toISOString(),
      ativo: true,
    },
    { onConflict: "loja_id,transportadora_id" },
  );
  if (error) return { ok: false, erro: error.message };
  revalidatePath(CAMINHO);
  return { ok: true };
}

export async function desativarGlobal(fd: FormData) {
  const loja = await lojaOuErro();
  const supabase = await createClient();
  const { error } = await supabase
    .from("loja_transportadoras")
    .update({ ativo: false })
    .eq("loja_id", loja.id)
    .eq("transportadora_id", String(fd.get("transportadora_id") ?? ""));
  if (error) throw new Error(error.message);
  revalidatePath(CAMINHO);
}
