# Plano de Migração — Industria24h

## Correções de fonte (2026-07-03, durante scaffold da fundação)

- **`schema_banco-bubble.md` (raiz, 324KB) NÃO é o schema deste app.** É o schema
  da própria plataforma bubble.io (tipos `bootcamp`, `academylesson`,
  `plugincommission`, `rfp`, marketplace de plugins). Zero tipos do industria24h.
  Foi capturado errado. Não usar como fonte; o schema real segue em `database.md`.
- **Fundação criada em `/web`** (Next.js App Router + TS + Tailwind + Supabase).
  Contém: migration `0001_acessos.sql` (única tabela de schema confirmado, RLS
  deny-by-default), clients Supabase, e a fatia vertical `/acessos`. Build/lint/
  typecheck passando. Marketplace real aguarda extração do schema (ver P4 abaixo).

## ⚠️ Nota de Segurança (leia primeiro)

Durante a extração de dados reais do Bubble (2026-07), um **Admin API Token foi obtido em texto puro**. Ele **não foi armazenado em nenhum arquivo deste repositório**. Ações recomendadas:

1. Rotacionar o token no Bubble (Settings → API) assim que possível, já que circulou em texto puro num documento
2. Armazenar qualquer credencial futura só em `.env` (fora do Git) ou secrets manager
3. Investigar `credenciaisAPIs` (Data Type marcado como **Público** no Bubble) — se realmente não tem Privacy Rule, é uma exposição de credenciais ativa que deve ser corrigida no app atual, independente do cronograma de migração
4. Investigar `Cards`/`CardTime` (Data Types) para confirmar que não armazenam dados brutos de cartão (risco de PCI-DSS)

Ver detalhes em `privacy-rules.md` e `api-connector.md`.

## Status Atual da Engenharia Reversa

| Área | Progresso | Observação |
|---|---|---|
| Banco de Dados (nomes/visibilidade) | 95% | 70+ tipos confirmados via editor real; campos detalhados ainda pendentes na maioria |
| Banco de Dados (campos por tipo) | ~15% | Só `acessos` totalmente confirmado; resto inferido do canvas |
| Regras de Negócio | 95% | Sem mudança |
| Admin | 95% | Sem mudança |
| Seller | 80% | Sem mudança |
| APIs (Data API nativa) | 95% | URLs e exposição confirmadas |
| API Connector / Integrações externas | 40% | Só coleção PagBank confirmada; Asaas/Bling/GPT ainda não capturados como configuração |
| Plugins | 100% | Lista completa confirmada (45 plugins) |
| Páginas | 95% | Lista completa confirmada (70+ páginas, 6 fluxos de login) |
| Workflows (frontend) | 60% | Sem mudança |
| Backend Workflows | 15% | Rascunho inferido existe; ainda não validado no editor real |
| Privacy Rules | 20% | Classificação Público/Privado real confirmada; conteúdo das regras ainda inferido |
| **Módulo Consignado** | **5%** | **Descoberta nova — 20+ Data Types não estavam mapeados antes** |

**Estimativa geral do projeto recalculada: ~70-75% mapeado** (queda em relação aos 85-90% anteriores, porque o escopo real aumentou com a descoberta do módulo Consignado e dos 6 fluxos de autenticação separados — não porque houve retrocesso no que já estava mapeado).

O restante está concentrado em:
- Módulo Consignado (mapeamento quase do zero)
- Campos detalhados de cada Data Type (fora de `acessos`)
- Coleções do API Connector além de PagBank
- Backend Workflows reais (validação do rascunho inferido)
- Conteúdo real das Privacy Rules (além da classificação Público/Privado)

## Próximos Passos

### Prioridade 0 — Segurança (nova, urgente)

- [ ] Rotacionar Admin API Token do Bubble
- [ ] Confirmar/corrigir visibilidade de `credenciaisAPIs`
- [ ] Confirmar natureza de `Cards`/`CardTime` (risco PCI-DSS)

### Prioridade 1 — Capturar

- [x] Lista real de Data Types, visibilidade e páginas — **concluído nesta rodada**
- [ ] Campos detalhados de cada Data Type (clicar tipo a tipo no editor)
- [ ] Backend Workflows reais (validar rascunho em `backend-workflows.md`)
- [ ] Conteúdo real das Privacy Rules (validar rascunho em `privacy-rules.md`)
- [ ] Coleções do API Connector além de PagBank (validar rascunho em `api-connector.md`)

### Prioridade 2 — Módulo Consignado (nova prioridade)

- [ ] Validar com o time de negócio se está ativo em produção
- [ ] Mapear Backend Workflows específicos
- [ ] Decidir se entra no MVP (Fase 1) ou fica para Fase 2 do roadmap

(ver `consignado-module.md`)

### Prioridade 3 — Documentar Seller Completo

- [ ] Produtos
- [ ] Pedidos
- [ ] Afiliados
- [ ] Venda Futura
- [ ] Centro de Distribuição

(ver `pages.md`, seção Seller)

### Prioridade 4 — Gerar Automaticamente

- [ ] Prisma Schema (a partir de `database.md` — aguardar campos detalhados)
- [ ] Supabase Schema
- [ ] RLS Policies (dependem das Privacy Rules reais da Prioridade 1)
- [ ] TypeScript Types
- [ ] API Contracts / OpenAPI
- [ ] Event Storming
- [ ] Backlog MVP

## Privacy Rules — Necessário Capturar

Para cada Data Type (ver `database.md`), documentar:
- Quem vê
- Quem edita
- Quem exclui
- Quem acessa via API

## Fluxo de Trabalho Recomendado (Claude Code)

1. Exportar dados brutos do Bubble para `/bubble-export/` (por categoria: data-types, workflows, pages, elements, plugins, settings)
2. Rodar os agentes especializados (ver `architecture.md`) sobre os dados exportados, em loop:
   ```python
   while not completed:
       analyze()
       identify_gaps()
       generate_tasks()
       execute()
       review()
       update_docs()
   ```
3. Atualizar os documentos em `/docs` a cada iteração
4. Gerar o schema Prisma/Supabase somente após Privacy Rules estarem mapeadas (para já nascer com RLS correto)
5. Construir MVP incremental por módulo: Admin → Marketplace → Seller (ordem sugerida pelo nível de mapeamento já disponível: Admin 95%, Seller 80%)

## Estrutura de Pastas do Projeto

```
industria24h/
  bubble-export/
    data-types/
    workflows/
    pages/
    elements/
    plugins/
    settings/
  docs/
    architecture.md
    database.md
    consignado-module.md
    workflows.md
    backend-workflows.md
    privacy-rules.md
    api-connector.md
    pages.md
    api.md
    integrations.md
    business-rules.md
    migration.md
  infra/
```

> Cada subpasta de `bubble-export/` está pronta para receber os arquivos brutos exportados do editor Bubble (JSON, CSV ou capturas de tela organizadas), servindo de fonte de verdade para os agentes de migração.
