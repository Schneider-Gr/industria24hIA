// Fonte única das rotas de painel e das exceções de onboarding, compartilhada
// entre o `proxy.ts` (barreira de sessão na borda) e os `layout.tsx` (gate de
// papel). Puro, sem dependência de Next/Supabase — testável isolado.

export const ROTAS_PROTEGIDAS = ["/admin", "/seller", "/afiliado", "/parceiro"];

// Onboarding que mora sob (ou colado a) um prefixo protegido mas precisa abrir
// sem sessão (/seller/cadastro) ou sem o papel ainda (/parceiro/cadastro,
// /afiliado/solicitar).
export const ROTAS_ONBOARDING = [
  "/seller/cadastro",
  "/parceiro/cadastro",
  "/afiliado/solicitar",
];

export function ehOnboarding(pathname: string): boolean {
  return ROTAS_ONBOARDING.includes(pathname);
}

// Rotas sob /afiliado que o parceiro logístico também acessa (a sidebar do
// (parceiro) linka "Entregas (afiliado)" → /afiliado/logistica). O gate do
// layout do afiliado libera essas se ehAfiliado() OU ehParceiroLogistico().
const ROTAS_AFILIADO_OU_PARCEIRO = ["/afiliado/logistica"];

export function afiliadoOuParceiro(pathname: string): boolean {
  return ROTAS_AFILIADO_OU_PARCEIRO.some(
    (r) => pathname === r || pathname.startsWith(r + "/"),
  );
}

export function exigeSessao(pathname: string): boolean {
  if (ehOnboarding(pathname)) return false;
  return ROTAS_PROTEGIDAS.some((r) => pathname === r || pathname.startsWith(r + "/"));
}

// Rotas que recebem CSP estrita (nonce + strict-dynamic, sem 'unsafe-inline' em
// script-src) no proxy: os painéis. É onde o cookie de sessão Supabase (NÃO
// httpOnly no modelo @supabase/ssr) pode ser exfiltrado por XSS e onde vive
// quase todo o JS interativo. Já são todas `ƒ` (dynamic) no build — o nonce só
// é injetado em página renderizada por request; numa estática os <script>
// ficariam sem nonce e o CSP estrito os bloquearia. Rotas públicas (vitrine de
// SEO) ficam de fora de propósito: preservam Static/ISR e não têm sessão.
// Inclui onboarding (renderiza sob o shell do painel), diferente de exigeSessao.
export const ROTAS_CSP_ESTRITA = ROTAS_PROTEGIDAS;

export function exigeCspEstrita(pathname: string): boolean {
  return ROTAS_CSP_ESTRITA.some((r) => pathname === r || pathname.startsWith(r + "/"));
}
