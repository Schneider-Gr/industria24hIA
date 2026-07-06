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
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR");
}
