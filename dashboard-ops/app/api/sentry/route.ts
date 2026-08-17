import { NextResponse } from "next/server";

export async function GET() {
  const org = process.env.SENTRY_ORG;
  const project = process.env.SENTRY_PROJECT;
  const token = process.env.SENTRY_AUTH_TOKEN || process.env.API_KEY_SENTRY2;

  async function sn(path: string) {
    const res = await fetch(`https://sentry.io/api/0${path}`, {
      headers: { Authorization: `Bearer ${token}` },
      next: { revalidate: 20 },
    });
    if (!res.ok) throw new Error(`Sentry ${path} -> ${res.status}`);
    return res.json();
  }

  try {
    const issues = await sn(
      `/projects/${org}/${project}/issues/?query=is:unresolved&statsPeriod=24h&limit=20`
    );

    let latency: { p50Ms: number | null; p95Ms: number | null } = {
      p50Ms: null,
      p95Ms: null,
    };
    try {
      const stats = await sn(
        `/organizations/${org}/events-stats/?project=${project}&dataset=metricsEnhanced&field=p50(transaction.duration)&field=p95(transaction.duration)&statsPeriod=24h&yAxis=p50(transaction.duration)&yAxis=p95(transaction.duration)`
      );
      const p50series = stats?.["p50(transaction.duration)"]?.data ?? [];
      const p95series = stats?.["p95(transaction.duration)"]?.data ?? [];
      const lastP50 = p50series[p50series.length - 1]?.[1]?.[0]?.count ?? null;
      const lastP95 = p95series[p95series.length - 1]?.[1]?.[0]?.count ?? null;
      latency = { p50Ms: lastP50, p95Ms: lastP95 };
    } catch {
      // performance/tracing pode não estar habilitado no plano — segue sem latência de transação
    }

    return NextResponse.json({
      unresolvedCount: issues.length,
      issues: issues.slice(0, 15).map((i: any) => ({
        id: i.id,
        title: i.title,
        culprit: i.culprit,
        count: i.count,
        level: i.level,
        lastSeen: i.lastSeen,
        permalink: i.permalink,
      })),
      latency,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
