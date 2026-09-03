import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/supabase/env";
import { exigeSessao, exigeCspEstrita } from "@/lib/gate-rotas";

// Proxy (ex-middleware — renomeado no Next 16, roda no runtime Node). Faz três
// coisas e nada mais:
//  1. renova o cookie de sessão Supabase a cada request (padrão @supabase/ssr);
//  2. barra na borda request SEM sessão para os painéis, evitando o flash do
//     shell antes do gate do layout rodar;
//  3. emite o Content-Security-Policy por request (era estático no next.config).
// A checagem FINA de papel (admin/seller/afiliado/parceiro) continua no
// layout.tsx de cada route group + RLS — o proxy nunca consulta banco de papel.

// CSP — inventário do que o BROWSER carrega/conecta (Asaas/Uber/LangGraph são
// server-to-server e não entram). Duas variantes:
//  - padrão: rotas públicas, com 'unsafe-inline' em script-src. Necessário pra
//    não forçar render dinâmico em toda página (nonce desliga Static/ISR — doc
//    Next 16 content-security-policy.md) e manter a vitrine de SEO no CDN.
//  - estrita: painéis (ver ROTAS_CSP_ESTRITA). Nonce por request +
//    'strict-dynamic', SEM 'unsafe-inline' em script-src. É onde o cookie de
//    sessão Supabase pode ser exfiltrado por XSS e onde vive quase todo o JS
//    interativo; essas rotas já são dynamic, então o custo é ~zero.
const DEV = process.env.NODE_ENV === "development";

const DIRETIVAS_COMUNS = [
  "default-src 'self'",
  // Next e next/font injetam <style> inline sem nonce; noncear estilo é frágil
  // (quebra styled-jsx/runtime) e CSS inline não é vetor de exfiltração de token.
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.supabase.co",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.sentry.io https://*.ingest.sentry.io https://challenges.cloudflare.com",
  "frame-src 'self' https://challenges.cloudflare.com",
  "frame-ancestors 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
];

// challenges.cloudflare.com: widget Turnstile (login/cadastro/checkout). Sob
// 'strict-dynamic' o allowlist por host é ignorado — o script entra por
// propagação (next/script é injetado pelo bootstrap noncedo do Next); mantido
// aqui pro browser sem CSP3 e pra variante padrão.
function cspParaRota(pathname: string, nonce: string): string {
  const scriptSrc = exigeCspEstrita(pathname)
    ? `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${DEV ? " 'unsafe-eval'" : ""} https://challenges.cloudflare.com`
    : `script-src 'self' 'unsafe-inline'${DEV ? " 'unsafe-eval'" : ""} https://challenges.cloudflare.com`;
  return [...DIRETIVAS_COMUNS, scriptSrc].join("; ");
}

// Rebuild dos headers a partir do request ATUAL (pega mutações de cookie do
// setAll) + espelha pathname/nonce/CSP. O layout.tsx lê x-pathname (não recebe a
// URL) pra liberar onboarding. Só na variante estrita o CSP e o x-nonce vão
// TAMBÉM no request header: é de lá que o Next SSR extrai o nonce pros <script>
// do framework. Nas rotas públicas o CSP vai só no response (enforcement), sem
// tocar o request — não há nonce a extrair e é uma variável a menos entre o
// proxy e a decisão de Static/ISR do Next.
function montarResposta(request: NextRequest, nonce: string, csp: string) {
  const headers = new Headers(request.headers);
  headers.set("x-pathname", request.nextUrl.pathname);
  if (csp.includes("'nonce-")) {
    headers.set("x-nonce", nonce);
    headers.set("content-security-policy", csp);
  }
  const response = NextResponse.next({ request: { headers } });
  response.headers.set("content-security-policy", csp);
  return response;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = cspParaRota(pathname, nonce);

  let response = montarResposta(request, nonce, csp);

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return response;

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = montarResposta(request, nonce, csp);
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  let user = null;
  try {
    ({
      data: { user },
    } = await supabase.auth.getUser());
  } catch {
    // Auth do Supabase fora do ar: não derruba a navegação. O gate real é o
    // layout.tsx (que tem o próprio getUser com try/catch) + RLS.
    return response;
  }

  if (!user && exigeSessao(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
