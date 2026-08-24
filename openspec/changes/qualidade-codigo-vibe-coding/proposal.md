## Why

Levantamento em `docs/prds/025-auditoria-seguranca-vibe-coding.md` (Issue #375) mapeou falhas de segurança em código vibe-coded. Uma pesquisa complementar (subagente, 2026-08-24) trouxe quatro riscos de **qualidade de código** distintos — não são vulnerabilidade explorável por um atacante externo, são erosão silenciosa da correção e da coerência do sistema causada pelo próprio processo de gerar código via agente de IA:

1. **Incoerência arquitetural entre sessões**: agentes produzem trechos localmente corretos, mas a mesma regra de negócio acaba implementada duas vezes em módulos diferentes porque a sessão nova não checou se já existia. O repo já nomeia 6 módulos de domínio em `CODEOWNERS` (PRD 018) justamente para conter esse drift, mas nada garante que um agente novo leia isso antes de implementar.
2. **Duplicação de trabalho entre sessões concorrentes**: dor já registrada em memória do operador (`feedback-git-checkout-primario-compartilhado`, `feedback-multi-agent-qa-browser-shared-session`) — sessões trocando branch no mesmo checkout, sem saber que outra sessão está ativa. Aconteceu de novo durante a criação do PRD 025: um commit caiu numa branch de feature onde outra sessão fazia commits de segurança em paralelo, sem que nenhuma das duas soubesse da outra.
3. **Testes com over-mocking mascarando bug real**: a skill `tdd-red-green-refactor` exige `.test.ts` para função nova em `src/lib/*.ts` com regra de negócio, mas nada impede um agente de mockar a própria função testada ou mockar o Supabase de um jeito que sempre retorna sucesso — dando falso verde. `repasses.ts` e `preco-faixa.ts` (funções com incidente real já registrado: comissão sem indicação, faixa de desconto errada) são os candidatos mais prováveis a esse padrão.
4. **Drift entre schema real do banco e schema assumido pelo agente**: já existe regra de processo no `CLAUDE.md` ("nunca inventar schema") e aviso de que `database.types.ts` trunca silenciosamente sem token — mas isso nunca foi formalizado como checklist obrigatório antes de escrever migration ou query contra uma tabela.

Nenhum dos quatro tem hoje um lugar documentado e carregado automaticamente por contexto que um agente leia antes de agir — cada um depende de o agente "se lembrar" sozinho.

## What Changes

- Nova skill de projeto `qualidade-vibe-coding` (`.claude/skills/qualidade-vibe-coding/SKILL.md`, espelhada em `web/.claude/skills/`), carregada por contexto sempre que uma sessão for: (a) implementar regra de negócio nova, (b) escrever ou alterar teste de função com regra de negócio, (c) escrever migration ou query contra tabela existente, (d) começar a trabalhar num checkout compartilhado (raiz do repo, fora de worktree).
- Quatro checklists objetivos e verificáveis (um por risco), não princípios vagos — cada um com uma ação concreta e o comando/verificação que confirma que foi seguido.
- Não altera nenhum código de produção, nenhuma regra de negócio, nenhum schema.

## Capabilities

### New Capabilities
- `governanca-qualidade-vibe-coding`: checklist de processo que uma sessão de agente segue antes de implementar regra de negócio, escrever teste de lógica de negócio, tocar schema/migration, ou operar num checkout compartilhado — para conter os quatro riscos de qualidade acima.

## Impact

- Novo arquivo `.claude/skills/qualidade-vibe-coding/SKILL.md` (e cópia espelhada em `web/.claude/skills/qualidade-vibe-coding/SKILL.md`, seguindo a convenção já usada pelas outras 45+ skills do projeto).
- `docs/prds/025-auditoria-seguranca-vibe-coding.md`: ganha referência cruzada a esta change na seção 3 (os 4 itens de qualidade saem de "levantamento solto" e passam a ter capability própria).
- Nenhum código de aplicação, migration ou teste é alterado por esta change — é puramente documental/processual, no mesmo espírito do PRD 018 (proteção de produção Asaas).
