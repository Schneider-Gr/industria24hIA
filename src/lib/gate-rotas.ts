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

export function exigeSessao(pathname: string): boolean {
  if (ehOnboarding(pathname)) return false;
  return ROTAS_PROTEGIDAS.some((r) => pathname === r || pathname.startsWith(r + "/"));
}
