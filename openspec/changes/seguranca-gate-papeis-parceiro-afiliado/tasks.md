## 0. `src/middleware.ts` (sessão + barreira de borda)

- [ ] 0.1 Ler `node_modules/next/dist/docs/` sobre middleware no Next 16 antes de escrever (regra
      do AGENTS.md) e o guia `@supabase/ssr` de middleware/`updateSession`.
- [ ] 0.2 `src/middleware.ts`: `createServerClient` com read/write de cookies na `NextResponse`,
      chamar `supabase.auth.getUser()` para renovar a sessão. `matcher` excluindo
      `_next/static`, `_next/image`, `favicon`, imagens.
- [ ] 0.3 Para `pathname` começando com `/admin`, `/seller`, `/afiliado`, `/parceiro` sem
      usuário: `NextResponse.redirect(new URL('/login?next=' + pathname, req.url))`.
- [ ] 0.4 NÃO consultar papel (admins/lojas/parceiros_logisticos) no middleware — isso continua
      no `layout.tsx`. Comentário no arquivo deixando isso explícito.
- [ ] 0.5 Atualizar o comentário de `src/lib/supabase/server.ts:23` agora que o middleware existe.
- [ ] 0.6 QA manual em preview: deslogado em `/admin` → `/login?next=/admin` sem flash do shell;
      sessão perto de expirar continua válida após navegar (cookie renovado).

## 0b. Rate limiting distribuído (`src/lib/rate-limit.ts`)

- [ ] 0b.1 `npm install @upstash/ratelimit @upstash/redis`.
- [ ] 0b.2 `src/lib/rate-limit.test.ts` (Red): `checarLimite` async, nega após `max` hits na
      janela, usa fallback em memória quando env vars ausentes.
- [ ] 0b.3 `checarLimite(chave, max, janelaMs)` async: se `UPSTASH_REDIS_REST_URL` e
      `UPSTASH_REDIS_REST_TOKEN` presentes, usa `Ratelimit.slidingWindow`; senão, o `Map` atual.
- [ ] 0b.4 Env vars novas registradas como **opcionais** em `src/lib/supabase/env.ts` (ou onde o
      projeto valida env) e documentadas em `.env.example` / `docs/`.
- [ ] 0b.5 Os 7 call sites passam a `await checarLimite(...)`: `src/app/api/busca-preview/route.ts`,
      `src/app/api/categorias/route.ts`, `src/app/api/checkout/cotar-frete/route.ts`,
      `src/app/checkout/actions.ts`, `src/app/coletiva/actions.ts`,
      `src/app/pedido/[id]/actions.ts`, `src/lib/auth-actions.ts`.
- [ ] 0b.6 `npm run test` + `npm run build` verdes com e sem as env vars setadas localmente.

## 1. Helpers de papel (`src/lib/auth.ts`)

- [ ] 1.1 `ehParceiroLogistico(): Promise<boolean>` — `select 1 from parceiros_logisticos where
      user_id = auth.uid() and status <> 'Suspenso'`. Mesmo estilo de `isAdmin()`.
- [ ] 1.2 `ehAfiliado(): Promise<boolean>` — critério confirmado com o time (default: linha em
      `afiliacoes`). Documentar o critério escolhido em comentário no helper.
- [ ] 1.3 `src/lib/auth.test.ts` (ou companheiro): cobre não-logado, logado-sem-papel,
      logado-com-papel, parceiro suspenso.

## 2. Gate no layout do parceiro

- [ ] 2.1 `src/app/(parceiro)/parceiro/layout.tsx`: `if (!user) redirect("/login?next=/parceiro")`.
- [ ] 2.2 `if (!(await ehParceiroLogistico())) redirect("/login?next=/parceiro&erro=sem_acesso_parceiro")`.
- [ ] 2.3 Remove o fallback `{!user ? <PrecisaLogin /> : children}` — layout só renderiza para
      parceiro válido.
