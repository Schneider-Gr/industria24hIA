## Why

O Industria24h (industria24.com.br) hoje só descobre falhas operacionais depois que alguém nota um efeito colateral ausente ou um cliente reclama — não há registro estruturado de sucesso/falha em crons, webhooks financeiros, RLS, agentes de IA, integrações de terceiros, rate limit ou drift de migration. Isso já causou incidentes reais e documentados: comissão de afiliado creditada errada (13/08), incidente de transportadora fake em produção (12/08), e um bug de falha silenciosa em cron (`push-metrics`, lib que não lança exceção em HTTP de erro). Cada um desses foi descoberto tarde, por acidente. O objetivo desta mudança é fechar esse gap de visibilidade nas 8 áreas de maior risco, priorizando por blast radius: menor risco (cron jobs) primeiro, caminho do dinheiro e webhooks Asaas por último, com revisão extra.

## What Changes

- Registro estruturado de execução (sucesso/falha + motivo) nas 3 rotas de cron existentes (`carrinho/abandono/tick`, `coletivas/tick`, `push-metrics`), com histórico visível no dashboard-ops (PRD 016).
- Alerta via Sentry (não só captura passiva) quando uma etapa financeira crítica do checkout/repasse/comissão falha ou diverge do valor esperado.
- Registro e alerta de falha de assinatura/timeout nos webhooks do Asaas, hoje invisíveis até o cliente reclamar.
- Instrumentação de custo por chamada e taxa de alucinação/retry nos 3 crews de IA (SEO, SDR, antifraude), estendendo a cobertura Langfuse já existente.
- Log de tentativas de acesso negadas por RLS, para distinguir bug de policy de usuário sem permissão.
- Check periódico de validade de token nas integrações de terceiros com expiração silenciosa (Meta WhatsApp, Mercado Envios, MCP terceiros).
- Monitoramento de rate limit das APIs externas usadas em produção (Asaas, ViaCEP, Maps, WhatsApp Business API), com alerta antes do estouro.
- Verificação automatizada de drift de schema Supabase, comparando `db query --linked` com o histórico esperado de migrations (`migration list` já é sabido mentir sob drift).
- Investigação factual, antes de instrumentar: confirmar se `/api/coletivas/tick` tem disparo automático real (não está em nenhum `vercel.json` hoje) — achado do PRD 017, não suposição desta proposta.

## Capabilities

### New Capabilities
- `observabilidade-cron-jobs`: registro de execução (sucesso/falha) dos crons do projeto e histórico visível no dashboard-ops.
- `observabilidade-checkout-financeiro`: alerta e registro de falha/divergência nas etapas críticas de checkout, repasse e comissão de afiliado.
- `observabilidade-webhooks-asaas`: registro e alerta de falha de assinatura/timeout nos webhooks recebidos do Asaas.
- `observabilidade-agentes-ia`: instrumentação de custo por chamada e taxa de alucinação/retry dos crews de IA.
- `observabilidade-rls-supabase`: log de tentativas de acesso negadas por política RLS.
- `observabilidade-integracoes-terceiros`: check periódico de validade de token para integrações externas com expiração silenciosa.
- `observabilidade-rate-limit-apis`: monitoramento e alerta de proximidade de rate limit das APIs externas usadas em produção.
- `observabilidade-migrations-supabase`: verificação automatizada de drift de schema entre o banco real e o histórico de migrations esperado.

### Modified Capabilities
_Nenhuma — todas as 8 áreas são capacidades novas de observabilidade; não alteram requisito de comportamento de negócio já especificado em capability existente (as capabilities atuais em `openspec/specs/` são de domínio de produto — seller, disputas etc. — não de operação/observabilidade)._

## Impact

- **Código afetado**: `src/app/api/carrinho/abandono/tick/route.ts`, `src/app/api/coletivas/tick/route.ts`, `dashboard-ops/app/api/push-metrics/route.ts`, `src/lib/asaas.ts`, `src/app/api/webhooks/*`, `src/lib/agentes/*`, `src/lib/ai/*`, `src/lib/supabase/*`, `src/lib/whatsapp.ts`, `src/lib/uber-direct.ts` (Mercado Envios/afiliado logístico), `mcp-server/`, `supabase/migrations/`.
- **Dependências externas**: Sentry (já instrumentado no site principal), Langfuse (já validado), dashboard-ops/Grafana/Prometheus (PRD 016, já em produção).
- **PRDs relacionados**: PRD 016 (Dashboard de Observabilidade e Operação) e PRD 017 (Observabilidade de Cron Jobs) já documentam comportamento de negócio de parte deste escopo — este change cobre a especificação técnica/spec-driven complementar para as 8 áreas, incluindo as 7 que ainda não têm PRD.
- **Risco**: itens que tocam caminho do dinheiro (`observabilidade-checkout-financeiro`, `observabilidade-webhooks-asaas`) exigem revisão extra antes de aplicar em produção — sequenciados por último nas tasks.
