---
prd_number: "015"
status: rascunho
priority: média
created: 2026-08-14
issue: "#287"
depends_on: []
references:
  - "https://github.com/Schneider-Gr/industria24hIA/pull/287"
  - "https://github.com/anthropics/claude-code-action"
---

# PRD 015: Automação de Revisão de PR e Triagem de Issues via Claude Code Action

## 1. Contexto

- **Produto/área**: Infraestrutura de engenharia do Industria24h — fluxo de contribuição de código (GitHub) no repo `Schneider-Gr/industria24hIA`.
- **Estado atual**: todo PR aberto no repo passava só pelo CI mecânico (`secret-scan`, `lint-build`, `migrations-lint`, `test`) e por revisão humana quando disponível. Não havia nenhuma leitura automatizada de qualidade/segurança do diff nem triagem de issues novas — issues chegavam sem classificação, prioridade ou label, dependendo de alguém abrir e ler manualmente.
- **Problema**: com múltiplas sessões de agente e colaboradores trabalhando em paralelo (dezenas de worktrees simultâneos, ver `git-colaboracao`), PRs regularmente violam regras já documentadas em `CLAUDE.md` (dado mockado, schema inventado, RLS ausente em tabela nova, função de regra de negócio sem teste companheiro) sem que ninguém capture isso antes do merge. Issues novas também acumulam sem triagem, atrasando a identificação de bugs críticos (dinheiro, RLS, marketplace fora do ar).

> **Contexto técnico** (GitHub Actions, `anthropics/claude-code-action@v1`, Vitest) vive no TRD/skills do projeto — ver `.claude/skills/tdd-red-green-refactor` e a implementação em `.github/workflows/`.

## 2. Solução Proposta

### Visão de produto

- Todo PR aberto ou atualizado recebe automaticamente um comentário de revisão do Claude, cobrindo tanto as regras específicas deste projeto (mock proibido, RLS, schema, TDD) quanto qualidade geral (bugs, segurança, performance).
- Toda issue nova recebe automaticamente classificação (bug/feature/dúvida/débito técnico), avaliação de prioridade, sugestão de labels e checagem de duplicata.
- A automação **complementa**, não substitui, a revisão humana e o CI mecânico existente — ela não bloqueia merge nem decide sozinha.
- Construída com o mesmo rigor de TDD que o projeto já exige para código de produto: o pipeline de automação foi ele mesmo desenvolvido test-first *(premissa de enquadramento — a automação é tratada como "produto interno" sujeito às mesmas regras de qualidade do app, confirme ou corrija)*.

### Decisões de produto

1. Revisão de PR dispara automaticamente em todo `opened`/`synchronize`, sem exigir menção manual — prioriza cobertura total sobre economia de custo de API.
2. A automação nunca aprova, rejeita ou fecha nada sozinha (nem PR, nem issue) e nunca escreve código — o output é sempre comentário/label, mantendo humano no controle da decisão final.
3. Permissão de cada workflow é mínima para a tarefa (`contents: read` na revisão de PR, sem permissão de escrita em código; `issues: write` isolado na triagem) — reduz o raio de dano se o prompt for manipulado via conteúdo malicioso num PR/issue.
4. Autenticação via `ANTHROPIC_API_KEY` como secret do repositório, sem instalar o GitHub App oficial — decisão pragmática porque os gatilhos usados (`pull_request`, `issues`) são nativos do GitHub Actions e não dependem do App, que só é necessário para reagir a menções `@claude` em comentários.

### Fora do escopo

- Aprovação/rejeição automática de PR (`gh pr review --approve`/`--request-changes`) — decisão de merge continua humana.
- Fechamento automático de issues, mesmo duplicatas — a automação só comenta apontando a duplicata.
- Implementação de código pelo Claude em resposta a review ou issue (ex.: auto-fix) — fora de escopo desta entrega *(premissa — pode virar PRD futuro dependente deste)*.
- Gatilho por menção `@claude` em comentário de PR/issue — exigiria instalar o GitHub App, não feito nesta entrega (ver §7).
- Teste automatizado do *conteúdo* das respostas do Claude em produção (qualidade do review, precisão da triagem) — só a estrutura dos workflows é testada (ver US02).
- Revisão de segurança dedicada (OWASP) ou checklist customizável por tipo de arquivo — a revisão de PR é genérica, cobrindo tudo num único prompt.

