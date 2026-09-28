// Entrega por parceiro local no checkout (PRD 056, US01 e US02): o comprador paga
// a banda do seller, com a mesma regra do simulador do avião (freteRegiao), para
// que simulação e cobrança nunca divirjam.
//
// Carrinho da mesma loja = uma entrega com banda única: a maior tarifa mínima e o
// maior R$/km da classe entre os itens (decisão da dona, 28/09). Classe pelo peso
// total. Rota com barco soma a balsa da classe sozinha (no checkout o comprador
// não escolhe: sem o barco a carga não chega).

import { CLASSES, classePorPeso, freteRegiao, type BalsaPorVeiculo, type Bandas, type NomeClasse } from "./simulador-km";

export type ItemParceiroLocal = {
  pesoUnitKg: number | null;
  quantidade: number;
  /** avião ligado (produtos.permite_logistica_afiliado) */
  permiteParceiro: boolean;
  bandas: Bandas;
};

export type MotivoSemParceiro = "item_sem_parceiro" | "sem_peso" | "sem_banda" | "travessia_sem_tabela";

export type CotacaoParceiroLocal =
  | {
      ok: true;
      classe: NomeClasse;
      pesoKg: number;
      km: number;
      kmBarco: number;
      tarifaMinima: number;
      valorKm: number;
      balsa: number;
      total: number;
    }
  | { ok: false; motivo: MotivoSemParceiro };

const maior = (valores: (number | null | undefined)[]) =>
  valores.reduce<number | null>((m, v) => (v == null ? m : m == null ? v : Math.max(m, v)), null);

export function cotarParceiroLocal({
  itens,
  distanciaM,
  barcoM = 0,
  balsa,
}: {
  itens: ItemParceiroLocal[];
  distanciaM: number;
  barcoM?: number;
  balsa?: BalsaPorVeiculo;
}): CotacaoParceiroLocal {
  if (itens.length === 0 || itens.some((i) => !i.permiteParceiro)) return { ok: false, motivo: "item_sem_parceiro" };
  if (itens.some((i) => !(Number(i.pesoUnitKg) > 0))) return { ok: false, motivo: "sem_peso" };

  const pesoKg = Math.round(itens.reduce((s, i) => s + Number(i.pesoUnitKg) * i.quantidade, 0) * 1000) / 1000;
  const { classe } = classePorPeso(pesoKg);
  // Todos os itens precisam ter a banda da classe; sem R$/km a banda não existe.
  if (itens.some((i) => !(Number(i.bandas[classe].valorKm) > 0))) return { ok: false, motivo: "sem_banda" };
  if (barcoM > 0 && !(Number(balsa?.[classe]) > 0)) return { ok: false, motivo: "travessia_sem_tabela" };

  const unica = {
    tarifaMinima: maior(itens.map((i) => i.bandas[classe].tarifaMinima)),
    valorKm: maior(itens.map((i) => i.bandas[classe].valorKm)),
  };
  const bandas = Object.fromEntries(CLASSES.map((c) => [c.classe, c.classe === classe ? unica : {}])) as Bandas;
  const f = freteRegiao({ distanciaM, barcoM, balsa: barcoM > 0 ? balsa : undefined, pesoKg, bandas });
  return {
    ok: true,
    classe,
    pesoKg,
    km: f.km,
    kmBarco: f.kmBarco,
    tarifaMinima: f.tarifaMinima,
    valorKm: f.valorKm,
    balsa: f.balsa,
    total: f.total,
  };
}
