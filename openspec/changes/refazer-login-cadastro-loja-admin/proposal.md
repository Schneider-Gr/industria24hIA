## Why

O usuário pediu para "refazer e corrigir todo o sistema de login, criação de loja e gestão
Admin", com foco explícito em quatro fluxos: **esqueci a senha, criar conta, criar loja, acessar
o admin** — e anexou as seis contas de demonstração de `ContasTeste.tsx` (admin, seller,
comprador, afiliado, parceiro logístico 1 e 2) como o conjunto de perfis que precisa funcionar
ponta a ponta.

Antes de escrever qualquer tarefa, cada fluxo foi reconferido contra o código atual do checkout
`web/` — regra do CLAUDE.md ("brief com diagnóstico técnico é hipótese, não fato") e porque
`migration list` mente sob drift. Já existe o **PRD 006** (`docs/prds/006-autenticacao-e-acesso-por-perfil.md`,
status rascunho) cobrindo login e acesso por perfil em nível de produto; este change transforma
o PRD 006 em spec executável **e amplia o escopo** para onboarding de loja e gestão Admin, que o
PRD 006 deixou de fora.

### O que já existe e está correto (fora do escopo de reescrita)

- Login e-mail/senha via Server Action `entrarComSenha` com rate limit por e-mail e por IP
  (`src/lib/auth-actions.ts`).
- Login social Google (`FormularioLogin.entrarComGoogle` → `/auth/callback`), tratado como método
  adicional, restrito a destino de comprador (`painelInterno` força e-mail/senha).
- `getUser()` já tem `try/catch` com `Sentry.captureException` (`src/lib/auth.ts:8-25`) — o gap
  do PRD 006 Milestone 1 **já foi fechado**; o helper compartilhado protege `/seller`, `/admin`
  e `/afiliado` de uma vez.
- Recuperação de senha via Resend + `admin.generateLink` (`solicitarRecuperacaoSenha`), com a
  gambiarra client-side documentada de completar a sessão pelo fragmento da URL em
  `/login` (`useRecuperacaoPorFragmento`).
- Criação de conta via `criarConta` (Admin API + Turnstile + Resend), com dois pontos de entrada
  já separados: `/cadastro` (comprador, destino `/`) e `/seller/cadastro` (vendedor, destino
  `/seller/minha-loja`).
- Guards `/admin/**` e `/seller/**` nos layouts de route group, com redirect para
  `/login?next=...&erro=...` e mensagens específicas em `src/app/login/page.tsx`.

### Bugs confirmados por leitura de código (entram no escopo)

1. **Loja nova nasce `Ativa` e escapa da moderação — e o estado `'EmAnalise'` nunca existiu no
   banco.** `0006_loja_situacao.sql:5` define `lojas.situacao` com `default 'Ativa'`. Pior:
   `0033_check_situacao_percentual.sql:7` adicionou `constraint lojas_situacao_check check
   (situacao in ('Ativa', 'Inativa'))` — **`'EmAnalise'` viola essa CHECK constraint** e nunca
   foi permitido no banco (grep de `EmAnalise` nas migrations = zero ocorrências). O guard de
   INSERT que a `0017_fix_lojas_insert_moderacao.sql` tinha (`if new.situacao = 'Ativa' then
   raise`) foi perdido quando `0104_pos_venda_disputas.sql` / `0109_fix_guard_campos_restritos_regressao.sql`
   reconstruíram `guard_campos_restritos()` mantendo só o branch de UPDATE para `lojas`.
   Resultado: `salvarLoja` (`src/app/(seller)/seller/minha-loja/actions.ts`) faz `insert` sem
   `situacao`, assume o default `'Ativa'`, e a loja entra na vitrine sem passar pelo admin. Bate
   com a memória `industria24h-curadoria-langsmith-2026-08-21` ("loja nasce Ativa sem aprovação").
2. **Toda a UI de moderação de loja do admin referencia um estado impossível.** O layout do admin
   (`src/app/(admin)/admin/layout.tsx:30-33`) conta `lojas` com `situacao = 'EmAnalise'` para o
   badge e a fila `/admin/lojas`; `src/app/(admin)/admin/lojas/actions.ts` tem `SITUACOES =
   ["Ativa", "Inativa", "EmAnalise"]`. Mas a CHECK constraint da 0033 só aceita `'Ativa'`/
   `'Inativa'`, então: o badge é sempre 0, e `setSituacaoLoja(fd)` com `'EmAnalise'` lançaria
   violação de constraint (código morto que erraria se acionado). O trabalho aqui é fazer
   `'EmAnalise'` existir de verdade — constraint, default e guard — e alinhar o fluxo de criação
   a ele.
3. **Redirecionamento de login sem `next` refaz a checagem de admin no client.**
   `FormularioLogin.entrar` (`src/components/vitrine/FormularioLogin.tsx:58-64`) consulta
   `admins` no browser via `createClient()` para decidir entre `/admin` e `/seller`. Funciona,
   mas duplica a regra de roteamento por papel que já existe no servidor e ignora os outros
   quatro perfis (comprador, afiliado, parceiro 1/2) — todos caem em `/seller` e batem no
   `redirect("/login?next=/seller&erro=sem_loja")` do layout, um loop de UX para quem não é
   seller. A conta de teste "Comprador" tem destino `/`, mas um comprador real que faz login pela
   página perde esse tratamento.
