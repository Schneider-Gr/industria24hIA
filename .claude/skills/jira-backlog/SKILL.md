---
name: jira-backlog
description: Backlog do Industria24h no Jira/Polaris/Confluence — onde vive, como consultar e atualizar via API. Use ao planejar sprint, criar/atualizar issue, consultar PRDs e ideias, ou quando o usuário mencionar Jira, Polaris ou backlog.
---

# Jira / Backlog — Industria24h

## Onde vive o quê

- **Jira projeto KAN:** backlog de execução — 6 épicos, ~90 issues (100% do backlog migrado).
- **Polaris projeto MPDD:** discovery — 38 ideias priorizadas (ex.: MPDD-37 ads, MPDD-43 mobilidade urbana, MPDD-44 qualidade do anúncio).
- **Confluence:** 12 PRDs completos + docs de apoio.
- Detalhes e IDs na memória `project-industria24h-jira-polaris-confluence`.
- `docs/backlog.md` e `docs/roadmap.md` no repo são espelho local — em divergência, o Jira é a fonte para prioridade; os docs do repo para conteúdo técnico.

## Como acessar (regra dura da auditoria 10/07)

- **API via `fetch()` na página logada ou REST — NUNCA cliques na UI.** 46 attach falharam em série na UI do Jira; a API funcionou de primeira. Técnicas na memória `feedback-browser-harness-jira-confluence-tecnicas`.
- Embed de página: blockCard ADF.
- Timeout CDP no Atlassian é normal — não é sinal de aba morta por si só.

## Convenções

- Issue liga PR pelo número (ex.: "PR #63") no comentário ao concluir; status real do código está no GitHub, o Jira dá o contexto de negócio.
- Feature nova → checar primeiro se já existe como ideia no Polaris ou regra no Bubble (skill `paridade-bubble`) antes de criar issue duplicada.
- PRD novo segue `docs/prd-template.md`.
- Ao fechar marco de épico, atualizar o Jira E o checkpoint de memória (skill `fila-retomada`).
