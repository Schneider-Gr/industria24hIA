# Arquitetura — Industria24h

## Objetivo do Projeto

Refazer integralmente a plataforma Industria24h, atualmente desenvolvida em Bubble.io, utilizando:

- Claude Code
- Next.js
- Supabase
- PostgreSQL
- Elasticsearch / Meilisearch
- Asaas
- Arquitetura modular escalável

## Arquitetura Atual (Bubble.io)

### Frontend

- Bubble SPA

**Páginas principais:**
- `/`
- `/loja`
- `/produto`
- `/login`
- `/checkout`
- `/seller/:slug`
- `/admin`

### Backend

- Bubble Backend
- Banco Bubble (banco de dados nativo)
- Workflows (Frontend Workflows)
- API Workflows
- Autenticação nativa do Bubble

### Serviços Externos Integrados

| Serviço | Finalidade |
|---|---|
| Asaas | Pagamentos (cobrança, split, transferências) |
| PagBank / PagSeguro | Pagamentos |
| Elasticsearch | Busca |
| Bling | ERP / sincronização de produtos e pedidos |
| Melhor Envio | Logística / frete |
| Bubble Whats | WhatsApp |
| ViaCEP | Consulta de CEP |
| GPT Assistant | Assistente de IA |

## Arquitetura Alvo (Next.js + Supabase)

### Frontend

- Next.js 15
- TypeScript
- Tailwind CSS
- shadcn/ui
- Zustand (state management)

### Backend

- Supabase
- PostgreSQL
- Edge Functions
- Prisma (ORM)

### Busca

- Elasticsearch **ou** Meilisearch (a definir)

### Arquivos

- Cloudflare R2

### Cache

- Redis

## Estrutura de Pastas Alvo

```
industria24h/
apps/
├── web       # Marketplace público
├── seller    # Painel do lojista
├── admin     # Painel administrativo
packages/
├── database
├── auth
├── ui
├── types
services/
├── payments
├── search
├── logistics
docs/
infra/
```

## Estratégia de Execução com Claude Code

### Agentes propostos (Dynamic Workflows)

- **Master Agent** — orquestra os demais agentes
- **Database Agent** — schema, migrations, RLS
- **Workflow Agent** — regras de negócio e automações
- **API Agent** — endpoints, contratos, integrações externas
- **UI Agent** — componentes e páginas
- **Seller Agent** — painel do lojista
- **Admin Agent** — painel administrativo
- **Migration Agent** — migração de dados Bubble → Supabase
- **QA Agent** — testes e validação

### Loop de execução

```python
while not completed:
    analyze()
    identify_gaps()
    generate_tasks()
    execute()
    review()
    update_docs()
```

## Referências

- Ver `database.md` para o modelo de dados completo
- Ver `workflows.md` para os fluxos de negócio
- Ver `business-rules.md` para as regras de negócio
- Ver `migration.md` para o plano de migração e status atual
