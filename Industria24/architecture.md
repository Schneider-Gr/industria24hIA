# Arquitetura — Industria24h

## Objetivo do Projeto

Refazer integralmente a plataforma Industria24h, atualmente em Bubble.io,
usando uma stack moderna, com deploy na **Vercel** e banco de dados
**Supabase**. Ver `CLAUDE.md` para as regras de desenvolvimento (proibido
mockar dados, sempre persistência real, etc.) — este documento é sobre
**onde** as coisas rodam e **como** se conectam.

## Stack Definitiva

| Camada | Tecnologia |
|---|---|
| Hospedagem / Deploy | **Vercel** |
| Frontend | Next.js 15 (App Router) + TypeScript + Tailwind + shadcn/ui |
| Estado de UI | Zustand |
| Backend / Banco de Dados | **Supabase** (PostgreSQL + Auth + Storage + Realtime) |
| Funções serverless | Vercel Functions (lógica de aplicação/API routes) + Supabase Edge Functions (lógica próxima ao banco: triggers, webhooks) |
| ORM | Prisma, apontando para o Postgres do Supabase |
| Autenticação | Supabase Auth |
| Integrações externas | Camada própria de **plugins/APIs** (ver seção dedicada abaixo) |

> Por que dividir função serverless entre Vercel e Supabase Edge Functions:
> Vercel Functions ficam perto do frontend (ideal para rotas de API que a
> UI chama diretamente); Supabase Edge Functions ficam perto do banco
> (ideal para reagir a mudanças de dados — ex.: trigger quando um pedido
> muda de status — e para webhooks recebidos de terceiros como Asaas).

## Arquitetura Atual (Bubble.io) — referência histórica

### Frontend
- Bubble SPA

### Backend
- Bubble Backend, Banco Bubble, Workflows, API Workflows, Autenticação nativa

### Serviços Externos Confirmados/Prováveis
Ver `integrations.md` e `api-connector.md` para o levantamento completo e
atualizado (PagBank confirmado; Asaas, Bling, GPT Assistant, WhatsApp,
ViaCEP, Google Maps/Mapbox em graus variados de confirmação).

---

## Arquitetura Alvo (detalhada)

### Deploy (Vercel)

- Um projeto Vercel por app do monorepo (`apps/web`, `apps/seller`,
  `apps/admin`, e futuramente `apps/consignado`, `apps/fulfillment` — ver
  `pages.md` sobre os 6 fluxos de login separados que motivam essa divisão)
- Preview Deployments automáticos por Pull Request — todo PR gera uma URL
  de preview antes do merge (reforça a regra do `CLAUDE.md` de nunca
  commitar direto em `main`)
- Variáveis de ambiente (chaves do Supabase, tokens de integração)
  configuradas no painel da Vercel por ambiente (Production / Preview /
  Development) — **nunca em `.env` commitado** (ver `CLAUDE.md`, regra de segredos)
- Domínio customizado `industria24h.com.br` migrado para apontar à Vercel
  ao final da migração (cutover), mantendo o domínio atual do Bubble
  ativo até a validação completa em produção

### Frontend (Next.js)

- App Router, Server Components por padrão; Client Components só onde há
  interatividade real (formulários, carrinho, dashboards com estado)
- Cada app do monorepo consome os mesmos `packages/ui`, `packages/types`,
  `packages/database` — evita duplicação entre marketplace, seller e admin

### Backend / Banco de Dados (Supabase)

- PostgreSQL como banco principal — schema gerado via Prisma a partir de
  `database.md` (aguardando campos detalhados de cada Data Type, ver
  `migration.md`)
- **RLS (Row Level Security) ativada por padrão em toda tabela nova**,
  sem policy até que a regra esteja confirmada em `privacy-rules.md` (ver
  também `CLAUDE.md`, regra 8 — negar por padrão, liberar explicitamente)
- Supabase Auth substitui a autenticação nativa do Bubble — mapear os 6
  fluxos de login (`login_marketplace`, `login_seller`, `login_consignado`,
  `login_fulfillment` etc.) para roles/claims no Supabase Auth, associados
  aos papéis já identificados (`superadm`, `promotoradm`, `lojista`, `afiliado`)
- Supabase Storage substitui o armazenamento de imagem nativo do Bubble
  (produtos, banners, avatares)
