# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

**Leia `../CLAUDE.md` (raiz do monorepo `Industria24IA/Industria24/`) antes de codar.** Ele define as regras de vibecoding do projeto inteiro (proibido mockar, proibido inventar schema, RLS deny-by-default, segredos) e são obrigatórias aqui — este arquivo cobre apenas o que é específico deste pacote (`web/`).

## Estilo de resposta — modo caveman (obrigatório)

Responda sempre no modo da skill `caveman`, nível `full`: terso, sem filler,
sem pleasantries, sem hedging. Toda a substância técnica permanece; código,
comandos e mensagens de erro ficam intactos e citados literalmente. Não
narrar tool calls. Desligar apenas quando o usuário disser "stop caveman" ou
"normal mode".

## O que é este projeto

Reconstrução em Next.js + Supabase do marketplace legado `industria24h.com.br`
(Bubble.io), publicada em `industria24.com.br`. App Router, TypeScript strict,
Tailwind v4. Fatia vertical: schema real → service/lib → API route → UI, nunca
dado mockado.

## Comandos

```bash
npm run dev      # servidor de desenvolvimento
npm run build    # build de produção (roda no CI)
npm run start    # roda o build
npm run lint     # eslint (roda no CI)
```

Sem `.env.local`, a rota `/acessos` cai num `ErrorState` honesto por design —
isso não é bug.

### Testes — Red, Green, Refactor (obrigatório para código novo)

Vitest instalado (`vitest.config.ts`, escopo `src/**/*.test.ts`). Toda
função nova em `src/lib/*.ts` que carregue regra de negócio (preço,
coletiva, comissão, repasse, disputa, frete) nasce com um `.test.ts`
companheiro escrito **antes** da implementação:

1. **Red** — escrever o teste que falha porque a função não existe/está
   incompleta. Confirmar vermelho com `npx vitest run <arquivo>`.
2. **Green** — implementar o mínimo para o teste passar.
3. **Refactor** — só então refatorar, rodando o teste a cada mudança para
   garantir que continua verde.

```bash
npm run test        # roda tudo uma vez (o que o CI executa)
npm run test:watch  # modo watch para o ciclo red/green
```

Os `.test.ts` existentes usam `node:assert/strict` dentro de um wrapper
`test(...)` do Vitest (não `describe/it` — Vitest só exige que exista uma
suíte registrada). Escrever testes novos no mesmo padrão ou com
`describe/it/expect`, à escolha.

O CI (`.github/workflows/ci.yml`) roda `npm run test` no job `test` e
**quebra o PR se algum teste falhar**. Escopo é código novo — não é
exigido retrofit de `lib/` existente sem teste, mas ao tocar um arquivo
por outro motivo, adicionar teste da função alterada é bem-vindo.

Rotas de API (`src/app/api/**/route.ts`) e Server Actions que só chamam
lógica já testada em `lib/` não precisam de teste próprio; se tiverem
validação/orquestração não trivial embutida, extrair para `lib/` primeiro
(já é a convenção do projeto) e testar lá. Migrations SQL ficam fora do
Vitest — seguem o fluxo manual de `supabase db query --linked` da skill
`migrations-industria24`.

### Migrations Supabase

`supabase/migrations/` tem numeração manual sequencial (114+ arquivos). Antes
de criar uma nova migration ou abrir PR, ver a skill `migrations-industria24`
— colisão de número já quebrou o CI (job `migrations-lint`) três vezes.
Aplicar com `supabase db query --linked --file <arquivo>`; nunca `curl` direto
(egress bloqueado). Toda tabela nova nasce com RLS ativado e sem policy até
haver regra de negócio confirmada.

## CI (`.github/workflows/ci.yml`)

Quatro jobs independentes em todo PR: `secret-scan` (gitleaks), `lint-build`
(`npm run lint` + `npm run build`), `test` (`npm run test`, Vitest),
`migrations-lint` (checa duplicidade de
prefixo numérico em `supabase/migrations/`).

## Arquitetura

### Route groups por papel de usuário

`src/app/` usa route groups do App Router para separar áreas por papel:
`(admin)/admin`, `(seller)/seller`, `(afiliado)/afiliado`, `(parceiro)/parceiro`.
As rotas públicas do marketplace (vitrine, produto, loja, carrinho, checkout,
pedido, coletiva, leilao, corridas) ficam soltas em `src/app/`. Cada área tem
seus componentes espelhados em `src/components/<area>/`.

