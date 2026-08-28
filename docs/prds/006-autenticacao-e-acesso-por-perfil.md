---
prd_number: "006"
status: em-implementacao
priority: alta
created: 2026-07-31
issue: "466"
openspec: refazer-login-cadastro-loja-admin
depends_on: []
references:
  - "src/lib/auth.ts, src/lib/auth-actions.ts — helpers de sessão e logout"
  - "src/components/vitrine/FormularioLogin.tsx, LoginModal.tsx — UI de login"
  - "src/app/auth/callback/route.ts, src/app/auth/confirm/route.ts — callbacks OAuth e OTP"
  - "src/app/seller/cadastro/page.tsx — único fluxo de criação de conta hoje"
---

# PRD 006: Autenticação e Acesso por Perfil

## 1. Contexto

- **Produto/área**: Indústria 24h (industria24.com.br) — marketplace B2B multiloja com quatro perfis de usuário: comprador, seller (vendedor/loja), afiliado (vendas) e admin, além de um perfil de parceiro logístico (fora do escopo deste PRD — ver "Fora do escopo").
- **Estado atual**: existe um único mecanismo de autenticação (Supabase Auth) compartilhado por todos os perfis, com uma única tela de login (`/login`, reaproveitada em modal no header). Login por e-mail/senha e login social com Google (adicionado em 2026-07-30) já estão implementados e em produção. Recuperação de senha ("Esqueci a senha") funciona via link por e-mail. Criação de conta self-service só existe para o perfil seller (`/seller/cadastro`, rotulado "Vender no 24h") — cria a conta de autenticação, mas a loja em si fica em análise até aprovação do admin. Comprador e afiliado não têm formulário de criação de conta próprio: precisam já ter uma conta (criada via `/seller/cadastro` apesar do rótulo, ou por uma conta de demonstração). Acesso de admin não é self-service — depende de uma linha na tabela `admins`, inserida fora do fluxo de produto.
- **Problema**: as regras de login, criação de conta e controle de acesso por perfil nunca foram documentadas de forma unificada — cresceram ad-hoc conforme cada perfil foi implementado. Isso já gerou pelo menos um incidente real: a página de pedido do comprador quebrava com uma tela genérica de erro em vez de pedir login quando a sessão estava com token de refresh inválido (corrigido em 2026-07-31, PR #186). Sem um documento único de regras, fica difícil garantir que login social, recuperação de senha e guarda de rota se comportam de forma consistente entre os quatro perfis.

> **Contexto técnico** (Supabase Auth, SSR com cookies, RLS) vive no TRD (`docs/trd.md`). Aqui só o comportamento observável.

## 2. Solução Proposta

### Visão de produto

- Um único ponto de entrada de login (`/login` e modal) serve os quatro perfis, com e-mail/senha e Google como métodos equivalentes.
- Sessão inválida ou corrompida nunca quebra a página com erro genérico — sempre cai num estado "faça login" acionável.
- Cada perfil tem uma regra clara de como uma conta chega a ele: comprador por conta própria criada em fluxo dedicado, seller por autocadastro + aprovação de loja, afiliado por autocadastro + solicitação de afiliação, admin por concessão manual (fora do self-service, por design).
- Recuperação de senha é o mesmo fluxo para todos os perfis, sem bifurcação por tipo de conta.

### Decisões de produto

1. Login social (Google) é um método adicional de autenticação, não substitui e-mail/senha — o usuário escolhe qualquer um dos dois toda vez. *(confirma o que já está implementado)*
2. Uma mesma conta (mesmo `auth.users.id`) pode acumular papéis diferentes ao longo do tempo — ex.: um comprador que depois vira seller usa a mesma conta, sem precisar de cadastro separado. *(premissa — confirme ou corrija: é isso que já acontece hoje, já que não há um "tipo de conta" fixo no cadastro)*
3. Acesso de admin nunca é self-service — é sempre concedido manualmente (inserção na tabela `admins`), nunca por um formulário público de cadastro. *(confirma comportamento atual)*
4. Conta criada com Google e conta criada com e-mail/senha usando o **mesmo endereço de e-mail** são a mesma conta. *(validado em produção em 2026-07-31: `auth.users` mostra uma única linha com `providers: ["email", "google"]` para a mesma conta que já tinha senha — o Supabase unifica automaticamente por e-mail)*

### Fora do escopo

- Perfil de parceiro logístico (login/cadastro em `/parceiro/cadastro`) — mecanismo similar ao seller, mas não foi revisado nesta rodada; fica para PRD futuro se precisar de mudança de regra.
- Autenticação multifator (MFA/2FA) — não existe hoje e não está sendo pedida nesta rodada. *(premissa — confirme ou corrija)*
- Outros provedores de login social (Facebook, Apple etc.) — só Google está em escopo.
- Remoção das contas de demonstração (`ContasTeste.tsx`) — já marcado no código como "remover antes do lançamento público"; é decisão de lançamento, não desta feature.
- Granularidade de permissões dentro do admin (admin vs. super-admin com RLS diferenciada) — hoje `is_admin()` trata todo admin como pleno; já registrado como debt conhecido em outro lugar do código (0085), não é regra nova a especificar aqui.

## 3. Funcionalidades

### US01: Login com e-mail e senha

Como usuário de qualquer perfil (comprador, seller, afiliado, admin), quero entrar com e-mail e senha, para acessar minha conta e a área correspondente ao meu perfil.

**Rules:**
- O mesmo formulário de login serve todos os perfis — não há tela de login separada por perfil.
- Após o login, o usuário é redirecionado para `next` (parâmetro da URL) quando fornecido, ou para `/seller` como destino padrão.
- Falha de credencial mostra sempre a mesma mensagem genérica ("E-mail ou senha incorretos") — nunca revela se o e-mail existe ou não. *(confirma comportamento atual, correto por segurança)*
- O formulário de login está disponível tanto como página dedicada (`/login`) quanto como modal reaproveitável a partir do header, com o mesmo comportamento.

**Edge cases:**
- `next` aponta para URL externa ou `//host` (open redirect) → ignorado, cai no destino padrão. *(confirma: já implementado via `safeNext`)*
- Usuário já logado acessa `/login` diretamente → **a definir**: hoje não há redirecionamento automático para fora do login; permanece na tela. *(premissa — confirme se deveria redirecionar direto pro destino)*

### US02: Login social com Google

Como usuário de qualquer perfil, quero entrar com minha conta Google, para não precisar criar nem lembrar uma senha específica deste site.

**Rules:**
- O botão "Entrar com Google" fica na mesma tela/modal do login por e-mail/senha, como alternativa e não como fluxo separado.
- O retorno do Google cai em `/auth/callback`, que troca o código OAuth pela sessão e redireciona para o mesmo `next` do login por e-mail/senha.
- Falha ao iniciar o fluxo (provider desabilitado, erro de configuração) mostra mensagem de erro no formulário, sem quebrar a página.

**Edge cases:**
- Provider Google desabilitado no Supabase → erro tratado na tela de login, não propaga para o usuário como tela em branco ou crash. *(confirma: já tratado)*
- `redirect_uri` não cadastrada no Google Cloud Console → o próprio Google recusa com uma tela de erro sua (`redirect_uri_mismatch`); fora do controle da aplicação, mas é um erro de configuração que deve ser verificado no checklist de deploy. *(premissa — confirme ou corrija: incidente real ocorrido em 2026-07-31, resolvido ajustando a config no Google Cloud Console)*
- Código OAuth expirado ou já usado ao chegar em `/auth/callback` → redireciona para `/login?erro=link_invalido`. *(confirma: já implementado)*
- E-mail da conta Google já está cadastrado via e-mail/senha → login social autentica a mesma conta (ver Decisão de produto 4), sem duplicar cadastro. *(confirmado em produção, ver Decisão 4)*

### US03: Recuperação de senha ("Esqueci a senha")

Como usuário que esqueceu a senha, quero receber um link de redefinição por e-mail, para recuperar o acesso à minha conta sem depender de um admin.

**Rules:**
- Disponível a partir do formulário de login, para qualquer perfil.
- Exige que o campo e-mail esteja preenchido antes de disparar o envio.
- O link de recuperação aterrissa em `/auth/confirm`, valida o token e redireciona para `/definir-senha`.
- Mensagem de confirmação de envio é sempre exibida, independente de o e-mail existir na base ou não *(premissa — confirme: hoje o código não distingue, mas confirmar que essa é a intenção de segurança, não uma lacuna)*.

**Edge cases:**
- Campo e-mail vazio ao clicar em "Esqueci a senha" → mostra erro pedindo para preencher, não dispara o envio. *(confirma: já implementado)*
- Link de recuperação expirado ou inválido → redireciona para `/login?erro=link_invalido` com mensagem explicando para tentar de novo ou pedir novo link. *(confirma: já implementado)*
- Usuário pede recuperação de senha para conta criada só via Google (nunca teve senha) → **a definir**: o fluxo de definir senha deveria funcionar mesmo assim (define a primeira senha), mas isso não foi testado explicitamente. *(premissa — confirme ou corrija; validar antes de fechar este PRD)*

### US04: Criação de conta ("criar usuário")

Como uma pessoa nova no marketplace, quero criar uma conta, para poder comprar ou vender.

**Rules:**
- Existe hoje **um único formulário de criação de conta** (`/seller/cadastro`, acessível como "Vender no 24h"), que cria a conta de autenticação e, num segundo momento, permite cadastrar a loja (que fica em análise). *(confirma estado atual)*
- Comprador não tem formulário de criação de conta dedicado — hoje precisa usar o mesmo formulário de cadastro de vendedor para gerar sua conta, mesmo que não pretenda vender. *(confirma gap identificado; é o principal ponto a decidir nesta revisão)*
- Confirmação de e-mail é obrigatória antes do primeiro login — o cadastro exibe "Confirme seu e-mail" e envia o link de confirmação.
- Senha mínima de 8 caracteres, com confirmação de senha (dois campos que precisam bater).
- Tentativa de cadastro com e-mail já usado mostra mensagem específica ("Já existe uma conta com esse e-mail"), não a mensagem genérica de erro.
- Afiliado não tem formulário de criação de conta próprio — usa uma conta já existente (criada como comprador/seller) e depois solicita afiliação em `/afiliado/solicitar`. *(confirma estado atual)*
- Admin nunca é criado por formulário público — sempre por concessão manual (ver Decisão de produto 3).

**Edge cases:**
- Senha e confirmação de senha não coincidem → erro exibido antes de enviar ao Supabase, sem round-trip de rede. *(confirma: já implementado)*
- Cadastro com e-mail já existente → mensagem específica, não trava nem redireciona incorretamente. *(confirma: já implementado)*
- Comprador cria conta pelo formulário "Vender no 24h" só para poder comprar, nunca chega a cadastrar loja → **a definir**: hoje isso é permitido e não gera nenhum problema técnico, mas é um problema de copy/produto (rótulo do formulário não reflete o uso real). *(premissa — confirme ou corrija: é este o gap que motiva revisar esta regra)*

### US05: Controle de acesso por perfil

Como o sistema, quero impedir que um usuário acesse a área de um perfil que não é o seu, para proteger dados e ações sensíveis de cada perfil.

**Rules:**
- `/admin/**`: exige usuário autenticado **e** presente na tabela `admins`; caso contrário redireciona para `/`.
- `/seller/**`: renderiza para qualquer usuário autenticado; a ausência de loja vinculada mostra estado "nenhuma loja encontrada" em vez de bloquear o acesso à área.
- `/afiliado/**`: renderiza um estado "precisa fazer login" para usuário deslogado, em vez de redirecionar; aceite de termos é obrigatório antes de liberar o conteúdo para quem já está logado.
- Compra (`/pedido/[id]`, checkout): usuário deslogado vê estado "Faça login" com link para `/login?next=<rota atual>`; usuário logado só vê pedidos vinculados à própria conta (`cliente_id = auth.uid()` via RLS/view) — pedido de outra conta responde como "não encontrado" (404), nunca com erro de permissão explícito. *(confirma comportamento correto por segurança — não vaza a existência do pedido)*
- Qualquer falha inesperada ao verificar sessão (ex.: token de refresh inválido) é tratada como "usuário deslogado", nunca propaga como erro genérico de página. **(GAP CONFIRMADO em 2026-07-31: só está corrigido em `/pedido/[id]`. `/seller`, `/admin` e `/afiliado` chamam o mesmo helper `getUser()` de `src/lib/auth.ts`, que não tem `try/catch` — as três áreas quebram com o mesmo erro genérico "Algo deu errado" caso a sessão esteja corrompida. É trabalho pendente deste PRD, não um comportamento já correto.)**

**Edge cases:**
- Sessão com refresh token inválido em qualquer área logada → tratada como deslogado, sem crash. **(confirmado corrigido apenas em `/pedido/[id]`; `/seller`, `/admin` e `/afiliado` ainda quebram — auditado por leitura de código em 2026-07-31, não é premissa)**
- Usuário autenticado sem papel nenhum (nem admin, nem loja, nem afiliação) acessa `/seller` → vê "nenhuma loja encontrada" com CTA para cadastrar loja, não um erro. *(confirma: já implementado)*
- Usuário logado tenta acessar pedido de outro cliente pela URL → 404, não uma mensagem de acesso negado. *(confirma: comportamento correto de RLS)*

## 4. Fluxo de Negócio

```
Usuário acessa /login (ou modal)
   │
   ├── Escolhe e-mail/senha ──▶ signInWithPassword ──┬── sucesso ──▶ redirect next (ou /seller)
   │                                                  └── falha ──▶ mensagem genérica de erro
   │
   └── Escolhe "Entrar com Google" ──▶ Supabase authorize ──▶ Google
                                          │
                                          ├── provider desabilitado ──▶ erro na tela de login
                                          ├── redirect_uri inválida ──▶ erro do próprio Google (config, fora do app)
                                          └── sucesso ──▶ /auth/callback ──┬── code válido ──▶ redirect next (ou /seller)
                                                                          └── code expirado/inválido ──▶ /login?erro=link_invalido

Acesso a área restrita (/admin, /seller, /afiliado, /pedido/[id])
   │
   ▼
Sessão válida?
   ├── não (deslogado ou token inválido) ──▶ estado "faça login" (nunca erro genérico)
   └── sim ──▶ tem o papel exigido pela área?
                  ├── admin: está em `admins`? ──┬── sim ──▶ libera
                  │                              └── não ──▶ redirect "/"
                  ├── seller: sempre libera ──▶ mostra loja ou "nenhuma loja encontrada"
                  ├── afiliado: aceite de termos pendente? ──┬── sim ──▶ portão de termos
                  │                                          └── não ──▶ libera
                  └── comprador (pedido): dono do pedido? ──┬── sim ──▶ mostra pedido
                                                             └── não ──▶ 404
```

## 5. Critérios de Aceite

### 5a. Critérios de aceite da feature

| Critério | Razão de negócio | Como verificar (observável) |
|----------|------------------|-----------------------------|
| Nenhuma área logada (`/seller`, `/admin`, `/afiliado`, `/pedido/[id]`) mostra a tela genérica "Algo deu errado" do Next quando a sessão está ausente ou corrompida | Incidente real em 2026-07-31 mostrou que isso derruba a experiência de compra sem explicação acionável para o usuário | Simular sessão com cookie de auth inválido (refresh token corrompido) em cada área e confirmar que cai em estado "faça login", não em error boundary |
| Login por e-mail/senha e por Google levam ao mesmo destino pós-login para o mesmo `next` | Consistência de experiência entre os dois métodos | Testar os dois métodos com o mesmo `next` e comparar o destino final |
| Tentativa de cadastro com e-mail duplicado nunca deixa a UI em estado ambíguo (sem feedback ou com erro genérico) | Evita usuário achar que o cadastro travou | Cadastrar com e-mail já existente e confirmar mensagem específica |
| Pedido de outro cliente acessado por URL direta nunca revela dados nem mensagem de "acesso negado" — sempre 404 | Não vazar existência de pedidos de terceiros | Acessar `/pedido/<id-de-outro-cliente>` logado como outro usuário e confirmar 404 |

### 5b. Métricas de sucesso

| Métrica | Baseline (fonte) | Meta | Prazo | Mín. aceitável | Responsável |
|---------|-------------------|------|-------|-----------------|-------------|
| Ocorrências do erro genérico "Algo deu errado" em áreas logadas (Sentry, tag `area:pedido_page` e equivalentes a criar para seller/admin/afiliado) | A levantar — ainda não há tag padronizada nas demais áreas | 0 ocorrências/semana | 30 dias após implementação | ≤ 1 ocorrência isolada/semana, sem repetição do mesmo usuário | Dono do produto |
| Taxa de conclusão de cadastro (conta criada → e-mail confirmado) | A levantar (não instrumentado hoje) | A definir após baseline | — | — | Dono do produto |

**Regras:**
- Baseline de erro genérico marcado como "A levantar" — falta padronizar a tag Sentry `area:*_page` em `/seller`, `/admin` e `/afiliado` do mesmo jeito que já existe em `/pedido/[id]`.

## 6. Milestones

### Milestone 1: Login unificado e resiliente

**Por que é um marco:** qualquer perfil consegue entrar por e-mail/senha ou Google, e uma sessão corrompida nunca quebra a experiência com um erro genérico — é a base de confiança de todo o resto do produto logado.

**Funcionalidades:** US01, US02, US05

**Checklist de aceite** (marcado pelo Aprovador após a implementação):
- [ ] Login por e-mail/senha funciona para os quatro perfis e respeita `next`
- [ ] Login com Google funciona e cai no mesmo destino que o login por e-mail/senha
- [ ] `getUser()` em `src/lib/auth.ts` trata falha de sessão com `try/catch` (mesmo padrão do PR #186), corrigindo `/seller`, `/admin` e `/afiliado` de uma vez — confirmado que hoje nenhuma das três tem esse tratamento
- [ ] Acesso a pedido de outro cliente responde 404, nunca mensagem de acesso negado

**Aprovador:** Dono do produto

### Milestone 2: Recuperação de senha confiável

**Por que é um marco:** usuário recupera acesso à própria conta sem depender de suporte manual, incluindo o caso de contas criadas só via Google.

**Funcionalidades:** US03

**Checklist de aceite** (marcado pelo Aprovador após a implementação):
- [ ] Link de recuperação expirado/inválido redireciona com mensagem clara
- [ ] Definir senha funciona também para conta que só tinha login via Google

**Aprovador:** Dono do produto

### Milestone 3: Criação de conta clara por perfil

**Por que é um marco:** resolve a ambiguidade atual de um comprador precisar passar pelo formulário "Vender no 24h" só para conseguir comprar — cada perfil tem um caminho de entrada que faz sentido para ele.

**Funcionalidades:** US04

**Checklist de aceite** (marcado pelo Aprovador após a implementação):
- [ ] Existe um caminho de criação de conta que não exige rotular a pessoa como "vendedor" quando ela só quer comprar
- [ ] Cadastro com e-mail duplicado continua com mensagem específica após a mudança

**Aprovador:** Dono do produto

## 7. Riscos e Dependências

| Risco | Impacto | Mitigação | Status |
|-------|---------|-----------|--------|
| `getUser()` sem `try/catch` em `src/lib/auth.ts` — usado por `/seller`, `/admin` e `/afiliado` — reproduz o mesmo crash já corrigido em `/pedido/[id]` sempre que a sessão está com refresh token inválido | Alto — confirmado por leitura de código em 2026-07-31, não é hipótese; qualquer usuário com sessão corrompida nessas três áreas vê a tela genérica "Algo deu errado" em vez de "faça login" | Aplicar o mesmo padrão de `try/catch` do PR #186 diretamente no helper compartilhado `getUser()` (conserta as três áreas de uma vez, em vez de repetir em cada layout) | Confirmado — correção ainda não implementada |
| Rótulo "Vender no 24h" no único formulário de cadastro pode já estar confundindo compradores reais hoje, antes mesmo deste PRD ser implementado | Médio | Levantar dados de quantas contas "vendedor" nunca cadastraram loja (proxy de comprador mal-rotulado) | Pendente |

**Dependências:**

| Dependência | Tipo | Status | Impacto se bloqueado |
|-------------|------|--------|----------------------|
| Provider Google habilitado no Supabase + redirect URI correta no Google Cloud Console | Externa | Concluído em 2026-07-31 | Bloqueia todo o Milestone 1 relacionado a login social |

## 8. Referências

- [PR #180 — login social via Google](https://github.com/Schneider-Gr/industria24hIA/pull/180) — implementação original do login com Google
- [PR #186 — blindagem da página de pedido contra sessão corrompida](https://github.com/Schneider-Gr/industria24hIA/pull/186) — incidente que motiva o Milestone 1

## 9. Registro de Decisões

- **2026-08-27:** PRD virou a OpenSpec change `refazer-login-cadastro-loja-admin`, com escopo
  ampliado para onboarding de loja e gestão Admin. Milestone 1 (login resiliente, `getUser()`
  com `try/catch`) e Milestone 2 (recuperação de senha via `hashed_token`, sem a gambiarra de
  fragmento) já estão no master. A change cobre: roteamento pós-login por papel no servidor
  (US01), gate de sessão em `/parceiro`, e — achado novo — o estado `'EmAnalise'` de loja, que
  violava a CHECK constraint da migration 0033 e nunca existiu no banco (migration 0152).
- **2026-07-31:** Login social com Google tratado como método adicional, não substituto do e-mail/senha, para nenhum perfil. Motivo: manter um único mecanismo de sessão e evitar duas experiências de conta divergentes.
- **2026-07-31:** Acesso de admin permanece fora do self-service, concedido apenas por inserção manual em `admins`. Motivo: é a área mais sensível do marketplace (aprova lojas, produtos, repasses); autocadastro nela seria um risco de segurança desproporcional ao ganho de conveniência.
- **2026-07-31:** Ambiguidade do cadastro único ("Vender no 24h" usado por compradores) registrada como gap a resolver no Milestone 3, em vez de manter como está. Motivo: rótulo engana a intenção do usuário e mistura papel de comprador com vendedor sem necessidade.
