## Why

Auditoria de segurança em código vibe-coded (Issue #375, PRD 025) rodou as skills
`testing-api-for-broken-object-level-authorization`, `implementing-secret-scanning-with-gitleaks`
e `securing-agentic-ai-tool-invocation` contra o código real do repositório em 2026-08-24. Quatro
achados confirmados por leitura de código, sem correção aplicada até este change:

1. **Crítico, explorável hoje.** `resolver_usuario_por_contato` (migration 0088) identifica o
   remetente de uma conversa de WhatsApp só pelo e-mail que ele digitar no chat, sem prova de
   posse (sem OTP, sem confirmação cruzada). Quem souber o e-mail de outra pessoa manda esse
   e-mail pro bot e passa a ver `status_pedido`, `valor_pedido` e **`codigo_retirada`** dos
   pedidos dela — o código que permite retirar o pedido fisicamente na loja.
2. **Defesa em profundidade ausente, não explorável hoje.** `cancelarCredito`
   (`src/app/(seller)/seller/credito/actions.ts`) atualiza `solicitacoes_credito` por `id` sem
   filtrar por loja do usuário autenticado. Hoje a RLS (`solicitacoes_credito_owner`, migration
   0049) bloqueia a escrita cruzada, mas é o único write-path do projeto que depende 100% da RLS
   sem checagem equivalente no código — inconsistente com o padrão já aplicado em
   `moderarAfiliacao` no mesmo módulo.
3. **Prompt injection de baixo impacto.** `gerarParecerProduto`
   (`src/lib/agentes/langsmith-curadoria.ts`) injeta a descrição do produto (texto livre do
   seller) direto no prompt do agente LangSmith, e `parseRespostaProduto` aceita o token de
   decisão (`APROVADO`/`REPROVADO`/`SUGESTAO`) da primeira linha da resposta sem confrontar com os
   `gaps` determinísticos já calculados. Blast radius contido — a decisão só é exibida a um admin
   humano, não há auto-aprovação — mas um seller pode tentar induzir a sugestão via texto
   instrutivo na descrição.
4. **Cobertura de secret scanning insuficiente.** O CI roda `gitleaks-action` como gate real
   (`secret-scan`), mas `.gitleaks.toml` só estende o ruleset default e não tem nenhuma regra
   dedicada para os formatos de token do stack (Asaas, LangSmith, WhatsApp/Meta, Resend,
   Supabase service role) — não confirmado se o ruleset genérico realmente pega uma chave real
   dessas integrações.

## What Changes

- Identidade no WhatsApp deixa de liberar acesso a pedido só por e-mail. `buscarPedido` e
  `listarPedidos` no canal WhatsApp passam a exigir que o telefone remetente bata com
  `pedidos.telefone_contato` do pedido (coluna já existe, migration 0073, capturada no checkout
  justamente para o disparo do código de retirada). Sem telefone de contato cadastrado ou sem
  correspondência, o pedido não é retornado por esse canal.
- `cancelarCredito` passa a filtrar por `loja_id` do usuário autenticado (`.eq("loja_id", loja.id)`)
  e verifica se a atualização afetou alguma linha, retornando erro claro em vez de sucesso
  silencioso quando não afeta.
- `parseRespostaProduto`/`gerarParecerProduto` passam a rebaixar automaticamente uma decisão
  `APROVADO` sugerida pelo LLM para `SUGESTAO` sempre que existir `gaps` pendente calculado pela
  regra determinística — o LLM não pode mais aprovar por cima de uma pendência real conhecida.
- `.gitleaks.toml` ganha regras dedicadas para os 5 formatos de segredo do stack (Asaas,
  LangSmith, WhatsApp/Meta token e verify token, Resend, Supabase service role JWT), mantendo o
  `extend.useDefault` existente.

## Capabilities

### New Capabilities
- `bot-atendimento-identidade`: como o bot de atendimento vincula uma conversa de WhatsApp a uma
  conta antes de expor dado de pedido.
- `credito-seller-ownership`: quem pode cancelar uma solicitação de crédito de seller.
- `curadoria-ia-decisao`: como a decisão sugerida pelo agente de IA de curadoria se relaciona com
  as pendências determinísticas calculadas pela regra de negócio.
- `secret-scan-cobertura`: quais formatos de segredo o gate de CI precisa detectar.

## Impact

- `supabase/migrations/0143_bot_identidade_telefone_pedido.sql`: não altera schema (coluna já
  existe); documentado aqui só se a correção exigir índice novo em
  `pedidos(telefone_contato)` — avaliar no tasks.md.
- `src/app/api/bot/whatsapp/webhook/route.ts`: `buscarPedido`/`listarPedidos` passam o telefone
  do remetente para filtrar.
- `src/app/(seller)/seller/credito/actions.ts`: `cancelarCredito`.
- `src/lib/agentes/langsmith-curadoria.ts`, `src/lib/agentes/langsmith-curadoria.test.ts` (novo).
- `.gitleaks.toml`.
- Issue #375 (PRD 025) permanece aberta — este change resolve os 4 achados técnicos, não fecha a
  Issue guarda-chuva.
