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
    <div className="rounded-lg border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
      <p className="text-sm text-neutral-500">{label}</p>
      <p
        className={`mt-2 text-2xl font-semibold ${
          accent === "warning" ? "text-amber-600 dark:text-amber-500" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}
