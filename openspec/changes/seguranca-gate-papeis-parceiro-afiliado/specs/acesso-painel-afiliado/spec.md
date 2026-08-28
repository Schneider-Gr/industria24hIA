## ADDED Requirements

### Requirement: Painel do afiliado exige papel de afiliado
O layout de `/afiliado` DEVE, além de exigir sessão, verificar que o usuário atende ao critério de
papel de afiliado (linha em `public.afiliacoes`, com o filtro de status confirmado com o time).
Sem sessão, DEVE redirecionar para `/login?next=/afiliado`. Logado sem o papel, DEVE redirecionar
para `/login?next=/afiliado&erro=sem_acesso_afiliado`. O componente inline `PrecisaLogin` NÃO DEVE
mais ser usado como fallback no layout. O `PortaoTermos` de `TERMOS_AFILIADO` continua aplicado
após o gate de papel.

#### Scenario: Conta sem afiliação acessa /afiliado
- **WHEN** uma conta autenticada que não é afiliada navega para `/afiliado`
- **THEN** é redirecionada para `/login?next=/afiliado&erro=sem_acesso_afiliado`

#### Scenario: Visitante deslogado acessa /afiliado
- **WHEN** um usuário sem sessão navega para `/afiliado`
- **THEN** é redirecionado para `/login?next=/afiliado` (sem renderizar `PrecisaLogin` no layout)

#### Scenario: Afiliado com termos pendentes acessa /afiliado
- **WHEN** uma conta afiliada com `TERMOS_AFILIADO` pendentes navega para `/afiliado`
- **THEN** o gate de papel passa e o `PortaoTermos` é exibido antes do painel
