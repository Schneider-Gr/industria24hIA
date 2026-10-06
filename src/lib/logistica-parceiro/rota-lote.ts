// Rota com várias entregas (PRD 060, US01 e US02): quais pedidos consolidados
// formam um lote e em que ordem as paradas saem. Regras puras; quem fala com o
// banco e com o Google é a tela de /admin/lotes.

import { atendeDestino, type LinhaZona } from "./zonas";

// Limite da Routes API: 25 waypoints intermediários por requisição (doc
// "Routes API Usage and Billing", conferida em 06/10/2026).
export const MAX_PARADAS = 25;

export type PedidoParaLote = {
  id: string;
  lojaId: string;
  cep: string;
  bairro: string | null;
  criadoEm: string;
};

export type EntregadorDaLoja = {
  lojaId: string;
  userId: string;
  desde: string;
  zona: LinhaZona[];
};

export type LoteSugerido = {
  chave: string;
  lojaId: string;
  /** "zona": todos os destinos estão na zona declarada do mesmo entregador.
   *  "corredor": sem zona que cubra, vale o prefixo de 3 dígitos do CEP (0074). */
  tipo: "zona" | "corredor";
  entregadorId: string | null;
  corredor: string | null;
  pedidoIds: string[];
};

const soDigitos = (v: string) => v.replace(/\D/g, "");

/** Agrupa pedidos pagos com frete consolidado: mesma loja e mesma zona de
 *  entregador; quem não cai em zona nenhuma agrupa pelo corredor de CEP.
 *  Grupo acima do limite de paradas é dividido, na ordem de chegada. */
export function sugerirLotes(pedidos: PedidoParaLote[], entregadores: EntregadorDaLoja[]): LoteSugerido[] {
  const grupos = new Map<string, LoteSugerido>();
  const emOrdem = [...pedidos].sort((a, b) => a.criadoEm.localeCompare(b.criadoEm));

  for (const p of emOrdem) {
    // Só zona declarada separa pedidos: entregador sem zona atende tudo.
    const dono = entregadores
      .filter((e) => e.lojaId === p.lojaId && e.zona.length > 0 && atendeDestino(e.zona, p.cep, p.bairro))
      .sort((a, b) => a.desde.localeCompare(b.desde))[0];
    const corredor = soDigitos(p.cep).slice(0, 3);
    const chave = dono ? `${p.lojaId}|zona|${dono.userId}` : `${p.lojaId}|corredor|${corredor}`;
    const grupo = grupos.get(chave) ?? {
      chave,
      lojaId: p.lojaId,
      tipo: dono ? ("zona" as const) : ("corredor" as const),
      entregadorId: dono?.userId ?? null,
      corredor: dono ? null : corredor,
      pedidoIds: [],
    };
    grupo.pedidoIds.push(p.id);
    grupos.set(chave, grupo);
  }

  return [...grupos.values()].flatMap((g) => {
    if (g.pedidoIds.length <= MAX_PARADAS) return [g];
    const partes: LoteSugerido[] = [];
    for (let i = 0; i < g.pedidoIds.length; i += MAX_PARADAS) {
      partes.push({ ...g, chave: `${g.chave}|${partes.length + 1}`, pedidoIds: g.pedidoIds.slice(i, i + MAX_PARADAS) });
    }
    return partes;
  });
}

export type Parada = { pedidoId: string; ordem: number; chegadaS: number | null };

/** Paradas na ordem da rota. `rota` nula (Google fora, sem chave) = ordem de
 *  chegada dos pedidos, sem previsão. `rota.ordem[k]` é o índice, em
 *  `pedidoIds`, da k-ésima parada; `chegadaS[k]` são os segundos desde a coleta. */
export function montarParadas(
  pedidoIds: string[],
  rota: { ordem: number[]; chegadaS: number[] } | null,
): Parada[] {
  const valida =
    rota &&
    rota.ordem.length === pedidoIds.length &&
    rota.chegadaS.length === pedidoIds.length &&
    new Set(rota.ordem).size === pedidoIds.length &&
    rota.ordem.every((i) => Number.isInteger(i) && i >= 0 && i < pedidoIds.length);
  if (!valida) return pedidoIds.map((pedidoId, i) => ({ pedidoId, ordem: i + 1, chegadaS: null }));
  return rota.ordem.map((i, k) => ({ pedidoId: pedidoIds[i], ordem: k + 1, chegadaS: Math.round(rota.chegadaS[k]) }));
}

/** "+25 min" / "+1 h 10 min" depois da coleta. */
export function textoChegada(chegadaS: number | null): string {
  if (chegadaS == null) return "sem previsão";
  const min = Math.max(1, Math.round(chegadaS / 60));
  if (min < 60) return `+${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `+${h} h ${m} min` : `+${h} h`;
}
