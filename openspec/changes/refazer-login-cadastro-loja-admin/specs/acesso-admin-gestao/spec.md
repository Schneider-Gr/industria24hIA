## ADDED Requirements

### Requirement: Guard de `/admin/**` por sessão e por linha em `admins`
O layout de `/admin/**` DEVE exigir usuário autenticado e presente em `public.admins`. Sem
sessão, redireciona para `/login?next=/admin`. Logado sem permissão, redireciona para
`/login?next=/admin&erro=sem_acesso_admin` com a mensagem "Essa conta não tem acesso à
administração."

#### Scenario: Conta comum tenta abrir /admin
- **WHEN** um usuário autenticado que não está em `admins` acessa qualquer rota `/admin/**`
- **THEN** é redirecionado para `/login?next=/admin&erro=sem_acesso_admin`, nunca renderiza o
  shell do admin nem some silenciosamente na home

#### Scenario: Sessão corrompida em /admin
- **WHEN** o refresh token está inválido
- **THEN** cai em `/login?next=/admin`, não na tela genérica de erro

### Requirement: Guard de `/seller/**` por posse de loja
O layout de `/seller/**` DEVE exigir sessão e loja própria (`lojas.owner_id = auth.uid()`). Sem
sessão: `/login?next=/seller`. Logado sem loja: `/login?next=/seller&erro=sem_loja` com mensagem
específica. A consulta da loja DEVE filtrar por `owner_id` explicitamente, sem confiar apenas na
RLS (a policy pública libera qualquer loja `Ativa` por select).

#### Scenario: Conta sem loja acessa /seller
- **WHEN** uma conta autenticada sem loja vinculada acessa `/seller`
- **THEN** é redirecionada para `/login?next=/seller&erro=sem_loja`

#### Scenario: Seller com loja EmAnalise
- **WHEN** um seller cuja loja está `'EmAnalise'` acessa `/seller`
- **THEN** o painel renderiza (a loja existe e é dele); o estado de "loja em análise" é
  comunicado dentro do painel, não bloqueia o acesso

### Requirement: Guard de `/parceiro/**` exige sessão
O layout de `/parceiro/**` DEVE exigir sessão: sem usuário autenticado, redirect
`/login?next=/parceiro` — o mesmo padrão de `/seller` e `/admin`, em vez de renderizar o shell +
sidebar com um `<PrecisaLogin />` solto. O gate é só de sessão (não de registro em
`parceiros_logisticos`) porque `/parceiro/cadastro` — o caminho de onboarding — vive sob este
mesmo layout. O caso "logado sem cadastro de parceiro" continua tratado na página
(`/parceiro/page.tsx` mostra o convite com link para `/parceiro/cadastro`), e o acesso aos dados
de corrida é protegido pelas RPCs (`parceiros_logisticos.user_id and status = 'Aprovado'`).

#### Scenario: Deslogado tenta abrir /parceiro
- **WHEN** uma requisição sem sessão acessa qualquer rota `/parceiro/**`
- **THEN** é redirecionada para `/login?next=/parceiro`, sem renderizar o shell do painel

#### Scenario: Comprador logado sem cadastro de parceiro
- **WHEN** uma conta autenticada sem registro em `parceiros_logisticos` acessa `/parceiro`
- **THEN** o layout renderiza e a página mostra "Você ainda não tem cadastro de parceiro
  logístico" com link para `/parceiro/cadastro`; nenhuma corrida é exibida

#### Scenario: Parceiro com cadastro ainda não aprovado
- **WHEN** uma conta com registro em `parceiros_logisticos` e `status` diferente de `'Aprovado'`
  acessa `/parceiro`
- **THEN** a página comunica o status pendente; as RPCs de corrida não retornam dados até o
  status virar `'Aprovado'`

#### Scenario: Parceiro logístico de teste
- **WHEN** `parceiro1-teste-i24@example.com` ou `parceiro2-teste-i24@example.com` (registro em
  `parceiros_logisticos` com `status = 'Aprovado'` no seed) fazem login
- **THEN** acessam `/parceiro` normalmente

### Requirement: Aprovação de loja pelo admin
A tela `/admin/lojas/[id]` DEVE permitir ao admin alterar a `situacao` da loja via
`ModerarSituacaoLoja`. O componente DEVE oferecer, a partir de `'EmAnalise'`, tanto "Ativar"
(`→ 'Ativa'`) quanto "Recusar" (`→ 'Inativa'`), e exibir o estado atual como rótulo (hoje só
tem os botões Ativar/Inativar e assume `'Ativa'`/`'Inativa'`). Aprovar DEVE tornar a loja
visível na vitrine e liberar os produtos aprovados dela.

#### Scenario: Admin aprova uma loja em análise
- **WHEN** o admin abre `/admin/lojas/[id]` de uma loja `'EmAnalise'` e clica "Ativar"
- **THEN** a `situacao` vira `'Ativa'`, a loja aparece na vitrine pública e sai da fila
  `/admin/lojas`

#### Scenario: Admin recusa uma loja em análise
- **WHEN** o admin clica "Recusar" numa loja `'EmAnalise'`
- **THEN** a `situacao` vira `'Inativa'`, a loja não aparece na vitrine e sai da fila de pendentes

### Requirement: Gestão de usuários no admin com gate por role
As ações de `/admin/usuarios` DEVEM ter gate por role além da RLS: `definirRole` exige
`super_admin`; `banirUsuario`/`desbanirUsuario` exigem `super_admin` ou `moderador`;
`resetarSenhaUsuario` exige qualquer admin. Toda ação sensível DEVE gravar em
`auditoria_eventos` via service role. `banirUsuario` DEVE respeitar `checar_rate_limit`
(20 por 5 min).

#### Scenario: Moderador tenta promover um admin
- **WHEN** um admin com role `moderador` (não `super_admin`) chama `definirRole`
- **THEN** a ação lança "Acesso restrito a super-admin." e nada é alterado

#### Scenario: Admin dispara reset de senha de um usuário
- **WHEN** um admin chama `resetarSenhaUsuario` com um e-mail válido
- **THEN** o e-mail de recuperação padrão do GoTrue é enviado e o evento
  `usuario.reset_senha_solicitado` é gravado em `auditoria_eventos`

### Requirement: Granularidade de admin permanece plana nesta rodada
`is_admin()` continua tratando qualquer admin como pleno para efeito de RLS; a diferenciação
super-admin/moderador/financeiro é apenas gate de aplicação (debt 0085). Este change NÃO
introduz RLS diferenciada por role de admin.

#### Scenario: RLS de um admin não-super
- **WHEN** um admin com role `financeiro` lê dados protegidos por `is_admin()`
- **THEN** o acesso é o mesmo de qualquer admin — a distinção de role só vale nas Server Actions
