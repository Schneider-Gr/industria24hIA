// Quais reservas avisar hoje. Função pura: o cron só entrega as datas.
//
// Dois marcos por item reservado:
//   - `vespera`: faltam N dias para a data combinada, tempo de o comprador se
//     organizar e de o seller separar a mercadoria;
//   - `no_dia`: é hoje.

/** Dias de antecedência do aviso de véspera. */
export const DIAS_ANTECEDENCIA_VESPERA = 2;

export type MarcoVendaFutura = "vespera" | "no_dia";

/** `hoje` e `previsao` em YYYY-MM-DD (a coluna `vendas_futuras.previsao` é
 * date, sem hora — comparar como texto evita fuso entrar na conta). */
export function marcoDoDia(previsao: string | null, hoje: string): MarcoVendaFutura | null {
  if (!previsao) return null;
  if (previsao === hoje) return "no_dia";
  return previsao === somarDias(hoje, DIAS_ANTECEDENCIA_VESPERA) ? "vespera" : null;
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
