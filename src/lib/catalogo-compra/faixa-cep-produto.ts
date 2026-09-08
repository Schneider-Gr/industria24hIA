import "server-only";

import { createClient } from "@/lib/supabase/server";
import { cepCobertoPelaFaixa, esconderForaDaFaixa } from "./faixa-cep-regra";

// Cobertura de entrega por produto (PRD 030). Decisão do dono em 08/09/2026:
// o produto cuja faixa declarada pelo seller não cobre o CEP do comprador NÃO
// é exibido. Onde nenhum seller declarou cobertura a listagem fica vazia, e
// isso é o comportamento esperado. O bloqueio de venda continua também na RPC
// checkout_criar_pedido.

/** Ids que o CEP do comprador exclui. Vazio quando não há CEP ou nenhum dos
 *  produtos declara faixa.
 *
 *  Client normal, não service role: `faixas_cep_read` é `using (true)` e
 *  `produtos_public_read` cobre produto Aprovado de loja da vitrine, que é
 *  exatamente o conjunto que a listagem exibe. Usar service role aqui fazia a
 *  cobertura sumir em silêncio no Preview da Vercel, que não tem
 *  SUPABASE_SERVICE_ROLE_KEY (só Production a define). */
export async function idsForaDaFaixa(ids: string[], cepComprador: number): Promise<Set<string>> {
  const fora = new Set<string>();
  if (ids.length === 0) return fora;

  const supabase = await createClient();
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
  return esconderForaDaFaixa(itens, fora);
}

/** Conjunto de ids fora da faixa, para quem precisa marcar VÁRIAS listas com
 *  uma query só (a home tem produtos, descontos, supermercado e galerias). */
export async function idsForaDaFaixaCep(ids: string[], cepComprador: string | null): Promise<Set<string>> {
  const limpo = (cepComprador ?? "").replace(/\D/g, "");
  if (limpo.length !== 8 || ids.length === 0) return new Set();
  return idsForaDaFaixa(ids, Number(limpo));
}
