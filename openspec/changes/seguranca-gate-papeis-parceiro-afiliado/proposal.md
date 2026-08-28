## Why

O usuário trouxe um relatório de auditoria de controle de acesso ("Status dos 6 perfis", plano de
correção em 5 fases) propondo: `src/middleware.ts` novo com `requireAdmin/requireSeller/
requireAffiliate/requireLogisticsPartner`, 8 tabelas novas (`seller_profiles`, `buyer_profiles`,
`affiliate_profiles`, `logistics_partners`, `deliveries`, `audit_logs`, …), RLS nova, 42 casos de
QA e ~14h de trabalho.

Regra do CLAUDE.md ("brief com diagnóstico técnico é hipótese, não fato"): cada item foi
reconferido contra o código atual antes de virar tarefa. **A maior parte do relatório descreve
algo que já existe com outra forma.** O que sobra são quatro lacunas reais, pequenas e sem dono.

### Reconferência item a item

- **"Sem middleware de proteção" — PARCIALMENTE FALSO.** Não há `src/middleware.ts` (Edge), mas
  todo route group protegido tem gate em Server Component no `layout.tsx`:
  `src/app/(admin)/admin/layout.tsx` (`getUser` + `isAdmin`, `redirect("/login?next=/admin")`),
  `src/app/(seller)/seller/layout.tsx` (`getUser` + `getMinhaLoja`, `redirect(".../login?...&erro=
  sem_loja")` — comentário no arquivo descreve exatamente o vazamento "qualquer conta autenticada
  renderizava o shell do seller" já corrigido). Não é "ausente"; é **incompleto em dois grupos**
  (parceiro, afiliado). Um `middleware.ts` Edge seria defesa em profundidade opcional, não o
  conserto — e reescrever o padrão de gate de todo o app é regressão de risco alto num checkout
  com tráfego concorrente. Fora do escopo.
- **"Sem banco de dados de papéis" — FALSO.** `public.admins` + coluna `role` (`super_admin`/
  `moderador`/`financeiro`) + RPCs `has_role()` / `is_super_admin()` (migration `0085_admin_roles`).
  `public.parceiros_logisticos` com `user_id` unique + `status` (`Pendente`/`Aprovado`/`Suspenso`)
  (migration `0039_parceiro_logistico_schema`). Papel de seller = existir linha em `public.lojas`
  com `owner_id = auth.uid()`. Papel de afiliado = `public.afiliacoes`. As 8 tabelas `*_profiles`
  propostas duplicariam `lojas`, `parceiros_logisticos`, `afiliacoes` e `entregas` — rejeitadas.
- **"Sem auditoria de logins" — PARCIALMENTE FALSO.** `public.auditoria_eventos` existe (migration
  `0034_auditoria_eventos`): trilha append-only, RLS `select` só admin, escrita só por trigger
  `security definer`/`service_role`, já cobrindo eventos financeiros/identidade (situação da loja,
  moderação de produto, repasse, troca de role, chave PIX). O que **não** registra: tentativa de
  acesso a rota sem papel (acesso negado). `auth.users.last_sign_in_at` e o audit log nativo do
  Supabase Auth já cobrem login bem-sucedido/falho — não vamos reimplementar isso.
- **"Rate limiting incompleto" — decisão já registrada.** `src/lib/rate-limit.ts` (em memória)
  tem comentário condicionando o upgrade para `@upstash/ratelimit` a haver abuso real medido via
  Sentry; o change `hardening-seguranca-owasp-medio-baixo` (PR #397) decidiu explicitamente adiar.
  Não reabrir aqui sem o usuário pedir. Ver "Pendências de decisão humana".
- **"Contas de teste hardcoded" — VERDADEIRO.** `src/components/vitrine/ContasTeste.tsx` renderiza
  6 e-mails de demonstração + senha compartilhada `Teste-i24h-2026!` em texto no bundle público
  da vitrine, com `TODO(fase-de-testes): remover antes do lançamento público`. É a única lacuna
  do relatório classificada como CRÍTICA que se confirma. "Mover para DB" não se aplica — já são
  usuários reais do Supabase Auth; o conserto é **remover o componente** (ou colocá-lo atrás de
  flag de ambiente, nunca em produção).

### Lacunas reais neste change

1. **Gate de papel ausente em `(parceiro)`.** `src/app/(parceiro)/parceiro/layout.tsx` só checa
   `getUser()`. Qualquer conta autenticada (comprador, seller) renderiza o shell "Parceiro
   logístico" — vazio, porque as páginas leem via RLS, mas exposto e sem `redirect` preservando
   `next`. Deve seguir o padrão do seller: sem linha em `parceiros_logisticos`, sai do painel.
2. **Gate de papel ausente em `(afiliado)`.** `src/app/(afiliado)/afiliado/layout.tsx` idem: só
   `getUser()`, e deslogado cai no componente inline `PrecisaLogin` em vez de `redirect(
   "/login?next=/afiliado")`. Deve exigir linha em `public.afiliacoes` (ou o critério de papel de
   afiliado que o time definir) e redirecionar como admin/seller.
3. **Contas de teste públicas em produção.** `ContasTeste.tsx` + a senha em texto saem do bundle
   público (gate por `process.env` ou remoção), e a senha compartilhada deixa de constar no
   repositório.
4. **Acesso negado não é auditado.** Os `redirect(...&erro=sem_acesso_admin|sem_loja)` dos gates
   não deixam registro. Cada bloqueio por falta de papel deve gravar um evento
   `acesso.negado` em `auditoria_eventos` (ator, papel esperado, rota), via um helper único
   chamado nos quatro layouts.

## What Changes

- `src/lib/auth.ts`: novos helpers `ehParceiroLogistico()` (linha em `parceiros_logisticos` com
  `status <> 'Suspenso'`) e `ehAfiliado()` (critério de papel de afiliado a confirmar com o time —
  provável: linha em `afiliacoes`), no mesmo estilo de `isAdmin()`/`getMinhaLoja()`.
- `src/app/(parceiro)/parceiro/layout.tsx`: `if (!user) redirect("/login?next=/parceiro")`;
  `if (!(await ehParceiroLogistico())) redirect("/login?next=/parceiro&erro=sem_acesso_parceiro")`.
  Remove o fallback `<PrecisaLogin />` inline.
- `src/app/(afiliado)/afiliado/layout.tsx`: mesmo padrão com `ehAfiliado()` e
  `next=/afiliado`. Mantém o `PortaoTermos` de `TERMOS_AFILIADO` já existente.
- `src/lib/auditoria-acesso.ts` (novo) + `.test.ts`: `registrarAcessoNegado({ rota, papelEsperado
  })` — insere em `auditoria_eventos` (`acao = 'acesso.negado'`, `ator_id = auth.uid()`,
  `dados_depois = { rota, papel_esperado }`) via RPC `security definer` (client não tem insert em
  `auditoria_eventos`). Chamado nos quatro layouts antes de cada `redirect` de papel.
- Migration nova (`00NN_auditoria_acesso_negado.sql`): RPC `registrar_acesso_negado(p_rota text,
  p_papel text)` `security definer`, `grant execute to authenticated`. `check` de `acao` em
  `auditoria_eventos` ampliado se houver (verificar schema — 0034 não parece restringir `acao`).
- `src/components/vitrine/ContasTeste.tsx` + pontos de uso: só renderiza quando
  `process.env.NEXT_PUBLIC_AMBIENTE !== 'producao'` (ou remoção total, decisão do usuário).
  Constante `SENHA_TESTE` sai do arquivo — as contas de demo passam a viver só no ambiente de
  testes, documentadas fora do repo.

## Impact

- `src/lib/auth.ts` (+2 helpers); `src/lib/auditoria-acesso.ts` (novo) + `.test.ts`.
- `src/app/(parceiro)/parceiro/layout.tsx`, `src/app/(afiliado)/afiliado/layout.tsx`,
  `src/app/(admin)/admin/layout.tsx`, `src/app/(seller)/seller/layout.tsx` (só a chamada de
  auditoria antes do `redirect` já existente).
- `src/components/vitrine/ContasTeste.tsx` e seus call sites.
- Migration nova (RPC de auditoria de acesso negado). Verificar colisão de número em todas as
  branches antes de criar e de novo antes do push (regra do CI `migrations-lint`).
- Sem tabela nova, sem RLS reescrita, sem `src/middleware.ts`, sem dependência nova.

## Non-goals

- `src/middleware.ts` Edge com `requireX()` — os gates em `layout.tsx` já cobrem; Edge middleware
  fica como defesa em profundidade para um change futuro, se medição justificar.
- Tabelas `seller_profiles`/`buyer_profiles`/`affiliate_profiles`/`logistics_partners`/
  `deliveries` — `lojas`, `afiliacoes`, `parceiros_logisticos`, `entregas` já cobrem.
- Perfil explícito de "comprador" — comprador é qualquer conta autenticada sem papel adicional;
  não há rota `/comprador` protegida a criar.
- Granularidade de RLS por role (`moderador` vs `financeiro`) — 0085 já registrou como decisão
  futura separada.
- Rate limiting distribuído (Upstash) — decisão de adiamento já registrada em outro change.

## Pendências de decisão humana

- **`ContasTeste.tsx`**: gate por env var (mantém as contas em preview/staging) **ou** remoção
  total agora? O usuário decide.
- **Critério de papel de afiliado**: confirmar se "é afiliado" = existir linha em `afiliacoes`
  (qualquer status? só `Aprovada`?) ou outro sinal.
- **Rate limiting distribuído**: reabrir a decisão de adiar (abrir conta Upstash) ou manter?
- **`src/middleware.ts` Edge**: quer a camada extra agora ou fica para depois de medir?