## 3. Funcionalidades

### US01: Revisão automática de Pull Request

Como mantenedor do repositório, quero que todo PR aberto ou atualizado receba um comentário de revisão automático do Claude, para pegar violações das regras do projeto e problemas de qualidade antes de eu revisar manualmente.

**Rules:**
- Dispara em `pull_request: opened` e `synchronize` (nova revisão a cada push no PR).
- Não dispara em PR em rascunho (`draft`).
- O prompt de revisão cobre, na ordem: regras específicas do projeto (proibido mock, schema não documentado, RLS ausente, credencial em texto puro, função de regra de negócio em `src/lib` sem `.test.ts` companheiro, colisão de migration) e depois qualidade geral (bugs prováveis, segurança, performance, legibilidade).
- Feedback geral vai como comentário de PR (`gh pr comment`); apontamentos de linha específica vão como comentário inline.
- A automação nunca aprova, rejeita ou solicita mudanças formalmente no PR — só comenta.
- A automação nunca escreve ou edita código do PR.

**Edge cases:**
- PR aberto por bot (ex.: dependabot, se algum dia existir) → mesma regra se dispara é aplicada; sem tratamento especial nesta entrega *(premissa — revisar se causar ruído)*.
- PR sem nenhuma violação de regra e sem achado de qualidade → comentário confirma que não há achados, evitando silêncio ambíguo sobre se a automação rodou *(premissa — comportamento do prompt, não testado automaticamente)*.
- Push que só altera arquivos fora do `src/` (ex.: só `docs/`) → revisão ainda dispara (não há filtro de `paths` nesta entrega) *(premissa — pode gerar ruído desnecessário em PRs só de doc; ver §7)*.

### US02: Triagem automática de issue nova

Como mantenedor do repositório, quero que toda issue nova seja classificada e rotulada automaticamente, para priorizar o que é crítico (dinheiro, RLS, produção fora do ar) sem depender de alguém ler tudo manualmente.

**Rules:**
- Dispara em `issues: opened`.
- Classifica a issue como bug, feature request, dúvida ou débito técnico.
- Avalia prioridade em 4 níveis (crítico, alto, médio, baixo); trata como crítico qualquer relato envolvendo comissão/repasse/pagamento Asaas, segurança/RLS, ou marketplace fora do ar.
- Sugere e aplica labels via `gh issue edit --add-label`.
- Verifica possível duplicata via `gh search issues`; se encontrar, comenta citando a issue original.
- Nunca fecha a issue nem implementa código em resposta a ela.

**Edge cases:**
- Issue sem corpo (só título) → automação ainda classifica com a informação disponível, sem bloquear por falta de descrição *(premissa)*.
- Issue que já teria sido pega como duplicata mas o autor original já foi resolvido/fechado → comentário ainda cita a original para contexto histórico, mesmo que fechada *(premissa)*.
- Duas issues abertas quase simultaneamente descrevendo o mesmo problema → cada disparo do workflow roda isolado; não há garantia de que a segunda já veja a primeira indexada em `gh search issues` a tempo *(premissa — risco aceito, não é objetivo de negócio evitar 100% dos casos)*.

### US03: Automação construída em TDD (Red-Green-Refactor)

Como responsável técnico pela automação, quero que o próprio pipeline de revisão/triagem seja desenvolvido com teste escrito antes da implementação, para que mudanças futuras nos workflows tenham uma rede de segurança automática, consistente com o padrão de TDD já adotado no projeto para código de produto (`tdd-red-green-refactor`).

**Rules:**
- Existe um teste estrutural (`scripts/claude-workflows.test.ts`, Vitest) que valida, para cada workflow: gatilho correto (`pull_request.types`/`issues.types`), uso da action `anthropics/claude-code-action@v1`, chave de API vinda de `secrets.ANTHROPIC_API_KEY` (nunca hardcoded), e permissão mínima do job.
- O teste foi escrito e confirmado falhando (RED, arquivo de workflow inexistente) antes de qualquer workflow ser criado.
- Os workflows foram criados para satisfazer exatamente esse teste (GREEN), depois refatorados mantendo o teste verde (REFACTOR).
- O job `test` do CI (`.github/workflows/ci.yml`) roda esse teste (e o resto da suíte Vitest) em todo PR, fechando o gate — sem isso, o teste estrutural só validaria localmente.

