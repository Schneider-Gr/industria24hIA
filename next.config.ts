import type { NextConfig } from "next";
import path from "node:path";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  // Raiz explícita: há outros lockfiles acima (C:\Users\andre) e o Next chutava
  // a raiz errada do workspace. Fixa em web/.
  turbopack: { root: path.resolve(__dirname) },
};

// org/project e SENTRY_AUTH_TOKEN só são usados no build da Vercel para
// upload de source maps; ausentes, o build segue sem upload (só um aviso).
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
  disableLogger: true,
});
