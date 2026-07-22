---
name: gerenciar-skills
description: Criar, atualizar, sincronizar e auditar as skills de projeto do Industria24h. Use quando o usuário pedir para criar/editar/listar skills, quando uma skill se revelar desatualizada durante o trabalho, ou ao encerrar tarefa que mudou uma regra coberta por skill.
---

# Gerenciar Skills — Industria24h

## Onde vivem (DOIS lugares, manter em sincronia)

1. **`Industria24/.claude/skills/`** — repo local Industria24IA (sem remote). Fonte primária de edição.
2. **`web/.claude/skills/`** — repo GitHub (`Schneider-Gr/industria24hIA`), master. É o que os worktrees `web-*` enxergam após rebase.

Fluxo de publicação: editar no local → commitar (path explícito, nunca `git add .` — o diretório tem skills de terceiros soltas e um repo git embutido em `stop-slop/`) → copiar para worktree limpo de `origin/master` do web → branch `docs/skills-*` → PR → merge.

## Inventário atual (17 + esta)

regras-de-negocio · deploy-industria24 · migrations-industria24 · paridade-bubble · qa-prod-industria24 · asaas-pagamentos · seo-industria24 · rls-seguranca · integracao-terceiros-mcp · fila-retomada · crews-ia · git-colaboracao · incidentes-runbook · onboarding-seller · dados-bubble-migrados · jira-backlog · tour-e-tutoriais

## Padrão de uma skill deste projeto

- Frontmatter `name` + `description`; a description diz QUANDO usar (gatilhos concretos), não só o tema.
- Corpo curto (≤60 linhas): regras duras aprendidas por fricção real, com data/PR quando relevante; rotear para `docs/` e memórias em vez de duplicar conteúdo longo.
- Fatos com grau de confiança: marcar o que é verificado vs pendente; nunca afirmar como fato o que é hipótese.
- Referência cruzada entre skills (`ver skill X`) em vez de repetir.

## Ciclo de vida

- **Criar:** só quando a mesma fricção/pergunta apareceu 2+ vezes ou o domínio é caminho crítico (dinheiro, segurança, prod). Skill especulativa é ruído.
- **Atualizar na mesma sessão:** regra que se revelou diferente, bug resolvido, pendência concluída — a skill desatualizada é pior que nenhuma (afirma como aberto o que fechou). Cicatriz de dado nova → `dados-bubble-migrados`; pendência nova → `fila-retomada`.
- **Auditar (mensal ou quando algo soar errado):** varrer as descriptions contra o estado real (PRs mergeados, migrations aplicadas, decisões novas do dono). Itens marcados 🔴/⏸ são os primeiros a envelhecer.
- **Remover/fundir:** skill que nunca dispara ou duplica outra → fundir e apagar.
- **Sincronizar:** mudança editada só no repo local não chega aos worktrees do app; toda edição relevante termina com PR no `web/`.

## Checagem rápida de saúde

```bash
# duplicatas de nome entre os dois repos e frontmatter presente
ls Industria24/.claude/skills; ls Industria24/web/.claude/skills
head -5 <skill>/SKILL.md   # deve ter name+description
```