### Camada de acesso a dados

`src/lib/supabase/` concentra os clients (`client.ts` browser, `server.ts`
Server Components/Actions, `service.ts` service-role para rotas privilegiadas,
`env.ts` validação de env vars, `database.types.ts` gerado do schema real via
`supabase generate typescript types` — **truncado silenciosamente se rodado
sem token**, conferir o diff após regenerar).

Regras de negócio (preço por faixa/lote, compra coletiva, disputas, repasse,
frete) vivem como funções puras testáveis em `src/lib/*.ts` com o `.test.ts`
companheiro ao lado — não misturar essa lógica dentro de componentes ou route
handlers; a rota/página chama a função de `lib`.

### Modularização por domínio (monolito modular)

O repositório é modularizado por **domínio de negócio**, não por camada
técnica — decisão registrada no PRD 018 (`docs/prds/018-monolito-modular-por-dominio.md`)
e na OpenSpec change `openspec/changes/monolito-modular-industria24/`. Seis
módulos, mapeados em `.github/CODEOWNERS`:

- `catalogo-compra` — `produto/`, `loja/`, `categoria/`, `busca/`, `carrinho/`,
  `checkout/`, `pedido/`, `coletiva/`, `coletivas/`, `leilao/`
- `seller` — `(seller)/`
- `afiliado` — `(afiliado)/`
- `logistica-parceiro` — `(parceiro)/`, `corridas/`, `entregador/`
- `admin-plataforma` — `(admin)/`, `mensagens/`, bot/agentes de IA
- `pagamentos-financeiro` — `api/asaas/`, `api/webhooks/`, `asaas.ts`, `repasses.ts`

Mais um bloco de **plataforma compartilhada** (`src/lib/supabase/`, `auth*.ts`,
`rate-limit.ts`, `supabase/migrations/`, `.github/`, configs de raiz), que
exige revisão de quem já é dono dela sempre que um PR de qualquer módulo a
alterar.

**Regra para todo PR novo**: regra de negócio nova entra em
`src/lib/<modulo>/*.ts` (não em `src/lib/*.ts` solto) com `.test.ts`
companheiro. Migração de código pré-existente é incremental (strangler fig,
sem prazo): um arquivo só migra para a convenção quando um PR o toca por
outro motivo (bug ou feature) — nunca como retrofit forçado.

Enquanto os devs além do dono atual dividirem uma única conta GitHub, o
`CODEOWNERS` documenta a estrutura-alvo mas não funciona como gate de review
real (GitHub não impede autoaprovação da própria conta) — ver PR #323 e a
spec `arquitetura-codeowners-dominio`.

### Integrações externas

`src/lib/asaas.ts` (pagamentos/split), `src/lib/uber-direct.ts` e
`src/lib/whatsapp.ts` (Meta API) encapsulam cada provedor externo. Webhooks
recebidos ficam em `src/app/api/webhooks/`. `src/lib/agentes/` e `src/lib/ai/`
concentram os agentes/chamadas LLM (bot de atendimento, curadoria de produto
via IA) — ver skill `crews-ia` para o desenho dos 3 crews e `langgraph-loop`
para fluxos com estado.

### IA / MCP

`mcp-server/` é um sub-pacote Node independente (Express, deps próprias) —
ignorado pelo eslint e pelo `tsconfig.json` da raiz; tratar como projeto
separado ao editar.

### Skills de projeto

31 skills em `.claude/skills/` carregam automaticamente por contexto — checar
a skill do domínio (`regras-de-negocio`, `compra-coletiva`, `rls-seguranca`,
`asaas-pagamentos`, `paridade-bubble`, `qa-prod-industria24`,
`migrations-industria24`, `deploy-industria24`, etc.) antes de assumir uma
regra de negócio, schema ou fluxo de deploy.

### Worktrees

`web-worktrees/` guarda git worktrees paralelos usados por outras sessões —
não tratar como código morto nem apagar sem confirmar que a branch já foi
mergeada.

### Sentry

`sentry.server.config.ts` / `sentry.edge.config.ts` + `@sentry/nextjs` no
`next.config.ts` — captura de erro já instrumentada; não adicionar
`console.log`/try-catch redundante só para observabilidade.

<!-- OPENWIKI:START -->

## OpenWiki

See [AGENTS.md](AGENTS.md) for OpenWiki agent instructions.

<!-- OPENWIKI:END -->
