---
name: integracao-terceiros-mcp
description: APIs para terceiros do Industria24h — MCP server, api_keys, docs /desenvolvedores, rastreio Mercado Envios. Use ao trabalhar em integração externa, API pública, MCP do marketplace ou documentação para desenvolvedores.
---

# Integração com Terceiros / MCP — Industria24h

## MCP do marketplace

- PR #48 MERGEADO: MCP server + migration `0059_api_keys` em master.
- **Pendente:** aplicar 0059 em prod (verificar com `to_regclass`), QA com MCP Inspector, deploy em `mcp.industria24.com.br`. Não afirmar que o MCP está no ar.
- Autenticação por `api_keys` — criação/revogação de chave segue trilha de auditoria; chave nunca em texto puro em log/doc.

## Docs públicos

- `/desenvolvedores` em prod (PR #66, 5 rotas 200). Mudança de API pública = atualizar essas páginas na mesma sessão.

## Logística / Mercado Envios

- Rastreio RTT do Mercado Envios documentado em `/desenvolvedores`; **não somos provedor do ML** — só consumimos rastreio.
- Regras de repasse a entregadores/afiliados ML e estrutura fiscal marketplace×seller×afiliado: skill global `mercado-envios-regras`. Fonte só via browser (ML bloqueia fetch com 403).
- Melhor Envio: relação com `FaixaCEP` ainda não confirmada (`docs/integrations.md`) — perguntar antes de assumir.

## Regras gerais

- Integração externa nunca mockada: chamada real (sandbox) ou recurso desabilitado com aviso (CLAUDE.md do repo).
- API/CLI do serviço vem ANTES de automação por browser.
- Webhook de terceiro: validar origem + idempotência antes de efeito colateral.
