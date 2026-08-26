"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { TablesInsert } from "@/lib/supabase/database.types";
import { parseCsvLinhas } from "@/lib/transportadoras/csv";
import { parseListaTransportadoras } from "@/lib/transportadoras/parser-lista";
import { parseTabelaFrete } from "@/lib/transportadoras/parser-tabela-frete";

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

// Upload 1: cadastro em massa de transportadoras (nome/fonte/prazo), CSV.
export async function importarListaTransportadoras(formData: FormData): Promise<RelatorioImport> {
  const arquivo = formData.get("arquivo");
  if (!(arquivo instanceof File) || arquivo.size === 0) {
    throw new Error("Selecione um arquivo CSV.");
  }

  const texto = await arquivo.text();
  const linhas = parseCsvLinhas(texto);
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

// Upload 2: tabela de frete de UMA transportadora já cadastrada, CSV no
// formato da planilha modelo (CEP destino, Peso (KG), Valor Atual Frete).
export async function importarTabelaFrete(formData: FormData): Promise<RelatorioImport> {
  const transportadoraId = String(formData.get("transportadora_id") ?? "").trim();
  if (!transportadoraId) throw new Error("Selecione a transportadora.");

  const arquivo = formData.get("arquivo");
  if (!(arquivo instanceof File) || arquivo.size === 0) {
    throw new Error("Selecione um arquivo CSV.");
  }

  const texto = await arquivo.text();
  const linhas = parseCsvLinhas(texto);
  const { corrigidas, bloqueantes } = parseTabelaFrete(linhas);

  const supabase = await createClient();
  if (corrigidas.length > 0) {
    const payload = corrigidas.map((f) => ({
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
  return {
    total: linhas.length,
    ok: corrigidas.length,
    erros: bloqueantes.map((b) => `CEP ${b.linha["CEP destino"] ?? "?"}: ${b.motivo}`),
  };
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
