import "server-only";

import { createClient } from "@/lib/supabase/server";
import { cepCobertoPelaFaixa, esconderForaDaFaixa } from "./faixa-cep-regra";

// Cobertura de entrega por produto (PRD 030). Decisão do dono em 08/09/2026:
// o produto cuja faixa declarada pelo seller não cobre o CEP do comprador NÃO
// é exibido. Onde nenhum seller declarou cobertura a listagem fica vazia, e
// isso é o comportamento esperado.
//
// Segunda condição, da mesma decisão: só aparece o que dá para comprar. A
// faixa de cobertura e a faixa de frete são a mesma tabela com papéis
// diferentes — as 30 faixas por UF da migration 0165 entraram com
// `ativo = false` para não virar preço de frete sem alguém decidir. Sem essa
// checagem, o produto de uma região sem frete aparecia e o
// `checkout_criar_pedido` recusava com "Entrega indisponível para o CEP
// informado". Loja que permite retirada continua aparecendo, porque ali a
// compra se completa sem frete.
//
// Client normal, não service role: `faixas_cep_read` é `using (true)`,
// `produtos_public_read` cobre produto Aprovado de loja da vitrine e
// `lojas_vitrine` expõe `permite_retirada_na_loja`. Usar service role aqui
// fazia a cobertura sumir em silêncio no Preview da Vercel, que não tem
// SUPABASE_SERVICE_ROLE_KEY (só Production a define).

/** Ids que o CEP do comprador exclui: quem declara faixa que não o cobre, e
 *  quem declara faixa coberta mas não tem como entregar nem retirar. */
export async function idsForaDaFaixa(ids: string[], cepComprador: number): Promise<Set<string>> {
  const fora = new Set<string>();
  if (ids.length === 0) return fora;

  const supabase = await createClient();
  const [{ data: produtos }, { data: comFrete }, { data: lojas }] = await Promise.all([
    supabase
      .from("produtos")
      .select("id, loja_id, faixas_cep!inner(cep_inicial, cep_final)")
      .in("id", ids)
      .not("faixa_cep_id", "is", null),
    // Faixa de frete que cobre o CEP: global (`loja_id` nulo) ou da própria loja.
    supabase
      .from("faixas_cep")
      .select("loja_id")
      .eq("ativo", true)
      .lte("cep_inicial", cepComprador)
      .gte("cep_final", cepComprador),
    supabase.from("lojas_vitrine").select("id, permite_retirada_na_loja"),
  ]);

  const freteGlobal = (comFrete ?? []).some((f) => f.loja_id === null);
  const lojasComFrete = new Set((comFrete ?? []).map((f) => f.loja_id).filter(Boolean) as string[]);
  const lojasComRetirada = new Set(
    (lojas ?? []).filter((l) => l.permite_retirada_na_loja).map((l) => l.id),
  );

  for (const linha of produtos ?? []) {
    const faixa = Array.isArray(linha.faixas_cep) ? linha.faixas_cep[0] : linha.faixas_cep;
    if (!faixa) continue;
    if (!cepCobertoPelaFaixa(cepComprador, faixa)) {
      fora.add(linha.id);
      continue;
    }
    const entregavel = freteGlobal || lojasComFrete.has(linha.loja_id);
    if (!entregavel && !lojasComRetirada.has(linha.loja_id)) fora.add(linha.id);
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
