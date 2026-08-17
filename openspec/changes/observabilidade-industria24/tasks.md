## 1. Fundação compartilhada

- [ ] 1.1 Criar migration `observabilidade_eventos` (RLS ativado, sem policy pública — escrita só via service role) com colunas `id`, `capability`, `origem`, `resultado`, `motivo`, `metadata` (jsonb), `created_at`, e índice em `(capability, created_at)`
- [ ] 1.2 Verificar colisão de prefixo numérico da migration antes de commitar (`ls supabase/migrations | grep -oE '^[0-9]{4}' | sort | uniq -d`)
- [ ] 1.3 Aplicar migration via `supabase db query --linked --file` e confirmar objeto real no schema
- [ ] 1.4 Implementar `src/lib/observabilidade/registrar-evento.ts` (não bloqueante — falha ao registrar não lança exceção para o chamador)
- [ ] 1.5 Escrever `.test.ts` do helper (`registrar-evento.test.ts`) cobrindo sucesso, falha e não-bloqueio

## 2. Cron jobs (menor risco — implementar primeiro)

- [ ] 2.1 Investigar se `/api/coletivas/tick` tem disparo automático real (RemoteTrigger, GitHub Action, ou outro) — registrar o achado antes de instrumentar
- [ ] 2.2 Instrumentar `carrinho/abandono/tick` com `registrarEvento` (sucesso/falha)
- [ ] 2.3 Instrumentar `coletivas/tick` com `registrarEvento`, considerando o achado de 2.1
- [ ] 2.4 Instrumentar `push-metrics` (dashboard-ops), checando explicitamente `result.status` do `prometheus-remote-write` em vez de assumir sucesso
- [ ] 2.5 Endpoint de histórico (`/api/observabilidade/cron`) consultando `observabilidade_eventos` filtrado por `capability = 'cron'`
- [ ] 2.6 Card de histórico de cron no dashboard-ops (reaproveitando layout dos cards existentes de PRD 016)
- [ ] 2.7 Testar: forçar falha em cada uma das 3 rotas e confirmar registro correto
- [ ] 2.8 Abrir Issue + branch + PR referenciando PRD 017 e `Closes #N`

## 3. RLS do Supabase

- [ ] 3.1 Desenhar função/trigger de log de negação no Postgres (não em código da aplicação — negação acontece no banco)
- [ ] 3.2 Aplicar a função nas tabelas de maior risco primeiro (dado financeiro, dado de usuário) — não em todas as tabelas de uma vez
- [ ] 3.3 Testar em `begin; ... select <verificação>; rollback;` antes de aplicar
- [ ] 3.4 Implementar heurística simples de "negação repetida no mesmo recurso" (candidato a bug de policy)
- [ ] 3.5 Endpoint + card no dashboard-ops para consultar negações recentes
- [ ] 3.6 Abrir Issue + branch + PR

## 4. Migrations e drift de schema

- [ ] 4.1 Escrever script de verificação de drift (`db query --linked` comparado ao histórico esperado do repositório)
- [ ] 4.2 Adicionar checagem de colisão de prefixo numérico ao mesmo script (reforça o que já existe no CI `migrations-lint`, mas cobre também o caso pós-CI)
- [ ] 4.3 Agendar como rotina (RemoteTrigger, seguindo o padrão já usado para complexidade ciclomática) — não como job de CI, por exigir CLI Supabase linkada
- [ ] 4.4 Registrar resultado da verificação via `registrarEvento` (`capability = 'migration_drift'`)
- [ ] 4.5 Testar: introduzir drift proposital num branch de teste e confirmar detecção
- [ ] 4.6 Abrir Issue + branch + PR

## 5. Integrações de terceiros (tokens)

- [ ] 5.1 Listar todos os tokens de integração externa com risco de expiração silenciosa (Meta WhatsApp, Mercado Envios, MCP terceiros) e onde vivem hoje
- [ ] 5.2 Implementar check periódico por integração (chamada leve que valida o token sem side effect de negócio)
- [ ] 5.3 Definir e registrar limiar de "próximo da expiração" quando a API expuser essa informação
- [ ] 5.4 Registrar resultado via `registrarEvento` (`capability = 'integracao_terceiro'`)
- [ ] 5.5 Agendar execução periódica (cron ou RemoteTrigger)
- [ ] 5.6 Card no dashboard-ops com status de cada integração
- [ ] 5.7 Abrir Issue + branch + PR

