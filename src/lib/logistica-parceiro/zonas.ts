// Zona de serviço do entregador (PRD 059, US01): bairros oficiais de Manaus
// e/ou prefixos de CEP de 5 dígitos. Sem nada marcado = atende tudo.

import { bairroOficial, normalizarBairro, type BairroManaus } from "./bairros-manaus";

export type LinhaZona = { tipo: string; valor: string };

export type ZonaValidada =
  | { ok: true; bairros: BairroManaus[]; prefixos: string[] }
  | { ok: false; erro: string };

export function validarZona(e: { bairros: string[]; prefixos: string }): ZonaValidada {
  const bairros = new Set<BairroManaus>();
  for (const b of e.bairros) {
    const oficial = bairroOficial(b);
    if (!oficial) return { ok: false, erro: `Bairro fora da lista de Manaus: "${b}".` };
    bairros.add(oficial);
  }
  const prefixos = new Set<string>();
  for (const p of e.prefixos.split(/[\s,;]+/).filter(Boolean)) {
    if (!/^\d{5}$/.test(p)) {
      return { ok: false, erro: `Prefixo de CEP inválido: "${p}". Informe só os 5 primeiros dígitos, como 69050.` };
    }
    prefixos.add(p);
  }
  return { ok: true, bairros: [...bairros], prefixos: [...prefixos].sort() };
}

/** Linhas de `entregador_zonas` (bairro gravado normalizado) → o que a tela mostra. */
export function zonaDasLinhas(linhas: LinhaZona[]): { bairros: BairroManaus[]; prefixos: string[] } {
  const bairros = linhas
    .filter((l) => l.tipo === "bairro")
    .map((l) => bairroOficial(l.valor))
    .filter((b): b is BairroManaus => b !== null);
  const prefixos = linhas.filter((l) => l.tipo === "cep_prefixo").map((l) => l.valor).sort();
  return { bairros, prefixos };
}

/** Espelho da `entregador_atende` (0214): zona vazia atende tudo; com zona,
 *  casa o prefixo do CEP ou o bairro normalizado. */
export function atendeDestino(zona: LinhaZona[], cep: string, bairro: string | null | undefined): boolean {
  if (zona.length === 0) return true;
  const prefixo = cep.replace(/\D/g, "").padStart(8, "0").slice(0, 5);
  const chave = normalizarBairro(bairro ?? "");
  return zona.some(
    (z) => (z.tipo === "cep_prefixo" && z.valor === prefixo) || (z.tipo === "bairro" && chave !== "" && z.valor === chave),
  );
}
