## 0. Verificação de produção (ANTES do merge — precisa do CLI linkado do usuário)

- [x] 0.1 Ref de prod: `tiwdqgyeyvceaiqqwitc` (memória `reference-supabase-conta-navegacao-por-projeto`).
      MCP Supabase retorna **acesso negado** (token de outra org) — Task 0 completa e o
      `begin;/rollback;` da migration precisam de `supabase db query --linked` pelo usuário.
- [ ] 0.2 `supabase db query --linked`: `select column_default from information_schema.columns
      where table_name='lojas' and column_name='situacao';` — confirmar se ainda é `'Ativa'`.
- [ ] 0.3 `select pg_get_constraintdef(oid) from pg_constraint where conname='lojas_situacao_check';`
      — confirmar que a 0033 (`in ('Ativa','Inativa')`) segue vigente em prod (a 0152 recria
      idempotente de qualquer forma).
- [ ] 0.4 `select situacao, count(*) from public.lojas group by 1;` — quantas lojas em cada estado.
- [x] 0.5 Tabela de parceiro: `parceiros_logisticos` (`user_id`, `status` = `'Aprovado'`, 0039).
      Fora dos tipos gerados (`supabase as any` no código).
- [x] 0.6 `afiliacoes` liga por `afiliado_id = auth.uid()` (policy `afiliacoes_afiliado_read`,
      0011); status aprovado = `'Aprovada'`. Routing só checa "tem alguma afiliação", não o status.
- [ ] 0.7 Testar `/definir-senha` com uma conta Google-only real (US03). Nota: `solicitarRecuperacaoSenha`
      no master já usa `hashed_token` → link direto pro `/auth/confirm` (a gambiarra de fragmento
      em `/login` virou legado morto). Falta só validar o caso sem provider `email`.

## 1. Migration 0152 — `0152_loja_situacao_em_analise.sql` ✅ escrita

- [x] 1.1 Colisão checada no worktree (master termina em 0148, sem dup). **Re-checar antes do PR**
      (`cd supabase/migrations && ls | grep -oE '^[0-9]{4}' | sort | uniq -d`): #454 (0149),
      #462 (0150/0151), #431/#435 renumeram ao rebasear. 0152 é o próximo livre.
- [x] 1.2 A 0152 **não reescreve `guard_campos_restritos()`** (decisão revista): (a) recria
      `lojas_situacao_check` incluindo `'EmAnalise'` — o achado que mudou o plano: `'EmAnalise'`
      violava a CHECK da 0033 e nunca existiu no banco; (b) `alter column situacao set default
      'EmAnalise'`; (c) trigger dedicado `guard_loja_insert_moderacao` (BEFORE INSERT) bloqueando
      não-admin com `situacao != 'EmAnalise'`, liberando `auth.uid()` nulo / admin / `app.checkout_rpc`.
- [x] 1.3 Default → `'EmAnalise'`.
- [x] 1.4 Não altera lojas existentes.
- [ ] 1.5 `begin; ... rollback;` via `db query --linked` (usuário): INSERT não-admin default →
      `'EmAnalise'` ok; INSERT não-admin `'Ativa'` → raise; INSERT `app.checkout_rpc` → passa;
      UPDATE de `situacao` por não-admin → ainda barrado por `guard_campos_restritos`.
- [ ] 1.6 `supabase db push` + confirmar `column_default`, a constraint e o trigger via `db query`.

## 2. Server Action de loja ✅

- [x] 2.1 `salvarLoja` (`seller/minha-loja/actions.ts`): ramo de criação inclui `situacao: "EmAnalise"`.

## 3. Roteamento pós-login por papel (servidor) ✅

- [x] 3.1 `src/lib/auth-destino.ts` (novo): `destinoPorPapel()` pura — admin > loja > afiliação >
      parceiro > `/`.
- [x] 3.2 `src/lib/auth.ts`: `resolverDestinoPorPapel()` resolve os booleans via Supabase; early
      return pra admin.
- [x] 3.3 `src/lib/auth-actions.ts`: `destinoPosLogin()` server action wrapper.
- [x] 3.4 `FormularioLogin.tsx`: remove a query a `admins` no client; `destino = next ?? await
      destinoPosLogin()`; fallback do `safeNext` agora `/`.
- [x] 3.5 `src/lib/auth-destino.test.ts` (novo): 7 asserts de precedência. Import relativo
      (`./auth-destino`) — vitest deste repo não resolve `@/`.

## 4. Gate de `/parceiro/**` ✅ (escopo revisto)

- [x] 4.1 `parceiro/layout.tsx`: **só gate de sessão** — `if (!user) redirect("/login?next=/parceiro")`,
      e `{children}` direto (era `{!user ? <PrecisaLogin/> : children}`). Não gateia por registro
      de parceiro porque `/parceiro/cadastro` (onboarding) vive sob o mesmo layout; o caso
      "logado sem cadastro" já é tratado em `parceiro/page.tsx`. `sem_acesso_parceiro` descartado.
- [x] 4.2 `ModerarSituacaoLoja.tsx`: rótulo do estado atual + rótulos "Aprovar"/"Recusar" quando
      `situacao === 'EmAnalise'` (a action `setSituacaoLoja` já aceitava `'EmAnalise'` em `SITUACOES`).

## 5. Recuperação de senha — Google-only

- [x] 5.1 Master já resolveu o hop pelo GoTrue (hashed_token). Falta só o teste manual de conta
      sem provider `email` (task 0.7) — se falhar, `updateUser({ password })` cria o identity.

## 6. Contas de demonstração / seed

- [x] 6.1 `ContasTeste` só com `NODE_ENV !== "production"` (import dinâmico em `login/page.tsx`);
      `next build` confirma que a rota não vira chunk com a senha em produção.
- [ ] 6.2 Seed idempotente das 6 contas com vínculos — **pendente** (precisa de acesso ao
      Supabase do ambiente de testes). Não bloqueia o PR de código.

## 7. Fechamento

- [x] 7.1 `tsc --noEmit` ✅ · `eslint` (arquivos tocados) ✅ · `vitest run` 123 ✅ · `next build` ✅.
- [ ] 7.2 Re-checar colisão de migration imediatamente antes de abrir/atualizar o PR.
- [ ] 7.3 `docs/prds/006-*`: status `rascunho` → `aprovado`, Milestones 1/2 já implementados no
      master, linkar este change.
- [ ] 7.4 QA manual pós-deploy: cookie de auth inválido em `/seller` `/admin` `/afiliado`
      `/parceiro` → estado "faça login", nunca error boundary; login das 6 contas → destino certo;
      criar loja → nasce `EmAnalise` e aparece na fila `/admin/lojas`.
