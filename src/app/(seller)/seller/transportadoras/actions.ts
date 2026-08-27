"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getMinhaLoja } from "@/lib/auth";
import type { TablesInsert } from "@/lib/supabase/database.types";
import { parseListaTransportadoras } from "@/lib/transportadoras/parser-lista";
import { parseTabelaFrete, type FaixaFreteCorrigida } from "@/lib/transportadoras/parser-tabela-frete";
import { lerLinhasArquivo } from "@/lib/transportadoras/arquivo";
import type { RelatorioImport, PreviewTabelaFrete } from "@/app/(admin)/admin/transportadoras/actions";

// Espelha as actions do admin, mas com loja_id da própria loja — RLS
// (transportadoras_seller_own, transportadora_faixas_frete_seller_own,
// migration 0099/0145) já restringe escrita à loja do usuário logado.

export async function importarListaTransportadorasSeller(formData: FormData): Promise<RelatorioImport> {
  const loja = await getMinhaLoja();
  if (!loja) throw new Error("Loja não encontrada.");

  const arquivo = formData.get("arquivo");
  if (!(arquivo instanceof File) || arquivo.size === 0) throw new Error("Selecione um arquivo CSV ou XLSX.");

  const linhas = await lerLinhasArquivo(arquivo);
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

// Preview (etapa 1/2) — mesma lógica do admin, sem gravar (spec
// admin-transportadoras/preview-import, vale pro seller também).
export async function pravisualizarTabelaFreteSeller(formData: FormData): Promise<PreviewTabelaFrete> {
  const loja = await getMinhaLoja();
  if (!loja) throw new Error("Loja não encontrada.");

  const arquivo = formData.get("arquivo");
  if (!(arquivo instanceof File) || arquivo.size === 0) throw new Error("Selecione um arquivo CSV ou XLSX.");

  const linhas = await lerLinhasArquivo(arquivo);
  const { corrigidas, bloqueantes } = parseTabelaFrete(linhas);

  return {
    corrigidas,
    erros: bloqueantes.map((b) => `CEP ${b.linha["CEP destino"] ?? "?"}: ${b.motivo}`),
  };
}

// Confirmação (etapa 2/2) — grava com loja_id da própria loja. Quando a
// transportadora é global, isso vira o override (spec seller-transportadoras/
// override-tabela-frete: merge por chave cep+peso, prioridade da loja no
// cálculo de checkout via cotar_frete_tabela, 0146/0148).
export async function confirmarImportTabelaFreteSeller(
  transportadoraId: string,
  faixas: FaixaFreteCorrigida[],
): Promise<{ ok: number }> {
  const loja = await getMinhaLoja();
  if (!loja) throw new Error("Loja não encontrada.");
  if (!transportadoraId) throw new Error("Selecione a transportadora.");

  const supabase = await createClient();
  if (faixas.length > 0) {
    const payload = faixas.map((f) => ({
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
  return { ok: faixas.length };
}
