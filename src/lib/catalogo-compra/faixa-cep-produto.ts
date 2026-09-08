import "server-only";

import { createServiceClient, isServiceConfigured } from "@/lib/supabase/service";
import { cepCobertoPelaFaixa, marcarIndisponiveis } from "./faixa-cep-regra";

// Cobertura de entrega por produto (PRD 030, paridade Bubble). O produto que
// declara faixa e não cobre o CEP do comprador é MARCADO, não removido: é o
// que o legado faz, e esconder impedia o comprador de descobrir o produto e o
// seller de saber que vale ampliar a cobertura. O bloqueio real de venda
// continua na RPC checkout_criar_pedido.

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

/** Marca `indisponivelRegiao` no produto cuja faixa declarada não cobre o CEP
 *  do comprador. Sem CEP, nada é marcado. A lista nunca muda de tamanho. */
export async function marcarPorFaixaCep<T extends { id: string; indisponivelRegiao?: boolean }>(
  itens: T[],
  cepComprador: string | null,
): Promise<T[]> {
  const limpo = (cepComprador ?? "").replace(/\D/g, "");
  if (limpo.length !== 8 || itens.length === 0) return itens;

  const fora = await idsForaDaFaixa(itens.map((i) => i.id), Number(limpo));
  return marcarIndisponiveis(itens, fora);
}
