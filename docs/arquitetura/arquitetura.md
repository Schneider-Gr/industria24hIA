# Arquitetura Industria24

Estado em 21/09/2026. Marketplace B2B reconstruído do Bubble (`industria24h.com.br`) para Next.js 16 + Supabase, publicado em `industria24.com.br`.

```mermaid
flowchart LR
  subgraph U[Usuários]
    C[Comprador]
    S[Seller / indústria]
    A[Afiliado]
    P[Parceiro / entregador]
    AD[Admin]
    I[Integradores<br/>Claude, n8n · token i24_]
  end

  subgraph V[Vercel · Fluid Compute]
    subgraph WEB["web/ · Next.js 16 App Router · proxy.ts (CSP nonce)"]
      PG["Páginas: pública · (seller) · (afiliado) · (parceiro) · (admin)"]
      API["api/: checkout · carrinho · coletivas · estoque · venda-futura<br/>categorias · asaas · webhooks · bot · curadoria-ia"]
      LIB["src/lib módulos: catalogo-compra · seller · afiliado<br/>logistica-parceiro · admin-plataforma · pagamentos-financeiro"]
      IA["IA: lib/ai (bot WhatsApp, lead scoring)<br/>lib/agentes (LangGraph: curadoria, coletiva)"]
    end
    MCP["mcp-server/ · Express<br/>escopo read/write"]
    CRON["Crons diários: carrinho abandonado,<br/>estoque, venda futura, reservas"]
  end

  subgraph SB[Supabase]
    DB[("Postgres · RLS nega por padrão<br/>177 migrations · taxonomia 18.212 nós")]
    AUTH[Auth · @supabase/ssr]
    ST[Storage]
    OPS[dashboard-ops/]
  end

  subgraph EXT[Serviços externos]
    ASAAS[Asaas<br/>Pix, split]
    UBER[Uber Direct]
    BW[BubbleWhats / Meta]
    LLM[Anthropic · OpenAI]
    RS[Resend]
    TS[Turnstile]
    SE[Sentry]
    LS[LangSmith]
  end

  C & S & A & P & AD --> WEB
  I --> MCP
  WEB <--> DB
  WEB --> AUTH & ST
  MCP -- service_role, token em api_keys --> DB
  CRON --> API
  OPS --> DB
  WEB --> ASAAS & UBER & BW & LLM & RS & TS & SE & LS
  ASAAS -. webhook .-> API
  UBER -. webhook .-> API
  BW -. webhook .-> API
```

## Notas

**Monolito modular.** Seis domínios mapeados no `CODEOWNERS` (PRD 018). Regra nova entra em `src/lib/<modulo>/` com `.test.ts`; código antigo migra por strangler fig quando um PR o toca.

**Dados e segurança.** Três clients em `lib/supabase`: `client.ts` (browser, anon), `server.ts` (RSC/Actions, sessão), `service.ts` (service_role, só servidor). Integradores recebem token `i24_`, nunca chave do banco.

**Caminho do dinheiro.** `asaas.ts`, `repasses.ts`, `api/asaas/`, `api/webhooks/`: merge pede confirmação do usuário.

**Entrega.** PR com CI verde (`lint-build`, `test`, `migrations-lint`, `secret-scan`) → merge → Vercel. Com o limite diário de builds, deploy via `vercel --prod` na CLI.
