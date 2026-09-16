// Precedência de destino do painel pós-login, dado quais papéis a conta tem.
// Pura (sem I/O) pra ser testável — `resolverDestinoPorPapel` em auth.ts resolve
// os booleans via Supabase e chama isto.
//
// Regra: uma conta pode acumular papéis; o destino é o painel de maior
// precedência que ela pode acessar. Comprador (sem papel) vai pra home.
//
// Os critérios aqui espelham os gates dos layouts — se divergirem, o login
// manda a conta pra um painel que o gate rebate de volta pro login, em loop.
// Foi o caso do afiliado Pendente: "tem linha em afiliacoes" bastava aqui,
// mas o layout exige Aprovada/Suspensa.

export type PapeisUsuario = {
  admin: boolean;
  temLoja: boolean;
  /** Afiliação Aprovada ou Suspensa — o que o layout de /afiliado exige. */
  afiliacaoAtiva: boolean;
  /** Afiliação Pendente ou Rejeitada: não abre o painel, mas tem onde ver. */
  afiliacaoEmAnalise: boolean;
  /** Parceiro logístico não Suspenso — o que o layout de /parceiro exige. */
  parceiroAtivo: boolean;
};

export function destinoPorPapel(p: PapeisUsuario): string {
  if (p.admin) return "/admin";
  if (p.temLoja) return "/seller";
  if (p.afiliacaoAtiva) return "/afiliado";
  if (p.parceiroAtivo) return "/parceiro";
  // Solicitou afiliação e ainda não foi aprovado: /afiliado/solicitar é
  // onboarding (abre sem o papel) e lista as solicitações com StatusBadge,
  // então é onde a pessoa vê a própria situação em vez de cair na home.
  if (p.afiliacaoEmAnalise) return "/afiliado/solicitar";
  return "/";
}
