## ADDED Requirements

### Requirement: Ponto único de login para todos os perfis
O sistema DEVE oferecer um único formulário de login (página `/login` e modal do header)
compartilhado pelos perfis comprador, seller, afiliado, admin e parceiro logístico, com
e-mail/senha e Google como métodos. Não DEVE existir tela de login separada por perfil.

#### Scenario: Login por e-mail/senha bem-sucedido
- **WHEN** um usuário de qualquer perfil envia e-mail e senha corretos
- **THEN** a sessão é criada e o usuário é redirecionado para o parâmetro `next` da URL, quando
  presente e interno, ou para o destino resolvido pelo papel (ver "Roteamento pós-login por papel")

#### Scenario: Credencial inválida
- **WHEN** o e-mail ou a senha estão incorretos
- **THEN** a resposta é sempre a mensagem genérica "E-mail ou senha incorretos", sem revelar se o
  e-mail existe

#### Scenario: Rate limit de login
- **WHEN** há mais de 5 tentativas por e-mail em 60s ou mais de 20 por IP em 60s
- **THEN** o login é recusado com "Muitas tentativas seguidas. Aguarde um minuto e tente de novo"
  e o evento é registrado no Sentry com `signal: rate_limit`

#### Scenario: `next` aponta para URL externa
- **WHEN** o `next` é uma URL absoluta, protocol-relative (`//host`) ou fora do domínio
- **THEN** o `next` é ignorado e o destino cai no roteamento por papel

### Requirement: Login social Google como método adicional
O botão "Entrar com Google" DEVE ficar na mesma tela/modal do login por e-mail/senha. O retorno
DEVE cair em `/auth/callback`, trocar o código OAuth pela sessão e redirecionar para o mesmo
destino do login por e-mail/senha. Login social DEVE ficar disponível apenas quando o destino é
de comprador; destinos de painel interno (`/seller`, `/admin`, `/afiliado`, `/parceiro`) DEVEM
exibir apenas e-mail/senha.

#### Scenario: Conta Google com e-mail já cadastrado por senha
- **WHEN** o e-mail da conta Google já existe em `auth.users` criado via e-mail/senha
- **THEN** o login social autentica a mesma conta (o Supabase unifica por e-mail), sem duplicar
  cadastro

#### Scenario: Provider Google desabilitado ou código OAuth expirado
- **WHEN** o provider está desabilitado, ou o código chega a `/auth/callback` expirado/já usado
- **THEN** o usuário é redirecionado para `/login?erro=link_invalido` com mensagem acionável, sem
  tela em branco nem error boundary

### Requirement: Sessão corrompida nunca quebra a página
Qualquer falha ao resolver a sessão (ex.: refresh token inválido) em `/seller/**`, `/admin/**`,
`/afiliado/**`, `/parceiro/**` e `/pedido/[id]` DEVE ser tratada como usuário deslogado. O helper
compartilhado `getUser()` DEVE capturar a exceção, reportá-la ao Sentry com `area: auth` e
retornar `null`.

#### Scenario: Acesso a área logada com cookie de auth inválido
- **WHEN** o cookie de sessão existe mas o refresh token não é mais válido
- **THEN** a área cai no estado "faça login" (redirect para `/login?next=<rota>` ou componente
  `PrecisaLogin`), nunca na tela genérica "Algo deu errado"

### Requirement: Roteamento pós-login por papel resolvido no servidor
O sistema DEVE ter uma única função server-side que, dado o usuário autenticado, retorna o
destino do painel dele: `/admin` se está em `admins`; senão `/seller` se tem loja própria; senão
`/afiliado` se tem afiliação aprovada; senão `/parceiro` se tem registro de parceiro logístico;
senão `/`. Essa função DEVE ser usada tanto pelo login sem `next` quanto pelos guards de layout.
O client NÃO DEVE consultar a tabela `admins` diretamente para decidir rota.

#### Scenario: Login sem `next` de um comprador
- **WHEN** uma conta sem loja, sem afiliação e sem registro de parceiro faz login sem `next`
- **THEN** o destino é `/`, não `/seller` — sem passar por `/login?erro=sem_loja`

#### Scenario: Login sem `next` de um admin
- **WHEN** uma conta presente em `admins` faz login sem `next`
- **THEN** o destino é `/admin`

#### Scenario: Login sem `next` de um parceiro logístico
- **WHEN** uma conta com registro de parceiro logístico e sem loja faz login sem `next`
- **THEN** o destino é `/parceiro`

### Requirement: Recuperação de senha unificada
"Esqueci a senha" DEVE estar disponível a partir do formulário de login para qualquer perfil,
exigir o campo e-mail preenchido, e sempre exibir a confirmação de envio independentemente de o
e-mail existir (anti-enumeração). O link DEVE aterrissar em `/auth/confirm` e seguir para
`/definir-senha`.

#### Scenario: E-mail vazio ao pedir recuperação
- **WHEN** o usuário clica em "Esqueci a senha" com o campo e-mail vazio
- **THEN** um erro pedindo para preencher o e-mail é exibido e nenhum e-mail é disparado

#### Scenario: Link de recuperação expirado ou inválido
- **WHEN** o token de recuperação está expirado ou já foi usado
- **THEN** o usuário vai para `/login?erro=link_invalido` com mensagem para pedir um novo link

#### Scenario: Recuperação de senha para conta criada só via Google
- **WHEN** o dono de uma conta que nunca teve senha (apenas provider `google`) pede recuperação e
  abre `/definir-senha`
- **THEN** o fluxo define a primeira senha da conta com sucesso, e a partir daí a conta aceita
  login por e-mail/senha e por Google
