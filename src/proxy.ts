import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Nonce por request (PRD 027) — permite remover 'unsafe-inline' do CSP.
// O CSP em si (demais diretivas) fica em next.config.ts; aqui só a parte
// que precisa variar por request. x-nonce republicado como header de
// request para o layout ler via headers().
// Next 16 renomeou "middleware" para "proxy" (arquivo + export) — ver
// node_modules/next/dist/docs/.../file-conventions/proxy.md.
export function proxy(request: NextRequest) {
  const nonce = crypto.randomUUID();

  // 'unsafe-eval' só em dev: Turbopack/Fast Refresh usa eval() para HMR.
  // Produção nunca usa eval() em React — não entra no CSP de prod.
  const scriptSrcDev = process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : "";

  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}'${scriptSrcDev} https://challenges.cloudflare.com`,
    `style-src 'self' 'nonce-${nonce}'`,
    "img-src 'self' data: blob: https://*.supabase.co",
    "font-src 'self' data:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.sentry.io https://*.ingest.sentry.io https://challenges.cloudflare.com",
    "frame-src 'self' https://challenges.cloudflare.com",
    "frame-ancestors 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: [
    // Todas as rotas exceto assets estáticos/imagem otimizada — inclui
    // API porque webhooks/route handlers não sofrem com o header extra.
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
