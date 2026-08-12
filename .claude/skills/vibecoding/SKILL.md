---
name: vibecoding
description: "Use para construir features, sistemas ou módulos que tocam múltiplas camadas (UI + API + banco + auth) de ponta a ponta — do zero, refatoração cross-layer, ou quando o usuário pede multi-agent, subagentes, pipeline fullstack ou equipe fullstack. Orquestra Tech Lead → Backend → Frontend → DB/DevOps → QA com contratos antes da implementação. Acione sempre que ouvir: cria essa feature, monta esse fluxo fim-a-fim, vamos vibe coding com equipe, usa agentes, multi-agent, subagentes, pipeline fullstack, do zero, sprint inicial, ou qualquer feature que envolva 3+ camadas simultaneamente. NÃO use para bug fix simples, mudança de CSS/copy, debug/investigação ou tarefa em uma única camada."
---

# Vibecoding — Equipe Fullstack

## Papel

Você orquestra uma equipe fullstack de papéis (Tech Lead, Backend, Frontend, DB/DevOps, QA). Cada papel tem escopo de decisão próprio; nenhum código nasce sem contrato escrito entre camadas. O default é trocar de chapéu (Claude único); subagente é exceção justificada por paralelismo real.

## Objetivo

Construir features multi-camada sem o bug clássico de "campo que um lado manda e o outro não espera": contratos antes de implementação, handoffs com artefato concreto, QA obrigatório antes de declarar pronto.

## Quando NÃO usar (recusar e seguir caminho direto)

Bug fix de uma linha · mudança cosmética/copy · debug/investigação · pergunta conceitual · mudança em UMA camada só · projeto coberto por skill mais específica. Se o usuário insistir: "Para essa tarefa a equipe gera ~5x mais tokens sem ganho. Posso seguir direto?"

## Fase 0 — Confirmação de escopo

1. A tarefa toca **3+ camadas** (UI / API / DB / auth / infra)? 1-2 → skill é overkill, caminho linear.
2. Qual projeto? Visual Connect → carregar contexto da skill visual-connect. Outro → stack existente ou default abaixo.
3. Chapéu sequencial ou subagentes paralelos? Sugerir; o dono decide.

## Princípios (não negociáveis — se um passo conflitar, refazer)

1. **Papéis são roteiros, não pessoas.** Subagente só com ganho concreto de paralelismo ou especialização.
2. **Contratos antes de implementação.** Backend define schema SQL e forma do response antes do Frontend escrever fetch; Frontend define props/estado antes do Backend implementar. Sem contrato escrito, ninguém codifica.
3. **Handoffs com artefato verificável:** schema SQL aplicável, interface TypeScript, componente isolado, seed data, lista de env vars. Sem artefato, a fase não terminou.
4. **QA não é opcional.** Antes de declarar pronto, invocar revisor-vibecoding no escopo construído.
5. **Stack do dono, não invenção.** Adotar o stack do projeto. Nunca trocar lib no meio da feature.

## Papéis — decide / NÃO decide / entrega

| Papel | Decide | NÃO decide | Entrega |
|---|---|---|---|
| **Tech Lead** (1ª fase, sempre) | Decomposição em camadas, libs (dentro do stack), estrutura de pastas, contratos preliminares | Implementação; trocar stack sem o dono | Tarefas numeradas por camada, contratos (interfaces TS, schema SQL, rotas), o que roda em paralelo, recomendação chapéu vs subagentes |
| **Backend** (após contratos) | Endpoints/Edge Functions, validação Zod, auth, erros de servidor | Schema do banco; UI; mudar contrato sem realinhar | Código das rotas, tipos TS exportados, curl/snippet de teste passando |
| **Frontend** (após tipos do Backend — só os tipos, não o código pronto) | Componentes, hooks, estado, rotas, estilo, loading/error/empty | Forma do request/response; schema; tipos do backend | Componentes conectados ao contrato (mock se preciso), estados tratados, a11y básica |
| **DB/DevOps** (paralelo ao Backend, ou antes se depende de schema) | Migrations, RLS, índices, tipos de coluna, env vars, deploy | Lógica de aplicação; stack | `.sql` aplicável, RLS para CADA tabela nova, seed opcional, env vars novas |
| **QA** (após as três entregas) | Aplicar revisor-vibecoding; aprovar/rejeitar; achados 🔴/🟡/🟢 | Reescrever código; escopo novo | Relatório; bloqueadores 🔴 voltam ao papel dono |
| **Designer** (opcional, só se dono pediu) | Tokens, microinterações, hierarquia visual/a11y | Stack; implementação React | Specs visuais, tokens, fluxo UX |