**Edge cases:**
- Alguém edita um workflow diretamente sem passar pelo teste → o CI quebra no próximo PR que tocar `.github/workflows/*.yml` porque o job `test` roda `npm run test`, pegando a regressão estrutural (não o conteúdo do prompt).
- Teste estrutural passa mas o prompt do workflow foi alterado de forma que muda o comportamento de negócio (ex.: passa a aprovar PR automaticamente) → **não é pego** pelo teste, que só valida estrutura YAML, não o conteúdo do prompt *(risco registrado em §7, não em Rule — é limitação conhecida, não comportamento a corrigir aqui)*.

## 4. Fluxo de Negócio

```
PR aberto/atualizado
   │
   ▼
É draft?
   ├── sim ──▶ não dispara revisão
   └── não ──▶ Claude revisa (regras do projeto + qualidade)
                  │
                  ▼
              Comenta achados no PR (geral + inline)
                  │
                  ▼
              Mantenedor decide merge (revisão automática é só insumo)

Issue nova aberta
   │
   ▼
Claude classifica (tipo, prioridade) e busca duplicata
   │
   ├── é duplicata ──▶ comenta citando a original
   └── não é ──▶ aplica labels sugeridas
                  │
                  ▼
              Mantenedor prioriza triagem manual usando os labels
```

## 5. Critérios de Aceite

### 5a. Critérios de aceite da feature

| Critério | Razão de negócio | Como verificar (observável) |
|----------|------------------|-----------------------------|
| Todo PR não-draft aberto/atualizado recebe comentário de revisão do Claude | sem isso a automação não cumpre o objetivo de pegar violação de regra antes do merge | abrir PR de teste, confirmar comentário do workflow `claude-pr-review` no histórico do PR |
| Toda issue nova recebe labels e classificação em até a duração de um run do Actions (minutos, não horas) | triagem lenta demais perde valor frente à triagem manual | abrir issue de teste, confirmar labels aplicadas e comentário do workflow `claude-issue-triage` |
| Nenhum workflow expõe a `ANTHROPIC_API_KEY` em log ou código | vazamento de chave de API é incidente de segurança | `scripts/claude-workflows.test.ts` (`chave da API vem de secret, nunca hardcoded`) passando no CI |
| Job `test` do CI falha se um workflow perder gatilho, permissão mínima ou uso da action correta | é o gate que torna a automação confiável ao longo do tempo, não só no dia em que foi criada | `gh pr checks` mostrando o job `test` como obrigatório e passando |

### 5b. Métricas de sucesso

| Métrica | Baseline (fonte) | Meta | Prazo | Mín. aceitável | Responsável |
|---------|-------------------|------|-------|-----------------|-------------|
| % de PRs com comentário de revisão automática | 0% (não existia antes deste PRD) | 100% dos PRs não-draft | Imediato (é automático, não depende de adoção) | 100% (senão o workflow está quebrado) | Mantenedor do repo |
| % de issues novas com label aplicada em até 10 min | 0% (não existia) | A levantar — sem dado histórico de tempo de triagem manual | 30 dias após esta entrega | A levantar | Mantenedor do repo |

## 6. Milestones

### Milestone 1: Revisão automática de PR em produção

**Por que é um marco:** todo PR passa a receber um segundo par de olhos automático antes do merge, sem esperar disponibilidade humana — reduz a chance de regra de negócio documentada (mock, RLS, schema) ser violada sem ninguém notar.

**Funcionalidades:** US01, US03

