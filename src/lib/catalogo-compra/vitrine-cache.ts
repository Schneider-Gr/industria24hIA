import "server-only";

import { createHash } from "node:crypto";
import { unstable_cache } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import { buscarFlagsRapidas } from "@/lib/vitrine-quick-flags";
import { idsForaDaFaixaCep } from "./faixa-cep-produto";
import { ordenarPorProximidade } from "./proximidade";

// Cache das leituras que a home refaz a cada visita (medição de 21/09: com CEP
// a home levava ~0,9s contra 0,32s sem CEP, e a diferença era este trio de
// consultas). O catálogo em si já é cacheado por 60s em vitrine-home.ts; estas
// derivam dele, então usam a mesma janela e ficam coerentes com ele.
//
// Chave = conjunto de ids + CEP. O conjunto muda quando o catálogo cacheado
// muda, o que faz a entrada velha simplesmente deixar de ser consultada.
const JANELA_SEGUNDOS = 60;

function chave(ids: string[]): string {
  return createHash("sha1").update([...ids].sort().join(",")).digest("hex").slice(0, 16);
}

/** Ids que o CEP do comprador exclui da vitrine. */
export function idsForaDaFaixaCepCacheado(ids: string[], cep: string | null): Promise<Set<string>> {
  if (!cep || ids.length === 0) return Promise.resolve(new Set());
  return unstable_cache(
    async () => [...(await idsForaDaFaixaCep(ids, cep, createPublicClient()))],
    ["vitrine-fora-da-faixa", chave(ids), cep],
    { revalidate: JANELA_SEGUNDOS, tags: ["vitrine-home"] },
  )().then((lista) => new Set(lista));
}

/** Ordem por proximidade, guardada como lista de ids (os itens seguem locais). */
export async function ordenarPorProximidadeCacheado<T extends { id: string }>(
  itens: T[],
  cep: string | null,
): Promise<T[]> {
  if (!cep || itens.length < 2) return itens;
  const ids = itens.map((i) => i.id);
  const ordem = await unstable_cache(
    async () => (await ordenarPorProximidade(ids.map((id) => ({ id })), cep)).map((i) => i.id),
    ["vitrine-proximidade", chave(ids), cep],
    { revalidate: JANELA_SEGUNDOS, tags: ["vitrine-home"] },
  )();
  const porId = new Map(itens.map((i) => [i.id, i]));
  const ordenados = ordem.map((id) => porId.get(id)).filter((i): i is T => !!i);
  // Item que entrou depois da ordem cacheada vai para o fim, nunca some.
  const vistos = new Set(ordem);
  return [...ordenados, ...itens.filter((i) => !vistos.has(i.id))];
}

/** Venda futura, compra coletiva e menor preço por produto. Não depende do CEP. */
export async function buscarFlagsRapidasCacheado(produtos: { id: string; valor: number }[]) {
  if (produtos.length === 0) {
    return { vendaFutura: new Set<string>(), coletiva: new Set<string>(), menorPreco: new Map<string, number>() };
  }
  const bruto = await unstable_cache(
    async () => {
      const { vendaFutura, coletiva, menorPreco } = await buscarFlagsRapidas(createPublicClient(), produtos);
      return { vendaFutura: [...vendaFutura], coletiva: [...coletiva], menorPreco: [...menorPreco] };
    },
    ["vitrine-flags", chave(produtos.map((p) => p.id))],
    { revalidate: JANELA_SEGUNDOS, tags: ["vitrine-home"] },
  )();
  return {
    vendaFutura: new Set(bruto.vendaFutura),
    coletiva: new Set(bruto.coletiva),
    menorPreco: new Map(bruto.menorPreco),
  };
}
