"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getMinhaLoja } from "@/lib/auth";
import type { TablesInsert } from "@/lib/supabase/database.types";
import { parseCsvLinhas } from "@/lib/transportadoras/csv";
import { parseListaTransportadoras } from "@/lib/transportadoras/parser-lista";
import { parseTabelaFrete } from "@/lib/transportadoras/parser-tabela-frete";
import type { RelatorioImport } from "@/app/(admin)/admin/transportadoras/actions";

// Espelha as actions do admin, mas com loja_id da própria loja — RLS
// (transportadoras_seller_own, transportadora_faixas_frete_seller_own,
// migration 0099/0145) já restringe escrita à loja do usuário logado.

export async function importarListaTransportadorasSeller(formData: FormData): Promise<RelatorioImport> {
  const loja = await getMinhaLoja();
  if (!loja) throw new Error("Loja não encontrada.");

  const arquivo = formData.get("arquivo");
  if (!(arquivo instanceof File) || arquivo.size === 0) throw new Error("Selecione um arquivo CSV.");

  const linhas = parseCsvLinhas(await arquivo.text());
  const { validas, rejeitadas } = parseListaTransportadoras(linhas);

  const supabase = await createClient();
  if (validas.length > 0) {
    const payload: TablesInsert<"transportadoras">[] = validas.map((v) => ({
      nome: v.nome,
      fonte: v.fonte,
      prazo_dias: v.prazoDias,
      ativo: true,
      loja_id: loja.id,
    }));
    const { error } = await supabase.from("transportadoras").insert(payload);
    if (error) throw new Error(error.message);
  }

  revalidatePath("/seller/transportadoras");
  return {
    total: linhas.length,
    ok: validas.length,
    erros: rejeitadas.map((r) => `${r.linha.nome ?? "(sem nome)"}: ${r.motivo}`),
  };
}

// Sobe (ou sobrescreve) a tabela de frete de uma transportadora — própria da
// loja OU global do admin. Quando a transportadora é global, grava as faixas
// com loja_id da própria loja (override — ver spec seller-transportadoras/
// override-tabela-frete: merge por chave cep+peso, prioridade da loja no
// cálculo de checkout via cotar_frete_tabela, 0146).
export async function importarTabelaFreteSeller(formData: FormData): Promise<RelatorioImport> {
  const loja = await getMinhaLoja();
  if (!loja) throw new Error("Loja não encontrada.");

  const transportadoraId = String(formData.get("transportadora_id") ?? "").trim();
  if (!transportadoraId) throw new Error("Selecione a transportadora.");

  const arquivo = formData.get("arquivo");
  if (!(arquivo instanceof File) || arquivo.size === 0) throw new Error("Selecione um arquivo CSV.");

  const linhas = parseCsvLinhas(await arquivo.text());
  const { corrigidas, bloqueantes } = parseTabelaFrete(linhas);

  const supabase = await createClient();
  if (corrigidas.length > 0) {
    const payload = corrigidas.map((f) => ({
      transportadora_id: transportadoraId,
      loja_id: loja.id,
      cep_destino_inicial: f.cepDestinoInicial,
      cep_destino_final: f.cepDestinoFinal,
      peso_min: f.pesoMin,
      peso_max: f.pesoMax,
      valor: f.valor,
    }));
    const { error } = await supabase.from("transportadora_faixas_frete").insert(payload);
    if (error) throw new Error(error.message);
  }

  revalidatePath("/seller/transportadoras");
  return {
    total: linhas.length,
    ok: corrigidas.length,
    erros: bloqueantes.map((b) => `CEP ${b.linha["CEP destino"] ?? "?"}: ${b.motivo}`),
  };
}