**Checklist de aceite** (marcado pelo Aprovador após a implementação):
- [x] Workflow `claude-pr-review.yml` mergeado e ativo em `master`
- [x] Teste estrutural cobrindo o workflow, gate no CI (`test`)
- [x] Comentário automático confirmado em PR real (#287)

**Aprovador:** Mantenedor do repositório (andreiaschneider / industria24hs)

### Milestone 2: Triagem automática de issue em produção

**Por que é um marco:** issues novas deixam de depender de alguém abrir e ler manualmente para saber se são urgentes — prioridade crítica (dinheiro, RLS, produção fora do ar) fica visível via label desde a abertura.

**Funcionalidades:** US02, US03

**Checklist de aceite** (marcado pelo Aprovador após a implementação):
- [x] Workflow `claude-issue-triage.yml` mergeado e ativo em `master`
- [x] Teste estrutural cobrindo o workflow, gate no CI (`test`)
- [ ] Classificação/priorização confirmada numa issue real (ainda não testado com issue real após o merge — só a estrutura do workflow foi validada)

**Aprovador:** Mantenedor do repositório (andreiaschneider / industria24hs)

## 7. Riscos e Dependências

| Risco | Impacto | Mitigação | Status |
|-------|---------|-----------|--------|
| Custo de API por execução (todo PR/push e toda issue dispara uma chamada) | Médio — pode escalar com volume de PRs em repo com dezenas de worktrees paralelos | Monitorar uso da `ANTHROPIC_API_KEY` no console Anthropic; considerar filtro de `paths` ou trocar `synchronize` por menos disparos se custo virar problema | Pendente |
| Teste estrutural não cobre o conteúdo do prompt — mudança que altera comportamento de negócio (ex.: prompt passa a aprovar PR) não quebra o CI | Médio — falsa sensação de segurança de que "o teste protege a automação" | Revisão humana de qualquer PR que altere o campo `prompt`/`claude_args` dos workflows; considerar teste de snapshot do prompt no futuro | Pendente |
| GitHub App não instalado (`gh` sem escopo `workflow`) | Baixo — só bloqueia gatilho por menção `@claude`, não usado nesta entrega | Reinstalar via `/install-github-app` com token com escopo `workflow`, ou setup manual, se um PRD futuro precisar de gatilho por menção | Pendente, sem urgência |
| Revisão automática de PR gera ruído em PRs só de documentação/config (sem filtro de `paths`) | Baixo | Avaliar depois de observar volume real; adicionar `paths-ignore` se virar incômodo | Pendente |

**Dependências:**

| Dependência | Tipo | Status | Impacto se bloqueado |
|-------------|------|--------|----------------------|
| Secret `ANTHROPIC_API_KEY` configurado no repositório GitHub | Interna | Concluído (confirmado via `gh secret list`) | Sem o secret, ambos os workflows falham em toda execução |
| Skill `tdd-red-green-refactor` (ciclo Red-Green-Refactor do projeto) | Interna | Concluído | Nenhum — a automação segue o padrão já documentado, não bloqueia nem é bloqueada por ele |

## 8. Referências

- [PR #287 — implementação e merge](https://github.com/Schneider-Gr/industria24hIA/pull/287) — entrega completa desta automação, com histórico de CI (incluindo uma iteração de falha real/RED em produção antes de fechar verde).
- [anthropics/claude-code-action](https://github.com/anthropics/claude-code-action) — action oficial usada nos dois workflows (v1).
- `.claude/skills/tdd-red-green-refactor` — skill do projeto que documenta o ciclo Red-Green-Refactor aplicado tanto a código de produto quanto, aqui, à própria automação.

## 9. Registro de Decisões

- **2026-08-14:** Automação dispara automaticamente em todo PR/issue, sem exigir menção `@claude`. Motivo: maximizar cobertura (nenhum PR escapa da revisão) em troca de custo de API por execução — aceito pelo dono do repo implicitamente ao optar por "automático" em vez de "sob demanda" durante a implementação.
- **2026-08-14:** Automação não aprova/rejeita PR nem fecha issue, só comenta/rotula. Motivo: manter decisão final sempre humana; reduzir risco de a automação bloquear ou fechar algo por engano num prompt mal calibrado.
- **2026-08-14:** GitHub App oficial não instalado nesta entrega (bloqueado por `gh` sem escopo `workflow`). Motivo: não é necessário para os gatilhos nativos usados (`pull_request`, `issues`); só o secret `ANTHROPIC_API_KEY` é obrigatório, e esse já foi configurado.
- **2026-08-14:** PRD escrito retroativamente — a automação já estava implementada, testada e mergeada em produção (#287) antes deste documento existir. `status` mantido em `rascunho` (padrão desta skill para todo PRD novo); a transição para `concluido` cabe ao Aprovador, não a este documento, mesmo com os dois milestones já entregues de fato.
