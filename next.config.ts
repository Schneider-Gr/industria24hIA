import type { NextConfig } from "next";
import path from "node:path";
import { withSentryConfig } from "@sentry/nextjs";

// Headers de segurança aplicados a todas as rotas. O domínio servia nu
// (sem HSTS/CSP/X-Frame etc.) — auditoria de 2026-07-21.
//
// CSP — achado de auditoria OWASP (#3, médio): inventário real do que o
// BROWSER carrega/conecta (não o que o servidor chama via fetch em route
// handlers — Asaas/Uber/LangGraph/routes.googleapis.com são server-to-server
// e não entram aqui). Confirmado por grep em 2026-08-24:
// - Supabase: SDK do browser fala REST/Realtime direto com *.supabase.co
//   (img-src também, produto usa imagem servida do Storage).
// - Sentry: SDK do browser reporta erro para *.sentry.io / *.ingest.sentry.io.
// - Fontes (Sora/Inter) via next/font/google: self-hosted no build, sem
//   request externo em runtime — sem necessidade de fonts.gstatic.com aqui.
// - Nenhum script/iframe de terceiro embutido (o único uso de Google Maps é
//   um <a href> de navegação, não script/frame).
// script-src/style-src usam 'unsafe-inline' porque o Next injeta script/style
// inline no HTML sem nonce configurado — ver PENDENTE abaixo.
// ⚠️ PENDENTE: migrar para nonce por request (middleware) e remover
// 'unsafe-inline', quando alguém acoplar isso ao App Router deste projeto.
// challenges.cloudflare.com: widget Turnstile (login/cadastro/checkout,
// achado OWASP #8, PR #416) — script carregado no client, roda num iframe
// próprio e reporta ao mesmo host. Faltou nesta lista no merge do #397
// (commit de correção chegou depois do squash-merge) — o Turnstile ficou
// bloqueado em produção até este hotfix.
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.supabase.co",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.sentry.io https://*.ingest.sentry.io https://challenges.cloudflare.com",
  "frame-src 'self' https://challenges.cloudflare.com",
  "frame-ancestors 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Content-Security-Policy", value: CSP },
];

const nextConfig: NextConfig = {
  // Raiz explícita: há outros lockfiles acima (C:\Users\andre) e o Next chutava
  // a raiz errada do workspace. Fixa em web/.
  turbopack: { root: path.resolve(__dirname) },
  // ponytail: CSP fora daqui — precisa de nonce/inventário de origens do app;
  // header separado quando alguém mapear os hosts de script/img.
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  // Painel Uber Direct está configurado com a URL sem /api (PRD 008) — traz
  // para a convenção do projeto (webhooks recebidos vivem sob /api/*).
  async rewrites() {
    return [{ source: "/webhooks/uber-direct", destination: "/api/webhooks/uber-direct" }];
  },
};

// org/project e SENTRY_AUTH_TOKEN só são usados no build da Vercel para
// upload de source maps; ausentes, o build segue sem upload (só um aviso).
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
  disableLogger: true,
});