4. **Gate de parceiro logístico é inconsistente com `/seller` e `/admin`.**
   `src/app/(parceiro)/parceiro/layout.tsx` só checa `getUser()` — qualquer conta autenticada
   renderiza o shell + sidebar do painel do parceiro. Não é vazamento de dados (a página
   `/parceiro/page.tsx:74-101` já trata "sem cadastro" e "status ≠ Aprovado", e as RPCs de
   corrida filtram por `parceiros_logisticos.user_id and status = 'Aprovado'`), mas a UX diverge:
   `/seller` e `/admin` redirecionam para `/login` com aviso, enquanto `/parceiro` mostra o shell
   vazio. Tabela confirmada: `parceiros_logisticos` (`user_id`, `status` com valor `'Aprovado'`).
   O PRD 006 marcou parceiro como "fora do escopo"; o usuário agora incluiu os dois parceiros
   explicitamente.
5. **Recuperação de senha para conta criada só via Google nunca foi validada** (premissa aberta
   no PRD 006 US03) e o fluxo depende de uma gambiarra de fragmento de URL em `/login` que
   quebra silenciosamente se o `Location` de erro do `/auth/confirm` algum dia passar a
   especificar fragmento.

### Pendências de verificação em produção ANTES de codar

`migration list` não prova o estado real do schema. Antes da primeira tarefa de código, rodar via
`supabase db query --linked --file` no projeto que o `.env` do app aponta (confirmar o ref):

- `select column_default from information_schema.columns where table_name='lojas' and column_name='situacao';`
  — confirmar se o default ainda é `'Ativa'`.
- Definição atual de `guard_campos_restritos()` (`\sf public.guard_campos_restritos` ou
  `pg_get_functiondef`) — confirmar que o branch de INSERT para `lojas` realmente não existe hoje
  em produção (pode haver hotfix aplicado fora do repo).
- `select situacao, count(*) from public.lojas group by 1;` — quantas lojas hoje estão em cada
  estado, para dimensionar a migration de dados.
- `select id, providers from auth.users where ...` para uma conta Google-only de teste, e testar
  o fluxo real de `/definir-senha` nela.

## What Changes

- **Novo estado de moderação de loja.** Loja nova nasce `EmAnalise` (não `Ativa`), aparece na
  fila `/admin/lojas`, e só entra na vitrine após o admin aprovar. Restaura o guard de INSERT
  perdido na regressão 0104/0109, agora alinhado ao valor que o layout do admin já espera.
- **Roteamento pós-login por papel no servidor.** Uma única função server-side resolve o destino
  do usuário (`/admin`, `/seller`, `/afiliado`, `/parceiro`, `/`) a partir dos papéis reais,
  usada tanto pelo login sem `next` quanto pelos guards de layout. Remove a consulta a `admins`
  do client.
- **Gate de autorização para `/parceiro/**`.** Mesmo padrão de `/seller`: conta sem vínculo de
  parceiro logístico não renderiza o painel — cai em `/login?next=/parceiro&erro=sem_acesso_parceiro`.
- **Fluxo "esqueci a senha" endurecido.** Documenta e cobre com teste o caso de conta Google-only
  (define a primeira senha) e o caminho de erro de link inválido/expirado; mantém a resposta
  sempre-sucesso (anti-enumeração).
- **Criação de conta por perfil consolidada.** Mantém `/cadastro` (comprador) e `/seller/cadastro`
  (vendedor) como estão; documenta como spec que afiliado e parceiro usam conta genérica +
  solicitação (`/afiliado/solicitar`, `/parceiro/cadastro`), e que admin nunca é self-service.
- **Contas de demonstração viram spec explícita de ambiente.** `ContasTeste.tsx` só renderiza
  fora de produção (já é o caso via `MOSTRAR_CONTAS_TESTE`); a spec fixa isso como requisito e
  lista os seis perfis que o seed de ambiente de testes precisa prover, incluindo os vínculos
  (loja para o seller, linha `admins` para o admin, registro de parceiro para parceiro 1 e 2).

## Impact

- Specs adicionadas: `autenticacao-sessao`, `cadastro-conta-por-perfil`,
  `onboarding-loja-moderacao`, `acesso-admin-gestao`.
- Código: `src/lib/auth.ts` (nova função de roteamento por papel), `src/components/vitrine/FormularioLogin.tsx`
  (usa a função do servidor), `src/app/(parceiro)/parceiro/layout.tsx` (gate), `src/app/(seller)/seller/minha-loja/actions.ts`
  (insert com `situacao` explícita — defensivo), layouts de `/admin` e `/seller` (roteamento
  compartilhado).
- Migration `0152` que: (a) recria `constraint lojas_situacao_check` incluindo `'EmAnalise'`;
  (b) troca o default de `lojas.situacao` para `'EmAnalise'`; (c) adiciona um trigger dedicado
  **só de INSERT** (`guard_loja_insert_moderacao`) que bloqueia INSERT não-admin com `situacao`
  diferente de `'EmAnalise'` — NÃO reescreve `guard_campos_restritos()` (evita depender do texto
  exato vigente e colidir com PRs de migration em voo); (d) **não** altera lojas já `'Ativa'`.
  Testar em `begin; ... rollback;` via `db query --linked` antes de aplicar.
- PRD 006 sai de rascunho: os Milestones 1 e 2 já estão majoritariamente implementados; este
  change fecha o Milestone 3 e adiciona o escopo de loja/admin/parceiro que o PRD não cobria.
- Sem impacto em checkout, repasse ou disputas — o bypass `app.checkout_rpc` da 0109 é preservado
  na migration.