- Supabase Realtime para funcionalidades que hoje dependem de polling no
  Bubble (ex.: status de pedido, notificações)

### Camada de Plugins/APIs (integrações externas)

No Bubble, cada integração era um plugin instalado no editor ou uma
coleção do API Connector (ver `integrations.md`, `api-connector.md`). Na
stack nova, isso vira uma **camada própria dentro do monorepo**:

```
services/
├── payments/       # Asaas, PagBank/PagSeguro
├── logistics/       # Melhor Envio, Transportadoras, FaixaDeCEP
├── search/           # Elasticsearch/Meilisearch (a confirmar se está em uso — ver api.md)
├── whatsapp/         # BubbleWhats → substituir por integração direta WhatsApp Business API
├── address/           # ViaCEP
├── erp/                # Bling
├── maps/               # Google Maps / Mapbox (resolver duplicidade — ver integrations.md)
└── ai-assistant/        # GPT Assistant
```

Cada pacote em `services/` expõe uma interface tipada (TypeScript) para o
resto da aplicação, escondendo os detalhes de HTTP/autenticação de cada
provedor — equivalente ao papel que o "plugin" cumpria no Bubble, mas
com contrato explícito e testável.

**Regra de migração para cada serviço:** nenhuma integração externa entra
em produção sem, no mínimo:
1. Endpoint e payload confirmados (não inferidos) em `api-connector.md`
2. Tratamento de erro real (nunca mock de sucesso — ver `CLAUDE.md`)
3. Segredos em variável de ambiente da Vercel, nunca hardcoded

### Busca

Elasticsearch ou Meilisearch — decisão pendente até confirmar se
Elasticsearch está de fato em uso hoje (ver pendência em `api.md`). Se
não estiver, começar direto com Meilisearch (mais simples de operar) ou
até `pg_search`/full-text search nativo do Postgres, evitando
infraestrutura extra sem necessidade comprovada.

### Cache

Redis (ex.: Upstash, que integra nativamente com Vercel) — usar quando
houver necessidade medida (ex.: cálculo de frete repetido, resultados de
busca), não como padrão desde o dia 1.

### Arquivos

Supabase Storage é a opção padrão (mais simples, já integrado à auth e
RLS). Cloudflare R2 permanece como alternativa caso o volume/custo de
Storage do Supabase justifique migrar depois — não é decisão do dia 1.

## Estrutura de Pastas Alvo

```
industria24h/
apps/
├── web          # Marketplace público
├── seller        # Painel do lojista
├── admin          # Painel administrativo
├── consignado      # Módulo consignado (Fase 2 — ver consignado-module.md)
└── fulfillment       # Logística/transportadora/entregador (a confirmar necessidade de app dedicado)
packages/
├── database        # Client Prisma/Supabase compartilhado
├── auth              # Helpers de Supabase Auth, roles, guards
├── ui                  # Componentes compartilhados (shadcn/ui customizado)
├── types                # Tipos gerados do schema Prisma/Supabase
services/
├── payments
├── logistics
├── search
├── whatsapp
├── address
├── erp
├── maps
└── ai-assistant
docs/
infra/
  ├── supabase/       # migrations, seed, RLS policies versionadas
  └── vercel/           # configuração de projeto(s) Vercel, se necessário fora do painel
```

## Estratégia de Execução com Claude Code

Ver `CLAUDE.md` para as regras completas de vibecoding aplicadas neste
projeto. Resumo da estratégia de agentes:

### Agentes propostos (Dynamic Workflows)

- **Master Agent** — orquestra os demais agentes
- **Database Agent** — schema Prisma/Supabase, migrations, RLS
- **Workflow Agent** — regras de negócio e automações (Vercel Functions + Supabase Edge Functions)
- **API Agent** — endpoints internos, contratos OpenAPI, camada `services/`
- **UI Agent** — componentes e páginas (Next.js)
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

- `CLAUDE.md` — regras de desenvolvimento (obrigatório ler antes de codar)
- `database.md` — modelo de dados completo
- `consignado-module.md` — módulo separado, Fase 2
- `workflows.md` / `backend-workflows.md` — fluxos de negócio
- `business-rules.md` — regras de negócio
- `integrations.md` / `api-connector.md` — integrações externas (plugins/APIs)
- `migration.md` — plano de migração e status atual
