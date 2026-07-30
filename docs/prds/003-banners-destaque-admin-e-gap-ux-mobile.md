---
prd_number: "003"
status: em-progresso
priority: alta
created: 2026-07-30
issue: ""
depends_on: ["002"]
references:
  - "https://github.com/Schneider-Gr/industria24hIA/pull/166"
  - "supabase/migrations/0092_vitrine_galerias.sql"
  - "supabase/migrations/0093_vitrine_banners_destaque.sql"
  - "docs/prds/002-redesign-pdp-carrinho-multiloja-paleta-leroy-merlin.md"
---

# PRD 003: Banners de destaque editáveis pelo admin + lacuna de UX mobile

## 1. Contexto

- **Produto/área**: vitrine do comprador (home) e painel admin (`/admin`).
- **Estado anterior**: a faixa de destaques da home (`BannerGalerias`, seção "Destaques da
  indústria") era um array `CARDS_GALERIA` hardcoded no componente — trocar um banner exigia
  deploy de código. Não havia tabela nem tela de admin para isso.
- **Problema**: qualquer campanha, promoção sazonal ou destaque editorial na home dependia de
  um desenvolvedor. Isso trava o time comercial/marketing, que não tem acesso ao código.
- **Como chegamos aqui nesta sessão**: o trabalho já tinha sido implementado e testado em outra
  branch (`feat/redesign-vitrine-aurora-industrial`, commit `379d6a4`) — inclusive com a
  migration `0093` já aplicada diretamente em produção — mas nunca foi mergeado em `master`.
  Um cherry-pick parcial (só 2 dos 8 arquivos) tinha ficado esquecido, não commitado, na branch
  `feat/redesign-mockup-leroy-merlin`, quebrando silenciosamente a query da home (tabela
  inexistente no branch) e o link do admin (`/admin/destaques` 404). Esta sessão completou o
  cherry-pick, corrigiu um erro de lint pré-existente que travava o CI (`DealsCountdown.tsx`,
  `setState` síncrono em efeito) e levou o PR #166 a produção.

> **Contexto técnico** (schema, RLS, stack) vive no TRD/migrations — aqui só o essencial de
> negócio. Ver `supabase/migrations/0093_vitrine_banners_destaque.sql` para o schema aplicado.

## 2. Solução Proposta

### Visão de produto

- Banners de destaque da home viram um recurso administrável, com CRUD simples (título, imagem,
  link, badge opcional, ordem, ativo/inativo) — sem depender de deploy.
- A home lê os banners ativos diretamente do banco, ordenados por `ordem`.
- **Gap identificado nesta sessão, ainda não resolvido**: a UX mobile do site como um todo não
  foi auditada nem priorizada. Marketplace B2B com fornecedores e compradores no chão de fábrica
  tem uso mobile relevante *(premissa — confirme ou corrija: não há dado de % de tráfego mobile
  medido nesta sessão; recomendo levantar no GA/Vercel Analytics antes de priorizar)*, e nenhuma
  revisão dedicada de mobile foi feita nos redesigns recentes (Leroy Merlin, PDP/carrinho —
  PRD 002).

### Decisões de produto

1. Banner sem imagem cadastrada não aparece na faixa — melhor não mostrar do que mostrar
   quebrado *(premissa — confirme ou corrija)*.
2. Ordem de exibição é manual (campo `ordem`), não algorítmica — o admin decide a curadoria
   editorial, igual ao padrão já usado em `vitrine_galerias` (PRD/migration 0092).

### Fora do escopo

- Levantamento completo do que falta no frontend do marketplace como um todo. Esta sessão
  resolveu um item pontual (banners) encontrado durante a investigação, mas **não fez auditoria
  de todas as seções do site** — isso fica registrado como pendência de descoberta na §7, não
  como escopo assumido aqui.
- Correções de UX mobile em si — esta PRD documenta a *necessidade* (US02) mas a auditoria e as
  correções pontuais são trabalho futuro, a especificar em PRD próprio depois do levantamento.
- Agendamento de banners por data (campanha com início/fim automático) — não solicitado.
- Métricas de clique/CTR por banner — não solicitado.

## 3. Funcionalidades

### US01: Admin gerencia banners de destaque da home

Como administrador da plataforma, quero cadastrar, editar, reordenar e desativar banners da
faixa de destaques da home, para rodar campanhas e curadoria editorial sem depender de deploy.

**Rules:**
- Só usuários com `is_admin()` podem criar/editar/excluir banners (mesma policy RLS `FOR ALL`
  usada em `vitrine_galerias`, migration 0093).
- Qualquer visitante (não autenticado) pode ler banners com `ativo = true` — leitura pública.
- A home ordena por `ordem` e depois por `created_at` como desempate.
- Banner inativo (`ativo = false`) some da home mas não é excluído do banco.

**Edge cases:**
- Nenhum banner ativo cadastrado → faixa de destaques não renderiza (sem placeholder vazio) —
  *(premissa — confirme ou corrija)*.
- Campo `href` vazio ou inválido → tratar como link não clicável em vez de quebrar a navegação
  *(premissa — confirme ou corrija; não verificado nesta sessão)*.

### US02: Auditoria e priorização de UX mobile

Como dono do produto, quero um levantamento estruturado dos pontos de fricção de UX mobile no
site (vitrine, PDP, carrinho, checkout, painéis seller/admin), para decidir o que corrigir antes
de continuar investindo em features novas de desktop.

**Rules:**
- A auditoria cobre, no mínimo: home, categoria, produto (PDP), carrinho, checkout, e o fluxo de
  login/cadastro — por serem o caminho crítico de compra *(premissa — confirme ou corrija:
  escopo pode crescer para seller/admin se o dono usar esses painéis pelo celular)*.
- Cada ponto de fricção encontrado é registrado com: página, o que quebra/incomoda, viewport
  testado, e severidade (bloqueia compra / atrapalha / cosmético).
- Saída da auditoria é um documento (ou PRD novo) com backlog priorizado — esta US **não**
  inclui a implementação das correções, só o levantamento e a priorização.

**Edge cases:**
- Frixão encontrada já é conhecida e tem PRD/issue aberto → referenciar em vez de duplicar.
- Viewport não suportado pelo design system atual (ex.: dobráveis, tablets em paisagem) →
  registrar como fora do MVP da correção, não bloquear a auditoria por isso
  *(premissa — confirme ou corrija)*.

## 5. Critérios de Aceite

### 5a. Critérios de aceite da feature

| Critério | Razão de negócio | Como verificar (observável) |
|----------|------------------|-----------------------------|
| Admin consegue criar um banner e ele aparece na home em produção sem deploy | É o motivo da feature — desacoplar campanha de release | Criar banner em `/admin/destaques`, recarregar `industria24.com.br`, banner visível |
| Usuário não-admin não consegue escrever em `banners_destaque` (só ler ativos) | RLS é a única barreira real de segurança da tabela | Tentar `insert`/`update` via client anônimo, esperar erro de policy |
| Auditoria de UX mobile entrega lista de problemas com severidade, não só impressão geral | Sem severidade, o backlog vira opinião e não prioriza corretamente | Documento final tem cada item classificado (bloqueia compra / atrapalha / cosmético) |

### 5b. Métricas de sucesso

| Métrica | Baseline (fonte) | Meta | Prazo | Mín. aceitável | Responsável |
|---------|-------------------|------|-------|-----------------|-------------|
| % de tráfego mobile no site | A levantar (GA/Vercel Analytics) | — | Antes de priorizar US02 | — | Dono do produto |
| Nº de problemas bloqueantes de UX mobile no caminho de compra | A levantar (auditoria US02) | 0 problemas "bloqueia compra" em aberto | A definir após auditoria | — | Dono do produto |

**Regras:**
- Ambas as métricas dependem da auditoria (US02) ainda não realizada — marcadas "A levantar".

## 6. Milestones

### Milestone 1: Banners de destaque editáveis em produção

**Por que é um marco:** o time comercial deixa de depender de deploy para trocar destaque da
home — ganho operacional imediato e observável.

**Funcionalidades:** US01

**Checklist de aceite** (marcado pelo Aprovador após a implementação):
- [x] Admin consegue criar/editar/desativar banner em `/admin/destaques` — validado em produção
- [x] Home lê banners de `banners_destaque` e reflete o cadastro do admin
- [x] RLS aplicada (leitura pública só de ativos, escrita só admin)
- [x] Deploy em produção confirmado (`industria24.com.br`, `vercel inspect`, PR #166 mergeado)

**Aprovador:** dono do produto

### Milestone 2: Backlog priorizado de UX mobile

**Por que é um marco:** hoje ninguém sabe, com dado concreto, onde o site machuca no celular —
esse marco troca "acho que o mobile não está bom" por uma lista acionável e priorizada.

**Funcionalidades:** US02

**Checklist de aceite** (marcado pelo Aprovador após a implementação):
- [ ] Auditoria cobre home, categoria, PDP, carrinho, checkout e login/cadastro em pelo menos
      2 viewports mobile reais (ex.: 375px e 414px)
- [ ] Cada problema tem severidade e página associada
- [ ] Documento final entregue e revisado com o dono do produto

**Aprovador:** dono do produto

## 7. Riscos e Dependências

| Risco | Impacto | Mitigação | Status |
|-------|---------|-----------|--------|
| Levantamento geral do frontend do marketplace (o que falta além de banners/mobile) não foi feito nesta sessão | Médio — pode haver outras quebras silenciosas como a de `banners_destaque`, herdadas de branches não mergeadas | Rodar auditoria de branches órfãs (`git branch -r` com commits não mergeados em `master`) como PRD/tarefa própria | Pendente |
| UX mobile pode ter problemas bloqueantes de compra hoje, sem ninguém saber | Alto — impacto direto em conversão se % de tráfego mobile for relevante | Priorizar US02 (auditoria) antes de novas features de desktop | Pendente |

**Dependências:**

| Dependência | Tipo | Status | Impacto se bloqueado |
|-------------|------|--------|----------------------|
| PRD 002 (redesign PDP/carrinho, paleta Leroy Merlin) | Interna | Implementado | US02 precisa reavaliar UX mobile *depois* desse redesign, não antes — telas mudaram |
| Dado de % de tráfego mobile (GA/Vercel Analytics) | Interna | Não levantado | Sem isso, US02 não tem como priorizar objetivamente entre "conserta mobile" e outras iniciativas |

## 8. Referências

- [PR #166](https://github.com/Schneider-Gr/industria24hIA/pull/166) — merge que levou banners de destaque a produção nesta sessão
- [Commit 379d6a4](https://github.com/Schneider-Gr/industria24hIA/commit/379d6a4) — implementação original da feature, em branch nunca mergeada
- `supabase/migrations/0093_vitrine_banners_destaque.sql` — schema e RLS da tabela
- [PRD 002](./002-redesign-pdp-carrinho-multiloja-paleta-leroy-merlin.md) — redesign mais recente de PDP/carrinho, referência obrigatória para a auditoria mobile (US02) não avaliar telas já defasadas

## 9. Registro de Decisões

- **2026-07-30:** decidido completar o cherry-pick do commit `379d6a4` em vez de reimplementar a
  feature do zero, porque a migration já estava aplicada em produção e o código já existia
  testado em outra branch — reimplementar geraria schema duplicado ou divergente. Motivo:
  regra do projeto de nunca inventar schema novo sem necessidade.
- **2026-07-30:** UX mobile registrada como necessidade (US02) mas não iniciada nesta sessão —
  motivo: exige auditoria dedicada com dado real de uso, não uma opinião gerada sem levantamento;
  gerar essa US "cega" seria inventar prioridade sem base.
