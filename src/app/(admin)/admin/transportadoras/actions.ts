"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { TablesInsert } from "@/lib/supabase/database.types";
import { parseListaTransportadoras } from "@/lib/transportadoras/parser-lista";
import { parseTabelaFrete, type FaixaFreteCorrigida } from "@/lib/transportadoras/parser-tabela-frete";
import { lerLinhasArquivo } from "@/lib/transportadoras/arquivo";

// CRUD de transportadoras globais (admin). Escrita protegida pela RLS
// transportadoras_admin_all; aqui só validamos entrada e montamos o payload.

function parseIntOrNull(v: FormDataEntryValue | null): number | null {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? Math.trunc(n) : null;
}

export async function salvarTransportadora(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim() || null;
  const nome = String(formData.get("nome") ?? "").trim();
  if (!nome) throw new Error("Nome da transportadora é obrigatório.");

  const fonte = String(formData.get("fonte") ?? "interna");
  if (fonte !== "interna" && fonte !== "mercado_envios") {
    throw new Error("Fonte inválida.");
  }

  const payload: TablesInsert<"transportadoras"> = {
    nome,
    fonte,
    ativo: formData.get("ativo") === "on",
    prazo_dias: parseIntOrNull(formData.get("prazo_dias")),
    loja_id: null, // admin cadastra transportadoras globais
  };

  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("transportadoras").update(payload).eq("id", id)
    : await supabase.from("transportadoras").insert(payload);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/transportadoras");
}

export type RelatorioImport = { total: number; ok: number; erros: string[] };

// Upload 1: cadastro em massa de transportadoras (nome/fonte/prazo), CSV ou XLSX.
export async function importarListaTransportadoras(formData: FormData): Promise<RelatorioImport> {
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

  revalidatePath("/admin/transportadoras");
  return {
    total: linhas.length,
    ok: validas.length,
    erros: rejeitadas.map((r) => `${r.linha.nome ?? "(sem nome)"}: ${r.motivo}`),
  };
}

export type PreviewTabelaFrete = {
  corrigidas: FaixaFreteCorrigida[];
  erros: string[];
};

// Upload 2, etapa 1/2: só processa o arquivo (CSV ou XLSX) e devolve as
// faixas candidatas — nada é gravado aqui (spec admin-transportadoras/
// preview-import).
export async function pravisualizarTabelaFrete(formData: FormData): Promise<PreviewTabelaFrete> {
  const arquivo = formData.get("arquivo");
  if (!(arquivo instanceof File) || arquivo.size === 0) {
    throw new Error("Selecione um arquivo CSV ou XLSX.");
  }

  const linhas = await lerLinhasArquivo(arquivo);
  const { corrigidas, bloqueantes } = parseTabelaFrete(linhas);

  return {
    corrigidas,
    erros: bloqueantes.map((b) => `CEP ${b.linha["CEP destino"] ?? "?"}: ${b.motivo}`),
  };
}

// Upload 2, etapa 2/2: grava só as faixas que o usuário confirmou no preview.
export async function confirmarImportTabelaFrete(
  transportadoraId: string,
  faixas: FaixaFreteCorrigida[],
): Promise<{ ok: number }> {
  if (!transportadoraId) throw new Error("Selecione a transportadora.");

  const supabase = await createClient();
  if (faixas.length > 0) {
    const payload = faixas.map((f) => ({
      transportadora_id: transportadoraId,
      loja_id: null,
      cep_destino_inicial: f.cepDestinoInicial,
      cep_destino_final: f.cepDestinoFinal,
      peso_min: f.pesoMin,
      peso_max: f.pesoMax,
      valor: f.valor,
    }));
    const { error } = await supabase.from("transportadora_faixas_frete").insert(payload);
    if (error) throw new Error(error.message);

    // Transportadora passa a ter fonte='tabela_importada' (0145).
    await supabase
      .from("transportadoras")
      .update({ fonte: "tabela_importada" })
      .eq("id", transportadoraId);
  }

  revalidatePath("/admin/transportadoras");
  revalidatePath(`/admin/transportadoras/${transportadoraId}`);
  return { ok: faixas.length };
}

// Gestão de faixas (spec admin-transportadoras/gestao-faixas): ativa/desativa
// uma faixa individual — reaproveita a coluna `ativo` já existente (0145).
export async function alternarFaixaFrete(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  const ativo = formData.get("ativo") === "true"; // estado atual → inverte
  const transportadoraId = String(formData.get("transportadora_id") ?? "").trim();
  if (!id) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("transportadora_faixas_frete")
    .update({ ativo: !ativo })
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath(`/admin/transportadoras/${transportadoraId}`);
}

export async function alternarTransportadora(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  const ativo = formData.get("ativo") === "true"; // estado atual → inverte
  if (!id) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("transportadoras")
    .update({ ativo: !ativo })
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/transportadoras");
}
