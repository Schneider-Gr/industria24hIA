## ADDED Requirements

### Requirement: Middleware renova a sessão Supabase e barra rotas privadas sem sessão
O app DEVE ter um `src/middleware.ts` que, em toda request coberta pelo `matcher` (tudo exceto
assets estáticos), renova o cookie de sessão do Supabase via `@supabase/ssr`. Para qualquer
`pathname` que comece com `/admin`, `/seller`, `/afiliado` ou `/parceiro` sem usuário
autenticado, o middleware DEVE redirecionar para `/login?next=<pathname>` antes de a página
renderizar. O middleware NÃO DEVE consultar o papel do usuário (admin/loja/parceiro) — a
verificação de papel permanece nos `layout.tsx` dos route groups, que continuam sendo a
autoridade de autorização junto com a RLS.

#### Scenario: Visitante deslogado acessa /admin
- **WHEN** uma request sem cookie de sessão válido chega em `/admin/qualquer-coisa`
- **THEN** o middleware responde com redirect para `/login?next=/admin/qualquer-coisa` sem
  renderizar o layout do admin

#### Scenario: Sessão prestes a expirar em rota pública
- **WHEN** um usuário autenticado com token perto de expirar navega por uma rota pública
- **THEN** o middleware renova o cookie de sessão na resposta e a navegação seguinte continua
  autenticada

#### Scenario: Request para asset estático
- **WHEN** a request é para `/_next/static/...` ou uma imagem
- **THEN** o middleware não roda (excluído pelo `matcher`)

#### Scenario: Usuário autenticado sem o papel acessa a rota
- **WHEN** um usuário autenticado mas sem papel de admin acessa `/admin`
- **THEN** o middleware deixa passar (há sessão) e o gate do `layout.tsx` do admin faz o
  redirect por falta de papel
