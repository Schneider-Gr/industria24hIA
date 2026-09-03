// Primitivos visuais compartilhados dos painéis seller + admin.
// Antes desta unificação, `components/admin/ui.tsx` e `components/seller/*`
// mantinham cópias quase idênticas (PageHeader/PageTitle, KpiCard, EmptyState/
// VazioBox) com tokens de cor divergentes (`aco-*` legado). Fonte única aqui;
// os dois módulos antigos agora re-exportam este arquivo para não quebrar
// nenhum dos ~47 call sites existentes.
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
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-xl font-semibold tracking-tight text-ink sm:text-2xl">
          {title}
        </h1>
        {subtitle && <p className="mt-1 text-sm text-ink-2">{subtitle}</p>}
      </div>
      {typeof count === "number" && (
        <span className="rounded bg-lm-cinza px-3 py-1 text-sm font-medium text-lm-azul">
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
  accent,
  delta,
}: {
  label: string;
  value: string | number;
  hint?: string;
  accent?: "default" | "warning";
  /** Selo opcional (ex.: variação vs. período anterior) ao lado do valor. */
  delta?: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-line bg-surface p-5">
      <p className="text-xs font-medium uppercase tracking-wider text-muted">
        {label}
      </p>
      <div className="mt-2 flex items-baseline gap-2">
        <p
          className={`num text-2xl font-semibold ${
            accent === "warning" ? "text-warn" : "text-ink"
          }`}
        >
          {value}
        </p>
        {delta}
      </div>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

// Estado vazio honesto — deixa claro que "sem itens" pode ser filtro/RLS, não
// bug. Regra do projeto: nunca mockar dado só para preencher a tela.
export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-line p-10 text-center text-sm text-muted">
      {children}
    </div>
  );
}

// Mapa de status → cor. Cobre lojas, produtos, pedidos (pagamento) e o
// pipeline de fulfillment (Em Separação/Enviado/Entregue/Cancelado) que está
// sendo introduzido em paralelo (branch feat/pipeline-status-cancelamento) —
// mapeado aqui de antemão para não cair no cinza genérico quando chegar.
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
  // pedidos — pagamento
  "Pagamento Realizado": "bg-ok/10 text-ok",
  "Aguardando Pagamento": "bg-warn/10 text-warn",
  // pedidos — pipeline de fulfillment
  "Em Separação": "bg-info/10 text-info",
  Enviado: "bg-lm-azul/10 text-lm-azul",
  Entregue: "bg-ok/10 text-ok",
  Cancelado: "bg-erro/10 text-erro",
};

export function StatusBadge({ status }: { status: string | null }) {
  const s = status ?? "—";
  const cls = BADGE[s] ?? "bg-muted/10 text-muted";
  return (
    <span
      className={`inline-block rounded px-2.5 py-0.5 text-xs font-medium ${cls}`}
    >
      {s}
    </span>
  );
}

// Casca de tabela densa e legível, reutilizada por seller e admin.
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
                className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">{children}</tbody>
      </table>
    </div>
  );
}