- [ ] 2.4 Página de cadastro de parceiro (`/parceiro/cadastro`) continua acessível a quem ainda
      não tem linha? Se sim, ela sai do route group protegido ou o gate abre exceção para ela.
      Decidir e documentar.

## 3. Gate no layout do afiliado

- [ ] 3.1 `src/app/(afiliado)/afiliado/layout.tsx`: mesmo padrão com `ehAfiliado()` e
      `next=/afiliado`, `erro=sem_acesso_afiliado`.
- [ ] 3.2 `PortaoTermos` de `TERMOS_AFILIADO` continua depois do gate de papel.
- [ ] 3.3 Remove o `<PrecisaLogin />` inline.

## 4. Auditoria de acesso negado

- [ ] 4.1 Migration `00NN_auditoria_acesso_negado.sql`: RPC `registrar_acesso_negado(p_rota text,
      p_papel text)` `security definer` que insere em `auditoria_eventos` (`acao =
      'acesso.negado'`, `ator_id = auth.uid()`, `ator_papel = 'authenticated'`, `dados_depois =
      jsonb_build_object('rota', p_rota, 'papel_esperado', p_papel)`). `revoke from public, anon`;
      `grant execute to authenticated`.
- [ ] 4.2 Checar colisão de número da migration em todas as branches antes de criar.
- [ ] 4.3 Testar em `begin; select registrar_acesso_negado('/parceiro','parceiro'); select * from
      auditoria_eventos order by criado_em desc limit 1; rollback;` via `supabase db query --linked`.
- [ ] 4.4 `src/lib/auditoria-acesso.ts` + `.test.ts`: `registrarAcessoNegado({ rota, papelEsperado })`
      chama a RPC; falha da RPC é logada em Sentry mas não bloqueia o `redirect`.
- [ ] 4.5 Chamar `registrarAcessoNegado` nos quatro layouts (`admin`, `seller`, `parceiro`,
      `afiliado`) imediatamente antes de cada `redirect` de papel (não antes do redirect de
      "sem sessão").

## 5. Contas de teste públicas

- [ ] 5.1 Decisão do usuário: gate por `process.env.NEXT_PUBLIC_AMBIENTE !== 'producao'` ou
      remoção total de `src/components/vitrine/ContasTeste.tsx`.
- [ ] 5.2 Constante `SENHA_TESTE` sai do arquivo. Documentar as contas de demo fora do repo
      (memória de sessão / doc interno).
- [ ] 5.3 `grep -rn "Teste-i24h-2026\|-teste-i24@example.com" src` volta vazio (ou só sob gate de
      ambiente).
- [ ] 5.4 Ajustar call sites de `<ContasTeste />` (vitrine / login).

## 6. Verificação

- [ ] 6.1 `npm run test`, `npx tsc --noEmit`, `npm run build`, `eslint` limpos.
- [ ] 6.2 QA manual em preview: conta comprador tentando `/parceiro` e `/afiliado` → volta pro
      login com o `erro` correto; conta parceiro entra em `/parceiro`; evento `acesso.negado`
      aparece em `auditoria_eventos`.
- [ ] 6.3 `grep -rn "ContasTeste" src` só em código sob gate de ambiente (ou vazio).
- [ ] 6.4 Rechecar colisão de número da migration antes de abrir o PR.
- [ ] 6.5 Branch `security/gate-papeis-parceiro-afiliado`, PR aberto linkando a issue.

## 7. Pendências de decisão humana (resolver antes de aplicar)

- [ ] 7.1 `ContasTeste.tsx`: gate de ambiente vs remoção total.
- [ ] 7.2 Critério de "é afiliado" (`afiliacoes` qualquer status vs só `Aprovada`).
- [ ] 7.3 Usuário cria o banco Upstash Redis e grava `UPSTASH_REDIS_REST_URL` /
      `UPSTASH_REDIS_REST_TOKEN` nos envs de produção da Vercel (sem isso o fallback em memória
      segue ativo).
