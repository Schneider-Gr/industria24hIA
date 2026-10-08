// Texto da notificação push de corrida nova (app do entregador). Puro.

export type AvisoPush = { titulo: string; corpo: string; url: string; tag: string };

// O Intl separa "R$" do número com espaço não separável; na notificação vai espaço comum.
const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }).replace(/\u00a0/g, " ");

/** `exclusiva`: a corrida foi oferecida só a este entregador (afiliado da
 *  loja, 5 min). Sem exclusividade ela está no pool de parceiros. */
export function avisoNovaCorrida(c: {
  id: string;
  destino: string;
  valor: number | null;
  distanciaM: number | null;
  exclusiva: boolean;
  entregas?: number;
}): AvisoPush {
  const partes = [
    c.valor != null && c.valor > 0 ? brl(c.valor) : null,
    c.distanciaM != null && c.distanciaM > 0 ? `${(c.distanciaM / 1000).toFixed(1).replace(".", ",")} km` : null,
    c.entregas && c.entregas > 1 ? `${c.entregas} entregas` : null,
  ].filter(Boolean);
  // O lote traz as paradas numeradas ("1. Rua X | 2. Rua Y"): mostra só a primeira.
  const destino = c.destino.split(" | ")[0].replace(/^\d+\.\s*/, "").slice(0, 90);
  return {
    titulo: c.exclusiva ? "Nova corrida para você (5 min para aceitar)" : "Nova corrida disponível",
    corpo: [partes.join(" · "), destino].filter(Boolean).join("\n"),
    url: c.exclusiva ? "/afiliado/logistica" : "/parceiro",
    tag: `corrida-${c.id}`,
  };
}
