// Primitivos visuais compartilhados do módulo admin. Sem estado, sem mock.
import type { ReactNode } from "react";

const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function fmtBRL(v: number | null | undefined): string {
  return brl.format(typeof v === "number" ? v : 0);
}

export function fmtDate(v: string | null | undefined): string {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v;
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function PageHeader({
  title,
  subtitle,
  count,
}: {
  title: string;
  subtitle?: string;
  count?: number;
}) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 text-sm text-neutral-500">{subtitle}</p>
        )}
      </div>
      {typeof count === "number" && (
        <span className="rounded-full bg-violet-100 px-3 py-1 text-sm font-medium text-violet-800 dark:bg-violet-950 dark:text-violet-200">
          {count} registro{count === 1 ? "" : "s"}
        </span>
      )}
    </div>
  );
}

export function KpiCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
      <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-neutral-900 dark:text-neutral-50">
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-neutral-400">{hint}</p>}
    </div>
  );
}

// Empty state honesto — deixa claro que vazio pode ser RLS, não bug.
export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-neutral-300 p-10 text-center text-sm text-neutral-500 dark:border-neutral-700">
      {children}
    </div>
  );
}

const BADGE: Record<string, string> = {
  // lojas
  Ativa: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  Inativa: "bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
  EmAnalise: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  // produtos
  Aprovado: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  Recusado: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200",
  Pendente: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  rascunho: "bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
  // pedidos
  "Pagamento Realizado": "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  "Aguardando Pagamento": "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
};

export function StatusBadge({ status }: { status: string | null }) {
  const s = status ?? "—";
  const cls =
    BADGE[s] ??
    "bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300";
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>
      {s}
    </span>
  );
}

// Casca de tabela densa e legível. `headers` define as colunas.
export function Table({
  headers,
  children,
}: {
  headers: string[];
  children: ReactNode;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-800">
      <table className="w-full min-w-[720px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-neutral-200 bg-neutral-50 text-left dark:border-neutral-800 dark:bg-neutral-900">
            {headers.map((h) => (
              <th
                key={h}
                className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-neutral-500"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
          {children}
        </tbody>
      </table>
    </div>
  );
}
