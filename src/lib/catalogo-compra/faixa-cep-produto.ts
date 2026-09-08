import "server-only";

import { createServiceClient, isServiceConfigured } from "@/lib/supabase/service";
import { cepCobertoPelaFaixa } from "./faixa-cep-regra";

// Cobertura de entrega por produto (PRD 030, paridade Bubble). O produto que
// declara uma faixa só aparece para quem está dentro dela; o produto sem faixa
// aparece para todo mundo.
//
// O fail-open é deliberado: hoje 154 dos 206 produtos não têm faixa, e tratar
// ausência como "não entrega" repetiria o incidente que o PR #517 corrigiu, em
// que a vitrine zerava para CEP fora de AM e DF.

/** Ids que o CEP do comprador exclui. Vazio quando não há CEP, não há service
 *  role ou nenhum dos produtos declara faixa. */
async function idsForaDaFaixa(ids: string[], cepComprador: number): Promise<Set<string>> {
  const fora = new Set<string>();
  if (ids.length === 0 || !isServiceConfigured) return fora;

  const supabase = createServiceClient();
  const { data } = await supabase
    .from("produtos")
    .select("id, faixas_cep!inner(cep_inicial, cep_final)")
    .in("id", ids)
    .not("faixa_cep_id", "is", null);

  for (const linha of data ?? []) {
    const faixa = Array.isArray(linha.faixas_cep) ? linha.faixas_cep[0] : linha.faixas_cep;
    if (!faixa) continue;
    if (!cepCobertoPelaFaixa(cepComprador, faixa)) fora.add(linha.id);
  }
  return fora;
}

/** Remove da lista o produto cuja faixa declarada não cobre o CEP do
 *  comprador. Sem CEP, devolve a lista intacta. */
export async function filtrarPorFaixaCep<T extends { id: string }>(
  itens: T[],
  cepComprador: string | null,
): Promise<T[]> {
  const limpo = (cepComprador ?? "").replace(/\D/g, "");
  if (limpo.length !== 8 || itens.length === 0) return itens;

  const fora = await idsForaDaFaixa(itens.map((i) => i.id), Number(limpo));
  if (fora.size === 0) return itens;

  return itens.filter((i) => !fora.has(i.id));
}
