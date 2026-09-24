// Preço de entrega por km rodado, do afiliado logístico.
//
// O Bubble rotula "Valor por Km", mas o número de lá é a porcentagem do
// afiliado sobre a venda (o modal diz "O frete será calculado com base neste
// percentual"). Aqui é km de verdade: distância da Routes API × R$/km.
//
// ponytail: fórmula linear com mínimo. Faixa por veículo, taxa de parada ou
// adicional noturno entram quando houver regra decidida.

export type EntradaPrecoKm = {
  distanciaM: number;
  valorKm: number;
  minimo: number;
  idaVolta: boolean;
};

export type PrecoKm = { kmCobrados: number; preco: number; aplicouMinimo: boolean };

export function precoPorKm({ distanciaM, valorKm, minimo, idaVolta }: EntradaPrecoKm): PrecoKm {
  const kmCobrados = Math.round((distanciaM / 1000) * (idaVolta ? 2 : 1) * 10) / 10;
  const bruto = Math.round(kmCobrados * valorKm * 100) / 100;
  const aplicouMinimo = bruto < minimo;
  return { kmCobrados, preco: aplicouMinimo ? minimo : bruto, aplicouMinimo };
}
