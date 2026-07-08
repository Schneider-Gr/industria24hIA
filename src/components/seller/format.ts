// Formatação de moeda pt-BR compartilhada pelo módulo seller.
const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function formatBRL(valor: number | null | undefined): string {
  return brl.format(valor ?? 0);
}

export function formatData(iso: string | null | undefined): string {
  if (!iso) return "—";
  // Coluna `date` chega como "YYYY-MM-DD"; new Date() parseia como UTC 00:00
  // e o fuso local (Manaus/SP) exibe o dia anterior. Forçar parse local.
  const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso}T00:00:00` : iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR");
}
