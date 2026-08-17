import { NextResponse } from "next/server";
import { pushMetrics } from "prometheus-remote-write";

const APP_URL = "https://industria24h-ops-dashboard.vercel.app";

async function getJson(path: string) {
  const res = await fetch(`${APP_URL}${path}`, { cache: "no-store" });
  return res.json();
}

export async function GET() {
  const [gh, vc, sn] = await Promise.all([
    getJson("/api/github"),
    getJson("/api/vercel"),
    getJson("/api/sentry"),
  ]);

  const metrics: Record<string, number> = {};
  const set = (name: string, value: unknown) => {
    if (typeof value === "number") metrics[name] = value;
  };

  set("industria24h_github_issues_open", gh.issuesOpenCount);
  set("industria24h_github_prs_open", gh.prsOpenCount);
  set("industria24h_github_rate_limit_remaining", gh.rateLimit?.remaining);
  set("industria24h_vercel_build_p50_ms", vc.buildLatency?.p50Ms);
  set("industria24h_vercel_build_p95_ms", vc.buildLatency?.p95Ms);
  set("industria24h_sentry_unresolved_count", sn.unresolvedCount);
  set("industria24h_sentry_latency_p50_ms", sn.latency?.p50Ms);
  set("industria24h_sentry_latency_p95_ms", sn.latency?.p95Ms);

  const result = await pushMetrics(metrics, {
    url: process.env.GRAFANA_PROM_URL!,
    auth: {
      username: process.env.GRAFANA_PROM_USERNAME!,
      password: process.env.GRAFANA_PRHOMOTEUS_API_KEY!,
    },
    fetch: globalThis.fetch as any,
  });

  if (result.status !== 200 && result.status !== 204) {
    return NextResponse.json(
      { pushed: 0, error: result.errorMessage, status: result.status },
      { status: 502 }
    );
  }

  return NextResponse.json({ pushed: Object.keys(metrics).length, at: new Date().toISOString() });
}
