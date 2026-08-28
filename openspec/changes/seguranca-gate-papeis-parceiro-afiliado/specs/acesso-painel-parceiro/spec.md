## ADDED Requirements

### Requirement: Painel do parceiro logístico exige papel de parceiro
O layout de `/parceiro` DEVE, além de exigir sessão, verificar que o usuário tem linha em
`public.parceiros_logisticos` com `status <> 'Suspenso'`. Sem sessão, DEVE redirecionar para
`/login?next=/parceiro`. Logado sem o papel, DEVE redirecionar para
`/login?next=/parceiro&erro=sem_acesso_parceiro`. O shell do parceiro NÃO DEVE renderizar para
contas sem o papel, mesmo que a RLS já filtre os dados das páginas internas.

#### Scenario: Comprador autenticado acessa /parceiro
- **WHEN** uma conta autenticada sem linha em `parceiros_logisticos` navega para `/parceiro`
- **THEN** é redirecionada para `/login?next=/parceiro&erro=sem_acesso_parceiro` e o shell
  "Parceiro logístico" não é renderizado

#### Scenario: Visitante deslogado acessa /parceiro
- **WHEN** um usuário sem sessão navega para `/parceiro`
- **THEN** é redirecionado para `/login?next=/parceiro`

#### Scenario: Parceiro suspenso acessa /parceiro
- **WHEN** uma conta com linha em `parceiros_logisticos` e `status = 'Suspenso'` navega para `/parceiro`
- **THEN** é tratada como sem acesso e redirecionada para `/login?next=/parceiro&erro=sem_acesso_parceiro`

#### Scenario: Parceiro aprovado acessa /parceiro
- **WHEN** uma conta com linha em `parceiros_logisticos` e `status` diferente de `'Suspenso'` navega para `/parceiro`
- **THEN** o painel do parceiro é renderizado normalmente
