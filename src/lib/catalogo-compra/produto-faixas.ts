import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

/** Ids das regiões marcadas no formulário de produto (checkbox `faixas_cep`,
 *  cobertura N:N da migration 0169). */
export function faixasSelecionadas(fd: FormData): string[] {
  return fd.getAll("faixas_cep").filter((f): f is string => typeof f === "string" && f !== "");
}

/** `produtos.faixa_cep_id` virou legado com a 0169, mas as RPCs de frete ainda
 *  a leem, então recebe a primeira região marcada. */
export function primeiraFaixa(fd: FormData): string | null {
  return faixasSelecionadas(fd)[0] ?? null;
}

/** Deixa `produto_faixas_cep` igual ao que o formulário enviou: apaga tudo do
 *  produto e reinsere. Devolve a mensagem de erro, ou null em caso de sucesso.
 *
 *  Vive aqui, e não no arquivo de actions, porque um módulo `"use server"` só
 *  pode exportar Server Actions — e esta recebe o client do Supabase, que não
 *  é serializável. Assim o seller e o admin usam a mesma regra.
 *
 *  ponytail: delete + insert em vez de diff; são no máximo algumas dezenas de
 *  linhas por produto. Se um produto passar a ter centenas de regiões, aí vale
 *  comparar antes de escrever. */
export async function sincronizarFaixas(
  supabase: SupabaseClient<Database>,
  produtoId: string,
  faixas: string[],
): Promise<string | null> {
  const { error: errDel } = await supabase
    .from("produto_faixas_cep")
    .delete()
    .eq("produto_id", produtoId);
  if (errDel) return errDel.message;
  if (faixas.length === 0) return null;
  const { error: errIns } = await supabase
    .from("produto_faixas_cep")
    .insert(faixas.map((faixa_cep_id) => ({ produto_id: produtoId, faixa_cep_id })));
  return errIns?.message ?? null;
}
