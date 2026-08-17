import { NextResponse } from "next/server";

export async function GET() {
  const projectId = process.env.TARGET_VERCEL_PROJECT_ID;
  const teamId = process.env.TARGET_VERCEL_TEAM_ID;
  const token = process.env.TARGET_VERCEL_TOKEN;

  async function vc(path: string) {
    const sep = path.includes("?") ? "&" : "?";
    const res = await fetch(`https://api.vercel.com${path}${teamId ? `${sep}teamId=${teamId}` : ""}`, {
      headers: { Authorization: `Bearer ${token}` },
      next: { revalidate: 20 },
    });
    if (!res.ok) throw new Error(`Vercel ${path} -> ${res.status}`);
    return res.json();
  }

  try {
    const deployments = await vc(`/v6/deployments?projectId=${projectId}&limit=10`);

    const recent = (deployments.deployments || []).map((d: any) => ({
      uid: d.uid,
      state: d.state,
      readyState: d.readyState,
      createdAt: d.createdAt,
      buildDurationMs:
        d.ready && d.buildingAt ? d.ready - d.buildingAt : null,
      url: d.url,
    }));

    const durations = recent
      .map((d: any) => d.buildDurationMs)
      .filter((n: number | null): n is number => typeof n === "number")
      .sort((a: number, b: number) => a - b);

    const p50 = durations.length ? durations[Math.floor(durations.length * 0.5)] : null;
    const p95 = durations.length ? durations[Math.floor(durations.length * 0.95)] : null;

    return NextResponse.json({
      deployments: recent,
      buildLatency: { p50Ms: p50, p95Ms: p95, sampleCount: durations.length },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
