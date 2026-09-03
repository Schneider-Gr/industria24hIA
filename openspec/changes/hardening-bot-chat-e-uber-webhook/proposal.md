## Why

Avaliação de segurança de 03/09/2026 (contra `origin/master`), guiada pelo checklist OWASP do
usuário. A maioria dos itens passou — RLS ligado em 100% das tabelas `public`, nenhuma policy de
escrita unscoped para role pública, webhooks Asaas/BubbleWhats/WhatsApp fail-closed com comparação
timing-safe, proxy de IA com chave só no servidor. Dois achados confirmados por leitura de código
entram neste change:

1. **`POST /api/bot/chat` sem rate limit e sem teto de tamanho de mensagem.**
   `src/app/api/bot/chat/route.ts` roda o loop de agente OpenAI (`processarMensagemBot`) e está
   acessível anônimo (`user` pode ser `null` — o bot pede o e-mail durante a conversa, é por
   design). Nenhuma das 7 outras rotas que usam `checarLimite` (`src/lib/rate-limit.ts`) —
   `checkout/cotar-frete`, `categorias`, `busca-preview`, `coletiva/actions`, etc. — tem paralelo
   aqui. Vetor: um script gera custo de token OpenAI e linhas em `bot_conversas` sem limite algum.
   O `body.mensagem` também entra no prompt sem teto de tamanho.

2. **Webhook Uber Direct fail-open quando a signing key está ausente.**
   `src/app/api/webhooks/uber-direct/route.ts` — `assinaturaValida()` retorna `true` quando
   `UBER_DIRECT_WEBHOOK_SIGNING_KEY` está vazia, e está: a env foi copiada por engano de
   `UBER_DIRECT_CLIENT_SECRET` em 2026-08-03. Consequência: qualquer POST forja status de
   entrega/entregador numa `rota` (move `Atribuida`/`EmTransito`/`Entregue`, grava `tracking_url`,
   dispara aviso "saiu para entrega" ao comprador). O código já documenta a pendência.
   A correção de código já existe no PR **#396** (`fix/uber-direct-webhook-fail-closed`, Closes
   #395): extrai `assinaturaUberDirectValida` para `src/lib/uber-direct-webhook-signature.ts`,
   fail-closed por padrão, com teste. #396 aplica limpo sobre `master` (sem conflito). O que falta
   é (a) mergear #396 e (b) a ação humana no painel Uber Direct.

## What Changes

- `src/app/api/bot/chat/route.ts`:
  - chama `checarLimite` por chave `bot-chat:<user.id | ip>` antes de criar conversa / chamar o
    agente; excedente recebe `429` sem tocar OpenAI nem `bot_conversas`.
  - rejeita `mensagem` acima de um teto de caracteres com `400`.
  - o bot continua acessível anônimo (não exige login) — só limita a taxa.
- Achado 2 não altera código neste change (o código está no #396). Este change registra o
  requisito de comportamento e a dependência operacional; o tasks.md rastreia o merge de #396 e a
  regravação da env.

## Capabilities

### New Capabilities
- `bot-chat-rate-limit`: limite de chamadas ao endpoint do bot de atendimento.
- `webhook-uber-direct-fail-closed`: como o webhook do Uber Direct valida sua assinatura quando a
  signing key não está configurada.

## Impact

- `src/app/api/bot/chat/route.ts`.
- PR #396 (`src/app/api/webhooks/uber-direct/route.ts`, `src/lib/uber-direct-webhook-signature.ts`)
  — merge rastreado aqui, não reimplementado.
- Ação humana fora de código: regravar `UBER_DIRECT_WEBHOOK_SIGNING_KEY` no Vercel (Production +
  Preview) com a Signing Key real do painel Uber Direct antes/ao mergear #396 — senão o webhook
  passa a rejeitar todo request e a atualização automática de status de entrega para.
