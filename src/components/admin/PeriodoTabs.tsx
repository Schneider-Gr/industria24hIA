import Link from "next/link";
import { RANGE_KEYS, RANGE_LABEL, type RangeKey } from "@/lib/admin/dashboard-kpis";

// Abas de período do dashboard do admin. Server component: só links; o estado
// vive no query param `?range=`. Volta pra página 1 ao trocar de período (a
// contagem de páginas muda).
export function PeriodoTabs({ atual }: { atual: RangeKey }) {
  return (
    <nav aria-label="Período" className="mb-6 flex flex-wrap gap-1.5">
      {RANGE_KEYS.map((key) => {
        const ativo = key === atual;
        return (
          <Link
            key={key}
            href={key === "30d" ? "/admin" : `/admin?range=${key}`}
            aria-current={ativo ? "page" : undefined}
            className={`rounded-sm border px-3 py-1.5 text-[13px] font-medium transition-colors ${
              ativo
                ? "border-aco-600 bg-aco-600 text-white"
                : "border-line text-ink-2 hover:border-aco-600 hover:text-aco-600"
            }`}
          >
            {RANGE_LABEL[key]}
          </Link>
        );
      })}
    </nav>
  );
}
