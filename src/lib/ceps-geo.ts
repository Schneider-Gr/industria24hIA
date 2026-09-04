import "server-only";

import { createServiceClient, isServiceConfigured } from "@/lib/supabase/service";
import { geocodificarCep, type Coordenada } from "@/lib/geo";

// Cache CEP → coordenada. Único ponto do fluxo de vitrine que fala com o
// Google: a home compara o CEP do comprador com dezenas de produtos por render,
// e uma chamada paga por comparação seria inviável em custo e latência.
//
// ponytail: sem TTL. Coordenada de CEP não se move; se um CEP for reatribuído,
// apagar a linha é o suficiente.

/** Coordenadas de vários CEPs de uma vez. Os que faltam no cache são
 *  geocodificados e gravados. CEP que o provedor não resolve simplesmente não
 *  aparece no Map — quem chama trata ausência como "não filtra". */
export async function coordenadasDeCeps(ceps: string[]): Promise<Map<string, Coordenada>> {
  const encontrados = new Map<string, Coordenada>();

  const limpos = [...new Set(ceps.map((c) => (c ?? "").replace(/\D/g, "")).filter((c) => c.length === 8))];
  if (limpos.length === 0 || !isServiceConfigured) return encontrados;

  const supabase = createServiceClient();
  const { data } = await supabase.from("ceps_geo").select("cep, lat, lon").in("cep", limpos);
  for (const linha of data ?? []) {
    encontrados.set(linha.cep, { lat: linha.lat, lon: linha.lon });
  }

  const faltando = limpos.filter((c) => !encontrados.has(c));
  if (faltando.length === 0) return encontrados;

  // ponytail: sequencial. São os CEPs novos de um render — na prática 0 ou 1
  // depois que o catálogo está aquecido. Paralelizar aqui só aumentaria o pico
  // de chamadas pagas contra o teto diário compartilhado.
  const novos: { cep: string; lat: number; lon: number }[] = [];
  for (const cep of faltando) {
    const r = await geocodificarCep(cep);
    if (!r.ok) continue;
    encontrados.set(cep, r.valor);
    novos.push({ cep, lat: r.valor.lat, lon: r.valor.lon });
  }

  if (novos.length > 0) {
    await supabase.from("ceps_geo").upsert(novos, { onConflict: "cep" });
  }

  return encontrados;
}
