// Quais reservas avisar hoje. Função pura: o cron só entrega as datas.
//
// Três marcos por item reservado:
//   - `vespera`: faltam N dias para a data combinada, tempo de o comprador se
//     organizar e de o seller separar a mercadoria;
//   - `no_dia`: é hoje;
//   - `vencido`: passou. Antes do PRD 047 a data vencia em silêncio — o item
//     ficava pendente para sempre, sem ninguém ser cobrado. Dispara no dia
//     SEGUINTE à previsão, uma vez só: é o que o torna idempotente por
//     construção, sem depender de varrer o passado inteiro todo dia.

/** Dias de antecedência do aviso de véspera. */
export const DIAS_ANTECEDENCIA_VESPERA = 2;

export type MarcoVendaFutura = "vespera" | "no_dia" | "vencido";

/** `hoje` e `previsao` em YYYY-MM-DD (a coluna `vendas_futuras.previsao` é
 * date, sem hora — comparar como texto evita fuso entrar na conta). */
export function marcoDoDia(previsao: string | null, hoje: string): MarcoVendaFutura | null {
  if (!previsao) return null;
  if (previsao === hoje) return "no_dia";
  if (previsao === somarDias(hoje, DIAS_ANTECEDENCIA_VESPERA)) return "vespera";
  return previsao === somarDias(hoje, -1) ? "vencido" : null;
}

/** Dias de atraso de uma previsão vencida, para o texto do aviso e a fila. */
export function diasDeAtraso(previsao: string, hoje: string): number {
  const ms = Date.parse(`${hoje}T12:00:00Z`) - Date.parse(`${previsao}T12:00:00Z`);
  return Math.max(0, Math.round(ms / 86_400_000));
}

export function somarDias(isoDate: string, dias: number): string {
  const d = new Date(`${isoDate}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

/** Data de Manaus, que é o fuso da operação (o cron roda em UTC na Vercel:
 * às 21h de Manaus o UTC já virou o dia). */
export function hojeManaus(agora = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Manaus",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(agora);
}

export function formatarDataBR(iso: string): string {
  const [ano, mes, dia] = iso.split("-");
  return dia && mes && ano ? `${dia}/${mes}/${ano}` : iso;
}