## Fluxo

1. **Tech Lead briefa** → apresentar ao dono para aprovação ANTES de qualquer outra fase.
2. **Sprint** — paralelo (subagentes via Agent tool) ou sequencial (chapéus na ordem DB → Backend → Frontend, sem pular handoffs).
3. **Integração** — compor tudo, `npm run dev`, testar fluxos principais; descasamento volta ao papel responsável. Muito retrabalho aqui = contratos da Fase 1 foram vagos.
4. **QA** — revisor-vibecoding; 🔴 volta ao papel, 🟡 pós-deploy, 🟢 nota.
5. **Deploy** — migrations, env vars, produção confirmada no ambiente real (usar skill deploy-vc/deploy-instal quando aplicável).
6. **Retrospectiva** (projetos novos) — 1 frase por papel; atualizar esta skill se algo virou regra.

## Subagentes — regra de isolamento (crítica)

⚠ **Subagentes que EDITAM arquivos em paralelo no mesmo working tree se atropelam** (revertem tracked ao HEAD, `File modified since read`, commit pega 1 de N arquivos, node_modules corrompido) — fricção nº1 da auditoria de 134 sessões. Ao spawnar escritores: `isolation: 'worktree'` na Agent tool, OU branch dedicada por papel com commit cedo. Agentes só-leitura podem compartilhar o tree. **Nunca 2+ escritores no mesmo checkout.**

Use subagentes quando: 2+ tarefas independentes, ou fase com contexto pesado que envenenaria o principal, ou feature grande (ganho > overhead). Em dúvida → chapéu. Briefing de subagente inclui: papel exato, contratos da Fase 1, restrições de stack, artefato esperado, o que NÃO decidir.

## Stack default (projeto novo sem stack — confirmar com o dono antes de scaffold)

Next.js (App Router) + TS strict · Tailwind + Shadcn/UI + Framer Motion · Supabase (Auth + Postgres + RLS + Edge Functions) · `supabase gen types typescript --linked` a cada migration · TanStack Query + Zustand · Zod compartilhado · Vercel + Supabase Cloud.

## Regras estritas

- ⛔ NÃO codificar sem contrato (Fase 1 pulada = voltar).
- ⛔ NÃO deixar tabela nova sem RLS. Sem exceção.
- ⛔ NÃO usar `any` para "resolver" tipo — `unknown` com narrowing, genérico, ou o tipo certo.
- ⛔ NÃO declarar pronto sem QA (Fase 4).
- ⛔ NÃO trocar stack no meio da feature; NÃO puxar dependência nova para o que 10 linhas resolvem.
- ⛔ NÃO pular handoff ("já sei o que o Backend vai fazer, adianto o Frontend" = retrabalho garantido).
- ⛔ NÃO copiar trecho de componente irmão sem varrer símbolos não importados.

## Verificação

Feature "pronta" = QA rodado + fluxo principal testado no ambiente real (não só localhost) + migrations aplicadas + RLS confirmada em cada tabela nova. Reportar o que ficou 🟡/🟢 para depois — nunca omitir.

## Saída esperada

Feature em produção com: documento de decomposição aprovado, contratos cumpridos, relatório de QA, e pergunta final ao dono: atacar os 🟡 agora ou parar? Se o dono discordar de um papel/fase, não defender o protocolo — perguntar a evidência e ajustar.
