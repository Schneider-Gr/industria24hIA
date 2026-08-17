"use client";

import { useEffect, useState } from "react";

type GithubData = {
  issuesOpenCount: number;
  issues: { number: number; title: string; url: string; createdAt: string; labels: string[] }[];
  prsOpenCount: number;
  prs: { number: number; title: string; url: string; author: string; createdAt: string; reviewStatus: string }[];
  rateLimit: { limit: number; remaining: number; resetAt: string };
  error?: string;
};

type VercelData = {
  deployments: { uid: string; state: string; readyState: string; createdAt: number; buildDurationMs: number | null; url: string }[];
  buildLatency: { p50Ms: number | null; p95Ms: number | null; sampleCount: number };
  error?: string;
};

type SentryData = {
  unresolvedCount: number;
  issues: { id: string; title: string; culprit: string; count: string; level: string; lastSeen: string; permalink: string }[];
  latency: { p50Ms: number | null; p95Ms: number | null };
  error?: string;
};

function useLive<T>(url: string, intervalMs = 30000) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const res = await fetch(url);
        const json = await res.json();
        if (alive) setData(json);
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    const id = setInterval(load, intervalMs);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [url, intervalMs]);

  return { data, loading };
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-4">
      <h2 className="text-sm font-semibold text-neutral-400 uppercase tracking-wide mb-3">{title}</h2>
      {children}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <div className="text-2xl font-bold text-neutral-100">{value}</div>
      <div className="text-xs text-neutral-500">{label}</div>
    </div>
  );
}

export default function Home() {
  const { data: gh, loading: ghLoading } = useLive<GithubData>("/api/github");
  const { data: vc, loading: vcLoading } = useLive<VercelData>("/api/vercel");
  const { data: sn, loading: snLoading } = useLive<SentryData>("/api/sentry");

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-6 space-y-6">
      <header className="flex items-baseline justify-between">
        <h1 className="text-xl font-bold">Industria24h — Painel de Operação</h1>
        <span className="text-xs text-neutral-500">atualiza a cada 30s</span>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card title="GitHub — Rate Limit">
          {ghLoading && !gh ? (
            <p className="text-neutral-500 text-sm">carregando…</p>
          ) : gh?.error ? (
            <p className="text-red-400 text-sm">{gh.error}</p>
          ) : (
            <div className="flex gap-6">
              <Stat label="restante" value={`${gh?.rateLimit.remaining}/${gh?.rateLimit.limit}`} />
              <Stat
                label="reseta em"
                value={gh ? new Date(gh.rateLimit.resetAt).toLocaleTimeString("pt-BR") : "-"}
              />
            </div>
          )}
        </Card>

        <Card title="Vercel — Build Latency">
          {vcLoading && !vc ? (
            <p className="text-neutral-500 text-sm">carregando…</p>
          ) : vc?.error ? (
            <p className="text-red-400 text-sm">{vc.error}</p>
          ) : (
            <div className="flex gap-6">
              <Stat label="p50 (ms)" value={vc?.buildLatency.p50Ms ?? "-"} />
              <Stat label="p95 (ms)" value={vc?.buildLatency.p95Ms ?? "-"} />
            </div>
          )}
        </Card>

        <Card title="Sentry — Latência de transação">
          {snLoading && !sn ? (
            <p className="text-neutral-500 text-sm">carregando…</p>
          ) : sn?.error ? (
            <p className="text-red-400 text-sm">{sn.error}</p>
          ) : (
            <div className="flex gap-6">
              <Stat label="p50 (ms)" value={sn?.latency.p50Ms != null ? Math.round(sn.latency.p50Ms) : "-"} />
              <Stat label="p95 (ms)" value={sn?.latency.p95Ms != null ? Math.round(sn.latency.p95Ms) : "-"} />
            </div>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card title={`Issues abertas (${gh?.issuesOpenCount ?? "-"})`}>
          <ul className="space-y-2 text-sm">
            {gh?.issues.map((i) => (
              <li key={i.number}>
                <a href={i.url} target="_blank" className="hover:underline">
                  #{i.number} {i.title}
                </a>
                {i.labels.length > 0 && (
                  <span className="ml-2 text-xs text-neutral-500">{i.labels.join(", ")}</span>
                )}
              </li>
            ))}
            {gh && gh.issues.length === 0 && <p className="text-neutral-500">nenhuma issue aberta</p>}
          </ul>
        </Card>

        <Card title={`PRs abertos (${gh?.prsOpenCount ?? "-"})`}>
          <ul className="space-y-2 text-sm">
            {gh?.prs.map((pr) => (
              <li key={pr.number} className="flex items-center justify-between gap-2">
                <a href={pr.url} target="_blank" className="hover:underline truncate">
                  #{pr.number} {pr.title}
                </a>
                <span
                  className={
                    "text-xs px-2 py-0.5 rounded shrink-0 " +
                    (pr.reviewStatus === "approved"
                      ? "bg-green-900 text-green-300"
                      : pr.reviewStatus === "changes_requested"
                      ? "bg-red-900 text-red-300"
                      : "bg-neutral-800 text-neutral-400")
                  }
                >
                  {pr.reviewStatus}
                </span>
              </li>
            ))}
            {gh && gh.prs.length === 0 && <p className="text-neutral-500">nenhum PR aberto</p>}
          </ul>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card title={`Sentry — issues não resolvidas (${sn?.unresolvedCount ?? "-"})`}>
          <ul className="space-y-2 text-sm">
            {sn?.issues.map((i) => (
              <li key={i.id} className="flex items-center justify-between gap-2">
                <a href={i.permalink} target="_blank" className="hover:underline truncate">
                  {i.title}
                </a>
                <span className="text-xs text-neutral-500 shrink-0">{i.count}x</span>
              </li>
            ))}
            {sn && sn.issues.length === 0 && <p className="text-neutral-500">sem issues abertas nas últimas 24h</p>}
          </ul>
        </Card>

        <Card title="Vercel — últimos deployments">
          <ul className="space-y-2 text-sm">
            {vc?.deployments.slice(0, 8).map((d) => (
              <li key={d.uid} className="flex items-center justify-between gap-2">
                <span className="truncate">{d.url}</span>
                <span
                  className={
                    "text-xs px-2 py-0.5 rounded shrink-0 " +
                    (d.readyState === "READY"
                      ? "bg-green-900 text-green-300"
                      : d.readyState === "ERROR"
                      ? "bg-red-900 text-red-300"
                      : "bg-neutral-800 text-neutral-400")
                  }
                >
                  {d.readyState}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
