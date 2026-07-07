# Fonte: Documentação Completa do App Bubble — Industria 24hs

> Extraído diretamente do Bubble Editor (abas Data Types, App Data, Settings,
> Plugins, API Connector e canvas do Design) em 2026-07. Este é o documento
> **fonte de verdade** — todos os `.md` em `/docs` que dependem destes dados
> foram atualizados a partir dele. Ver nota técnica no final sobre limitações
> da extração (campos customizados nem todos carregados pelo editor SPA).

## Sumário Executivo

- **App ID:** industria24hs
- **Domínio personalizado:** industria24h.com.br
- **Data API URL (dev):** https://industria24h.com.br/version-test/api/1.1/obj
- **Data API URL (live):** https://industria24h.com.br/api/1.1/obj
- **Workflow API URL (dev):** https://industria24h.com.br/version-test/api/1.1/wf
- **Admin API Token:** ⚠️ REDACTED — ver nota de segurança em `docs/migration.md`. Valor original foi enviado em texto puro pelo usuário; recomendado rotacionar a chave no Bubble antes de considerá-la segura.
- **Plano:** Growth (~$134/mês)
- **Tipo de app:** Marketplace B2B de produtos industriais / supermercado com logística

## Colaboradores do App

| E-mail | Papel |
|---|---|
| industria24horas@gmail.com | Admin |
| industria24hs@gmail.com | Admin (conta pagante) |

## Nota Técnica sobre a Extração

A engenharia reversa foi realizada via leitura do Bubble Editor (abas Data Types, App Data, Settings e canvas do Design). Os campos customizados dos tipos de dados não foram completamente carregados pelo editor SPA durante a sessão — limitação técnica: o Bubble Editor só popula os valores dos campos de texto (textboxes) na árvore de acessibilidade quando o tipo é selecionado interativamente via clique, não via navegação por URL. O único tipo com campos completamente documentados foi `acessos` (carregado no estado inicial do editor). Os demais campos foram inferidos a partir das referências no canvas de design.

**Implicação prática:** os campos listados para a maioria dos ~70 Data Types em `docs/database.md` ainda precisam de validação clicando tipo a tipo no editor. Este documento fonte já é um avanço grande (visibilidade Pública/Privada real, nomes reais de todos os tipos, páginas reais, plugins reais) — mas os *campos* de cada tipo (exceto `acessos`) continuam majoritariamente pendentes.
