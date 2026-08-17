import { NextResponse } from "next/server";

async function gf(path: string) {
  const res = await fetch(`${process.env.GRAFANA_URL}${path}`, {
    headers: { Authorization: `Bearer ${process.env.API_KEY_GRAFANA}` },
  });
  return { ok: res.ok, status: res.status, json: await res.json() };
}

export async function GET() {
  const datasources = await gf(`/api/datasources`);
  const promDs = (datasources.json || []).find((d: any) =>
    d.type === "prometheus"
  );

  if (!promDs) {
    return NextResponse.json({ error: "no prometheus datasource found", datasources: datasources.json });
  }

  const query = await gf(
    `/api/datasources/proxy/uid/${promDs.uid}/api/v1/query?query=industria24h_github_issues_open`
  );

  return NextResponse.json({ datasource: promDs.name, query: query.json });
}
