// Precedência de destino do painel pós-login, dado quais papéis a conta tem.
// Pura (sem I/O) pra ser testável — `resolverDestinoPorPapel` em auth.ts resolve
// os booleans via Supabase e chama isto.
//
// Regra: uma conta pode acumular papéis; o destino é o painel de maior
// precedência que ela pode acessar. Comprador (sem papel) vai pra home.

export type PapeisUsuario = {
  admin: boolean;
  temLoja: boolean;
  temAfiliacao: boolean;
  temParceiro: boolean;
};

export function destinoPorPapel(p: PapeisUsuario): string {
  if (p.admin) return "/admin";
  if (p.temLoja) return "/seller";
  if (p.temAfiliacao) return "/afiliado";
  if (p.temParceiro) return "/parceiro";
  return "/";
}
