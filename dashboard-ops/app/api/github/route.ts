import { NextResponse } from "next/server";

const REPO = "Schneider-Gr/industria24hIA";

async function gh(path: string) {
  const res = await fetch(`https://api.github.com${path}`, {
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
    },
    next: { revalidate: 20 },
  });
  if (!res.ok) throw new Error(`GitHub ${path} -> ${res.status}`);
  return res.json();
}

export async function GET() {
  try {
    const [issuesAndPrs, rateLimit] = await Promise.all([
      gh(`/repos/${REPO}/issues?state=open&per_page=30`),
      gh(`/rate_limit`),
    ]);

    const issues = issuesAndPrs.filter((i: any) => !i.pull_request);
    const prsRaw = issuesAndPrs.filter((i: any) => i.pull_request);

    const prs = await Promise.all(
      prsRaw.slice(0, 15).map(async (pr: any) => {
        let reviewStatus = "pending";
        try {
          const reviews = await gh(`/repos/${REPO}/pulls/${pr.number}/reviews`);
          if (reviews.length > 0) {
            const last = reviews[reviews.length - 1];
            reviewStatus = last.state.toLowerCase();
          }
        } catch {
          reviewStatus = "unknown";
        }
        return {
          number: pr.number,
          title: pr.title,
          url: pr.html_url,
          author: pr.user?.login,
          createdAt: pr.created_at,
          reviewStatus,
        };
      })
    );

    return NextResponse.json({
      issuesOpenCount: issues.length,
      issues: issues.slice(0, 15).map((i: any) => ({
        number: i.number,
        title: i.title,
        url: i.html_url,
        createdAt: i.created_at,
        labels: (i.labels || []).map((l: any) => (typeof l === "string" ? l : l.name)),
      })),
      prsOpenCount: prsRaw.length,
      prs,
      rateLimit: {
        limit: rateLimit.rate.limit,
        remaining: rateLimit.rate.remaining,
        resetAt: new Date(rateLimit.rate.reset * 1000).toISOString(),
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
