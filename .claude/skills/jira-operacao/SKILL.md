---
name: jira-operacao
description: Operar os quadros Jira do Industria24h — criar/atualizar issues, mover status (concluído/pendente/em andamento), sincronizar quadro com o estado real dos PRs. Use quando o usuário pedir para atualizar o Jira, mover cards, marcar etapas concluídas, ou ao fechar PR/marco que corresponde a uma issue.
---

# Operação do Jira — Industria24h

Projetos: **KAN** (execução, 6 épicos ~90 issues) e **MPDD** (Polaris/discovery, 38 ideias). Conta logada no browser. Contexto de organização: skill `jira-backlog`.

## Regra dura: API via `fetch()` na página logada, NUNCA cliques na UI

Validado em 09/07 (~90 issues criadas numa sessão); a UI custou 46 attach falhados. Rodar via `js()` do browser-harness numa aba do Jira:

- Buscar: `POST /rest/api/3/search/jql` (o `GET /rest/api/3/search` antigo dá **410**).
- Criar/editar: `POST|PUT /rest/api/3/issue`.
- **Mover status:** `GET /rest/api/3/issue/{key}/transitions` para listar os ids válidos daquele workflow, depois `POST .../transitions` com `{"transition":{"id":"<id>"}}`. Nunca chutar id de transição — varia por projeto.
- Comentário: `POST /rest/api/3/issue/{key}/comment` (corpo em ADF).
- Payload com acento/aspas: montar em Python com `json.dumps()` e interpolar no template JS — nunca escrever a string direto no heredoc.

## Timeouts (não duplicar registros)

- Timeout do CDP em `js()` com vários `await fetch()` é NORMAL — o script continua no browser. **Nunca relançar o mesmo script**: aguardar, conferir via search o que foi criado, e completar só o que falta (relançar já duplicou 5 issues uma vez).
- 2 timeouts na mesma aba = aba morta/roubada por sessão concorrente → `Target.getTargets`, confirmar URL, reconectar.
- Escrita em massa: idempotência por chave natural (summary ou label) — buscar antes de criar.

## Sincronizar quadro com o estado real

Fluxo ao fechar trabalho ("marcar etapas concluídas"):

1. Levantar o estado real: PRs mergeados (`gh pr list --state merged`), migrations confirmadas (`to_regclass`), deploy (`vercel inspect`) — o quadro reflete o que está VERIFICADO, não o que foi codado.
2. Buscar as issues correspondentes por JQL (`project = KAN AND status != Done AND text ~ "..."`).
3. Transicionar para Done com comentário citando o PR (ex.: "Concluído no PR #74, em prod").
4. Trabalho novo descoberto → criar issue no épico certo (checar duplicata antes; ideia de produto vai no MPDD, execução no KAN).
5. A fila local (skill `fila-retomada` + memória de pendências) e o Jira devem contar a mesma história — atualizar os dois na mesma sessão.

## Mapeamento pendências ↔ quadro (estado 22/07 — validar por JQL antes de mover)

Itens sabidamente concluídos e possivelmente ainda abertos no quadro: PRs #59-#66, #68-#75 (paridade seller, termos, redesigns, docs /desenvolvedores, curadoria admin, skills). Itens abertos que devem existir como issue: teste `?ref=`, DKIM/SPF Resend, artes banners, aplicar 0058/0059, soft-404 SEO, rotações de segredo.
