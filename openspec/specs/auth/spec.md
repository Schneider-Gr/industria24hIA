# Autenticação Specification

## Purpose
Login, confirmação de e-mail, callback OAuth/magic-link e gestão de acesso. Estado: ✅ produção. Fonte: código em `src/lib/auth.ts`, `src/lib/auth-actions.ts`, `src/middleware.ts`, `auth/callback/`, `auth/confirm/`, `login/`, `definir-senha/`, `acessos/`.

## Requirements

### Requirement: Papéis vivem como flags no usuário
O sistema SHALL modelar autorização por flags no usuário (`lojista`, `superadm`, `promotoradm`, `consorcio`, `afiliado`), nunca por um único "tipo de conta" exclusivo — um usuário pode acumular múltiplos papéis simultaneamente.

#### Scenario: Usuário com múltiplos papéis
- GIVEN um usuário com `lojista = true`
- WHEN esse mesmo usuário recebe `afiliado = true`
- THEN o sistema o reconhece com ambos os papéis simultaneamente, sem exigir conta separada

### Requirement: Logout centralizado
O sistema SHALL encerrar a sessão via `sair()` (server action), redirecionando para `/login` após `supabase.auth.signOut()`.

#### Scenario: Usuário clica em Sair
- GIVEN um usuário autenticado no painel seller ou admin
- WHEN ele clica em "Sair"
- THEN a sessão é encerrada e ele é redirecionado para `/login`

### Requirement: Redirecionamento pós-login preserva destino
O sistema SHALL redirecionar para a página de login com um parâmetro `next=` apontando para a rota original quando um usuário não autenticado tenta acessar uma página que exige sessão, retornando a essa rota após login bem-sucedido.

#### Scenario: Acesso não autenticado a página protegida
- GIVEN um visitante sem sessão ativa
- WHEN ele tenta acessar `/pedido/[id]` ou `/meus-pedidos`
- THEN é redirecionado para `/login?next=/pedido/[id]` (ou rota equivalente) e retorna a ela após autenticar

### Requirement: Confirmação de e-mail via callback
O sistema SHALL processar confirmação de cadastro e magic-link através de `auth/callback/route.ts` e `auth/confirm/route.ts`, usando o fluxo padrão do Supabase Auth.

#### Scenario: Novo cadastro confirma e-mail
- GIVEN um usuário recém-cadastrado que recebeu e-mail de confirmação
- WHEN ele clica no link de confirmação
- THEN `auth/confirm/route.ts` valida o token e a conta passa a autenticada

### Requirement: Isolamento de dados por RLS, não por checagem de aplicação apenas
O sistema MUST garantir que o isolamento de dados sensíveis (ex.: pedido de outro comprador) seja aplicado na camada de RLS do Postgres, não apenas por lógica de UI — acesso direto via URL a um recurso de outro usuário deve ser bloqueado pelo banco.

#### Scenario: Comprador tenta ver pedido de outro usuário via URL direta
- GIVEN um comprador autenticado
- WHEN ele acessa `/pedido/[id]` de um pedido que não é seu
- THEN a RLS da view usada pela página bloqueia o acesso, independentemente do que a UI tentasse exibir

## Known Gaps
- Rate limit de login existe (`src/lib/rate-limit.ts`) mas o comportamento exato sob automação/teste de carga não está documentado aqui — validar antes de qualquer mudança no fluxo de login.
