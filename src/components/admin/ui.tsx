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
  // Coluna `date` chega como "YYYY-MM-DD"; new Date() parseia como UTC 00:00
  // e o fuso local exibe o dia anterior. Forçar parse local.
  const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(v) ? `${v}T00:00:00` : v);
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
        <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 text-sm text-ink-2">{subtitle}</p>
        )}
      </div>
      {typeof count === "number" && (
        <span className="rounded bg-amarelo/10 px-3 py-1 text-sm font-medium text-amarelo">
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
    <div className="rounded-lg border border-line bg-surface p-5">
      <p className="text-xs font-medium uppercase tracking-wider text-muted">
        {label}
      </p>
      <p className="mt-2 num text-2xl font-semibold text-ink">
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

// Empty state honesto — deixa claro que vazio pode ser RLS, não bug.
export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-line p-10 text-center text-sm text-muted">
      {children}
    </div>
  );
}

const BADGE: Record<string, string> = {
  // lojas
  Ativa: "bg-ok/10 text-ok",
  Inativa: "bg-muted/10 text-muted",
  EmAnalise: "bg-warn/10 text-warn",
  // produtos
  Aprovado: "bg-ok/10 text-ok",
  Recusado: "bg-erro/10 text-erro",
  Pendente: "bg-warn/10 text-warn",
  rascunho: "bg-muted/10 text-muted",
  // pedidos
  "Pagamento Realizado": "bg-ok/10 text-ok",
  "Aguardando Pagamento": "bg-warn/10 text-warn",
};

export function StatusBadge({ status }: { status: string | null }) {
  const s = status ?? "—";
  const cls =
    BADGE[s] ??
    "bg-muted/10 text-muted";
  return (
    <span className={`inline-block rounded px-2.5 py-0.5 text-xs font-medium ${cls}`}>
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
    <div className="overflow-x-auto rounded-lg border border-line">
      <table className="w-full min-w-[720px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-line bg-surface">
            {headers.map((h) => (
              <th
                key={h}
                className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {children}
        </tbody>
      </table>
    </div>
  );
}
