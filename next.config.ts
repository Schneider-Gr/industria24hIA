import type { NextConfig } from "next";
import path from "node:path";
import { withSentryConfig } from "@sentry/nextjs";

// Headers de segurança aplicados a todas as rotas. O domínio servia nu
// (sem HSTS/CSP/X-Frame etc.) — auditoria de 2026-07-21.
//
// O Content-Security-Policy saiu daqui: agora é emitido por request no
// `src/proxy.ts` (variante estrita com nonce nos painéis + /login, variante
// com 'unsafe-inline' nas rotas públicas pra preservar Static/ISR). Header
// estático não consegue nonce por request.
const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // geolocation=(self): o modal de CEP oferece "Utilizar localizacao
  // automatica". Com geolocation=() o navegador rejeita a chamada antes de
  // perguntar ao usuario, e o botao falha sempre. Camera e microfone seguem
  // desligados — nada no app usa.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
];

const nextConfig: NextConfig = {
  // Raiz explícita: há outros lockfiles acima (C:\Users\andre) e o Next chutava
  // a raiz errada do workspace. Fixa em web/.
  turbopack: { root: path.resolve(__dirname) },
  // CSP é emitido no proxy.ts (nonce por request). Aqui só os headers estáticos.
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