## 6. Rate limit de APIs externas

- [ ] 6.1 Mapear quais das 4 APIs (Asaas, ViaCEP, Maps, WhatsApp Business API) expõem header de rate limit na resposta
- [ ] 6.2 Instrumentar captura desse header nas chamadas existentes (sem duplicar client de API — adicionar no ponto já centralizado, ex. `src/lib/asaas.ts`)
- [ ] 6.3 Definir limiar de alerta de proximidade por API (pode variar por limite de cada provedor)
- [ ] 6.4 Registrar consumo e estouro efetivo (HTTP 429) via `registrarEvento` (`capability = 'rate_limit'`)
- [ ] 6.5 Card no dashboard-ops com consumo atual por API
- [ ] 6.6 Abrir Issue + branch + PR

## 7. Agentes de IA (crews)

- [ ] 7.1 Levantar, para cada crew (SEO, SDR, antifraude), o ponto de instrumentação Langfuse já existente
- [ ] 7.2 Adicionar captura de custo por chamada (tokens de entrada/saída) vinculada ao trace Langfuse existente
- [ ] 7.3 Implementar heurística de sinalização de possível alucinação (saída referenciando dado ausente do contexto) — específica por crew, começar pelo antifraude (maior risco de decisão automatizada)
- [ ] 7.4 Registrar taxa de retry por falha de validação de saída
- [ ] 7.5 Endpoint de métricas agregadas por crew (custo acumulado, taxa de retry/alucinação por período)
- [ ] 7.6 Card no dashboard-ops ou extensão do painel Langfuse já existente
- [ ] 7.7 Abrir Issue + branch + PR

## 8. Webhooks Asaas (alto risco — revisão extra)

- [ ] 8.1 Mapear todas as rotas de webhook Asaas existentes (`src/app/api/webhooks/`)
- [ ] 8.2 Registrar falha de validação de assinatura via `registrarEvento`, sem processar payload não confiável
- [ ] 8.3 Registrar timeout/erro de processamento, incluindo identificador do evento Asaas para permitir reprocessamento manual
- [ ] 8.4 Implementar detecção de duplicata (idempotência) e registrar como esperado, não como falha
- [ ] 8.5 Marcar alertas de webhook financeiro (repasse/split) com prioridade distinta de webhook informativo
- [ ] 8.6 Escrever testes cobrindo os 4 requirements da spec (`observabilidade-webhooks-asaas`) antes de qualquer merge
- [ ] 8.7 Testar em ambiente sandbox Asaas antes de produção
- [ ] 8.8 Revisão humana explícita do PR antes de merge (não só CI verde) — caminho do dinheiro
- [ ] 8.9 Abrir Issue + branch + PR

## 9. Checkout financeiro (maior risco — implementar por último)

- [ ] 9.1 Mapear as etapas críticas de `finalizarCompra` (checkout/actions.ts, CCN 72) onde falha ou divergência deve gerar alerta
- [ ] 9.2 Integrar alerta Sentry nas etapas críticas (finalização, cálculo de repasse, cálculo de comissão), sem bloquear a transação em caso de falha do próprio alerta
- [ ] 9.3 Implementar detecção de divergência de comissão (ex.: comissão creditada sem indicação válida — já ocorreu em incidente real de 13/08)
- [ ] 9.4 Garantir que o alerta não inclua dado de pagamento sensível (cartão, credencial)
- [ ] 9.5 Escrever testes cobrindo os 3 requirements da spec (`observabilidade-checkout-financeiro`), seguindo Red-Green-Refactor
- [ ] 9.6 Testar em `begin; ... rollback;` qualquer alteração de schema associada, se houver
- [ ] 9.7 Revisão humana explícita do PR antes de merge — caminho do dinheiro, maior blast radius de todo o change
- [ ] 9.8 Abrir Issue + branch + PR

## 10. Fechamento

- [ ] 10.1 Confirmar que todas as 8 capabilities têm card/endpoint consultável no dashboard-ops
- [ ] 10.2 Atualizar a skill `dashboard-observabilidade` com o novo padrão de `observabilidade_eventos`, se o dashboard-ops for de fato o consumidor final
- [ ] 10.3 Rodar `openspec archive observabilidade-industria24` após todos os PRs mergeados, para consolidar as specs em `openspec/specs/`
