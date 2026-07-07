// Card de KPI reutilizado nas telas de Dashboard, Produtos e Análise Geral.
export function KpiCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent?: "default" | "warning";
}) {
  return (
    <div className="rounded-lg border border-line bg-surface p-5">
      <p className="text-sm text-muted">{label}</p>
      <p
        className={`mt-2 text-2xl font-semibold ${
          accent === "warning" ? "text-warn" : ""
        } num`}
      >
        {value}
      </p>
    </div>
  );
}