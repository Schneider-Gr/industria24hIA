## ADDED Requirements

### Requirement: Criação de conta com confirmação de e-mail obrigatória
O sistema DEVE criar contas via `criarConta` (Admin API + Turnstile + e-mail Resend), nunca por
`supabase.auth.signUp` no client. A confirmação de e-mail DEVE ser obrigatória antes do primeiro
login. A senha DEVE ter no mínimo 8 caracteres com confirmação (dois campos que precisam bater,
validados no client antes do round-trip).

#### Scenario: Cadastro válido
- **WHEN** um visitante envia e-mail novo, senha com 8+ caracteres e a confirmação idêntica, e
  passa no Turnstile
- **THEN** a conta é criada não-confirmada, um e-mail de confirmação é enviado pela Resend, e a
  UI mostra "Confirme seu e-mail"

#### Scenario: E-mail já cadastrado
- **WHEN** o e-mail já existe em `auth.users`
- **THEN** a mensagem é específica ("Já existe uma conta com esse e-mail. Faça login ou use
  \"Esqueci a senha\"."), nunca a mensagem genérica de erro

#### Scenario: Senha em vazamento conhecido
- **WHEN** o Supabase recusa a senha com `weak_password` (HIBP)
- **THEN** a mensagem orienta a escolher outra senha, sem travar o formulário

#### Scenario: Turnstile não resolvido
- **WHEN** o token do Turnstile está ausente ou inválido
- **THEN** a conta não é criada e a mensagem pede para refazer a verificação

### Requirement: Pontos de entrada de cadastro por intenção
O sistema DEVE oferecer `/cadastro` (rótulo "Criar conta", destino pós-confirmação `/`) para quem
quer comprar e `/seller/cadastro` (rótulo "Vender no 24h", destino `/seller/minha-loja`) para
quem quer vender. As duas páginas DEVEM reusar o mesmo `FormularioCadastro` e criar a mesma
conta genérica; só o texto e o `next` mudam. Cada página DEVE ter link cruzado para a outra.

#### Scenario: Comprador não é obrigado a se rotular como vendedor
- **WHEN** uma pessoa quer apenas comprar
- **THEN** existe o caminho `/cadastro` que cria a conta sem nenhuma menção a "vendedor" ou
  cadastro de loja

### Requirement: Afiliado e parceiro usam conta genérica mais solicitação
O sistema NÃO DEVE ter formulário de criação de conta dedicado para afiliado nem para parceiro
logístico. Uma conta existente (criada em `/cadastro` ou `/seller/cadastro`) DEVE solicitar o
papel em `/afiliado/solicitar` (afiliação) ou `/parceiro/cadastro` (registro de parceiro), e o
acesso ao painel correspondente só é liberado após a solicitação/aprovação.

#### Scenario: Conta comum solicita afiliação
- **WHEN** um usuário logado sem afiliação acessa `/afiliado`
- **THEN** vê o estado de solicitação/termos, não o painel completo, até a afiliação existir e os
  termos serem aceitos

### Requirement: Uma conta acumula papéis ao longo do tempo
Um mesmo `auth.users.id` PODE ter mais de um papel simultaneamente (ex.: comprador que abre loja
e depois vira afiliado). O sistema NÃO DEVE exigir cadastro separado para adicionar um papel a
uma conta existente.

#### Scenario: Comprador abre uma loja
- **WHEN** uma conta que hoje só compra cadastra uma loja em `/seller/minha-loja`
- **THEN** a mesma conta passa a ter acesso a `/seller` (após aprovação da loja), sem criar nova
  conta

### Requirement: Acesso de admin nunca é self-service
O sistema NÃO DEVE ter formulário público que conceda acesso de admin. Acesso de admin DEVE ser
concedido exclusivamente por inserção manual na tabela `admins` (fora do fluxo de produto).

#### Scenario: Tentativa de virar admin pela UI
- **WHEN** um usuário procura um caminho de produto para se tornar admin
- **THEN** não existe nenhum — a única via é concessão manual em `admins`

### Requirement: Contas de demonstração restritas a ambiente de testes
O componente `ContasTeste` DEVE renderizar apenas quando `NODE_ENV !== "production"`, e o chunk
com a senha de teste NÃO DEVE ser baixado pelo navegador em produção. O ambiente de testes DEVE
prover as seis contas com os vínculos completos: `admin-teste-i24@example.com` (linha em
`admins`), `seller-teste-i24@example.com` (loja `Ativa` vinculada por `owner_id`),
`comprador-teste-i24@example.com` (sem vínculo), `afiliado-teste-i24@example.com` (afiliação
aprovada + termos aceitos), `parceiro1-teste-i24@example.com` e `parceiro2-teste-i24@example.com`
(registro de parceiro logístico).

#### Scenario: Build de produção
- **WHEN** a aplicação roda com `NODE_ENV=production`
- **THEN** a seção "contas de demonstração" não aparece em `/login` e o bundle não contém
  `SENHA_TESTE`

#### Scenario: Atalho de entrada por perfil em ambiente de testes
- **WHEN** em ambiente não-produção um operador clica "entrar" numa das seis contas
- **THEN** o login ocorre e o redirect leva ao destino do perfil (`/admin`, `/seller`, `/`,
  `/afiliado`, `/parceiro`), com o perfil já funcional graças aos vínculos do seed
