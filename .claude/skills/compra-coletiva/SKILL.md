---
name: compra-coletiva
description: Processo completo da compra coletiva do Industria24h (industria24.com.br) — configuração pelo seller, lotes progressivos, ciclo de vida, rateio no fechamento, janela de pagamento/inadimplência, agentes LangGraph e varredura. Use SEMPRE antes de tocar em qualquer fluxo de coletiva (compras_coletivas, coletiva_*, /seller/coletivas, /coletiva/[id], /api/coletivas/tick) e ao responder como a coletiva funciona.
---

# Compra Coletiva — Industria24h

Módulo B2B onde vários compradores juntam volume no mesmo produto para descer de
lote de desconto; no fechamento **todos pagam o melhor lote atingido** e o
dinheiro é rateado ao centavo. Evolução do MPDD-36. É **caminho do dinheiro**:
toda mudança em RPC de coletiva testa em `begin; … rollback;` no banco linkado
antes de aplicar. Complementa a skill `regras-de-negocio` (repasse 5%, afiliado,
frete) — leia as duas.

Fonte canônica: `docs/business-rules.md` (seção "Compra coletiva"). Migrations
0069–0081. Preço reusa `preco_faixa`/`precoFaixa` — nunca inventar segunda regra.

## Modelo de dados

- **`compras_coletivas`** — a coletiva viva. Campos-chave: `produto_id`,
  `loja_id`, `criador_id`, `meta_qtd`, `qtd_atual`, `preco_base`,
  `valor_unitario` (preço travado histórico/legado), `prazo` (timestamptz),
  `status`, `lotes` jsonb (snapshot da regra na criação), `regra_id`,
  `min_participantes`, `max_participantes`, `frete_conjunto`, `entrega_*`
  (destino único quando frete conjunto), `fechada_em`, `pagamento_ate`.
- **`coletiva_participacoes`** — 1 linha por comprador: `coletiva_id`,
  `user_id`, `quantidade`, `pedido_id` (setado no fechamento). Unique
  (coletiva_id, user_id) — reentrar soma a quantidade.
- **`coletiva_regras`** — configuração do seller, **1 por produto** (0076):
  `ativo`, `meta_qtd` (null = deriva do 1º lote), `min_participantes` (≥2),
  `max_participantes` (null = sem teto), `prazo_dias` (1–30), `lotes` jsonb
  (`[{min_qtd, valor_unitario, validade?}]`, mesmo shape de
  `promocoes_progressivas.faixas`), `frete_conjunto`, `prazo_pagamento_horas`
  (default 48, sem UI ainda).
- **`coletiva_eventos`** — linha do tempo/mural (0078): `tipo` ∈ criada,
  participante_entrou, lote_desbloqueado, meta_atingida, prazo_proximo, fechada,
  expirada, cancelada, agente, pagamento_expirado. `coletiva_evento()` é
  idempotente por `payload->>'marco'`.
- **`conversas.coletiva_id`** — o mural reusa o chat 0075
  (`eh_participante_conversa()` estendida, `coletiva_mural()`).
- **`coletiva_pagamentos`** (view, 0071) — pedidos_gerados / pedidos_pagos.

## Ciclo de vida

Estados: `Aberta → Viavel → Atingida | Expirada | Cancelada`.

Decisão de desenho (dono, 24/07): **bater a meta NÃO fecha** — vira `Viavel` e
segue aberta até o prazo, descendo de lote conforme entra volume. Fecha quando:
prazo vence estando viável, OU `max_participantes` atingido, OU o último lote é
desbloqueado, OU o dono fecha na mão ("Fechar agora"). Prazo vencido **sem**
viabilidade (meta ou min_participantes não batidos) → `Expirada`, sem pedidos e
sem estorno (ninguém é cobrado antes do fechamento — invariante desde a 0069).

Coletivas anteriores à 0076 têm `lotes = '[]'`: preço fixo em `valor_unitario`,
fecham na meta como na 0069 (`coletiva_fechar` trata `lotes = '[]'` como gatilho).

## RPCs (todas security definer, search_path=public)

- **`coletiva_criar(produto_id, quantidade, prazo_dias?, entrega?)`** (0077) —
  lê `coletiva_regras` ativa (manda); sem regra, fallback 0070 (1ª faixa de
  `promocoes_progressivas` com desconto real vira lote único). Recusa se a qtd
  do criador já atinge a meta sozinha, ou estoque < meta. A assinatura de 3 args
  foi DROPADA.
- **`coletiva_participar(coletiva_id, quantidade)`** (0077) — acumula, emite
  eventos, delega o fechamento a `coletiva_fechar`. Barra `auth.uid() null`,
  respeita `max_participantes`, `for update`.
- **`coletiva_fechar(coletiva_id, forcar?)`** (0077) — idempotente, `for update`,
  concentra o fechamento e o rateio. `forcar=true` exige dono. Chamada pela
  participação (lazy), pela varredura e pelo botão do seller.
- **`coletiva_preco_lote(lotes, qtd, base)`** (0077) — espelho SQL de
  `preco_faixa`: melhor lote elegível para a qtd, respeitando `validade`.
- **`coletiva_cancelar(coletiva_id)`** (0078) — só dono, só em andamento
  (Aberta/Viavel, ninguém cobrado). Emite evento.
- **`coletiva_expirar_pagamentos(coletiva_id)`** (0080) — a alavanca de
  inadimplência. Idempotente.
- **`coletiva_evento` / `coletiva_mural`** (0078).

## Rateio no fechamento (o "checkout" da coletiva)

Em `coletiva_fechar`, quando fecha de verdade:
- `v_unit = coletiva_preco_lote(lotes, qtd_atual, preco_base)` — melhor lote
  atingido; **todos** pagam esse preço.
- Total = `round(v_unit * qtd_atual, 2)`. Cada pedido = `round(v_unit *
  quantidade_do_participante, 2)`; a **sobra de centavos** vai para o MAIOR
  participante (desempate por created_at), então soma(pedidos) == total exato.
- **Frete conjunto** (opcional, destino único): percentual da `faixas_cep` do
  CEP de entrega (mesma regra do checkout 0054), rateado por quantidade com a
  mesma correção de centavos. `faixas_cep.cep_inicial/final` são INT, o CEP da
  coletiva é texto → converter com `regexp_replace(cep,'\D','','g')::bigint`.
  Sem frete conjunto: `retirar_na_loja=true`, `valor_frete=null`.
- **Pedido mínimo** da loja avaliado sobre o **total agregado**, não por
  participante — é a razão de existir da coletiva.
- **Repasse Ind24 = 5%** por linha, sobre o valor já rateado. `repasse_afiliado`
  hoje é 0 fixo (GAP, ver abaixo).
- Cada participante ganha um `pedidos` (PIX, `Aguardando Pagamento`) +
  `linha_itens`; estoque debitado por `qtd_atual`; `coletiva_participacoes.
  pedido_id` preenchido.

## Janela de pagamento e inadimplência (0080/0081)

O fechamento debita o estoque do grupo inteiro e gera pedidos `Aguardando
Pagamento`. Regra (dono, 24/07): **quem paga mantém pedido e preço; não há
re-rateio para cima** (recobrar após o pagamento seria abuso).

- `pagamento_ate` é carimbado por **trigger** `coletiva_set_pagamento_ate` na
  transição para `Atingida` (`now() + prazo_pagamento_horas`, default 48h) —
  de propósito NÃO reescreve `coletiva_fechar` (caminho do dinheiro).
- `coletiva_expirar_pagamentos(id)`: após a janela, cancela os pedidos ainda
  `Aguardando Pagamento` (status vira **`Cancelado`** — masc.; é o único valor
  de cancelamento aceito por `pedidos_status_pedido_check`, `Cancelada` explode
  23514) e **devolve a quantidade ao estoque**. Idempotente (só toca
  `Aguardando Pagamento`). A coletiva segue `Atingida`.
- Disparo: automático na varredura (`rodarEtapas` → coletivas `Atingida` com
  `pagamento_ate < now`) e manual pelo dono ("Cancelar não pagos" em
  /seller/coletivas quando a janela vence).
- Segurança: 0081 revoga `execute` de `anon` — a RPC trata `auth.uid() null`
  como service_role, então anon precisa ser barrado no grant, não só no código.

## Agentes LangGraph + varredura

Dentro do app (`@langchain/langgraph|anthropic|core`). Validador **determinístico**
sempre tem a última palavra sobre dinheiro; o LLM só escolhe palavras.

- `src/lib/agentes/coletiva-precos.ts` — propõe `{meta, lotes, prazo,
  participantes}` (propor→validar→corrigir, máx 3 iter); aparece como sugestão
  no form do seller ("Sugerir com IA"), gravada só com clique humano.
- `src/lib/agentes/coletiva-etapas.ts` (`rodarEtapas`) — varre Aberta/Viavel,
  chama `coletiva_fechar` no vencido, emite eventos, publica recado no mural, e
  expira pagamentos das `Atingida` vencidas.
- `POST /api/coletivas/tick` — protegido pelo `ASAAS_WEBHOOK_TOKEN`; exige
  `isServiceConfigured` (503 sem service role). É o que substitui um cron.
- Sem `ANTHROPIC_API_KEY` tudo degrada para texto fixo; o fluxo de dinheiro e
  eventos segue.

## Front

- `/seller/coletivas` — config por produto (`ColetivaRegraForm`, lotes
  editáveis, "Sugerir com IA") + tabela de regras + coletivas em andamento
  (lote atual, participantes vs. limites, "Fechar agora", "Cancelar", "Cancelar
  N não pagos" quando a janela vence).
- `/coletiva/[id]` — régua de lotes, etapas, mural realtime.
- `/produto/[id]` — lê `coletiva_regras` (fallback = comportamento antigo).
- `/admin/coletivas` — auditoria de todas as coletivas do marketplace.

## RLS / grants

Deny-by-default. `coletiva_regras`: leitura pública (vitrine), escrita dono da
loja ou `is_admin()`. RPCs concedidas a `authenticated` (+ `service_role` nas de
varredura). **Armadilha Supabase:** função service-only exige `revoke execute
from anon` EXPLÍCITO — `revoke from public` não remove o grant que o default
privilege dá a anon/authenticated na criação. Foi o bug do 0081.

## Verificação obrigatória antes de mexer

1. `begin; … select <invariantes>; rollback;` via `supabase db query --linked`
   sobre produto/usuários reais: soma dos pedidos == total ao centavo, repasse
   5% exato, frete rateado fecha, `max_participantes` bloqueia excedente,
   fechar por não-dono é recusado, expiração devolve estoque e preserva quem
   pagou, idempotência.
2. `db query --file` NÃO aceita metacomando psql (`\set`, `\gset`) nem mostra
   `raise notice` — teste com bloco DO gravando numa temp table + `select`.
3. Colisão de numeração antes de criar E antes do push (`ls migrations | grep
   -oE '^[0-9]{4}' | sort | uniq -d`). "Aplicada" só é fato com `to_regclass`/
   `to_regprocedure` no schema + registro em `supabase_migrations.
   schema_migrations` (o insert é passo à parte, o classifier já barrou append).
4. Prod = projeto `tiwdqgyeyvceaiqqwitc`; Supabase chega à Vercel pela
   integração (env `supabase`, não `SUPABASE_SERVICE_ROLE_KEY` nomeada) — não
   inferir que a service role falta por `env ls`.

## GAPS conhecidos (não são bug — decisão/infra pendente)

1. **Reserva de estoque** — estoque só debita no fechamento; venda normal pode
   consumir entre Viável e fechar. Correção mexe no checkout inteiro.
2. **`coletiva_fechar` anon** — a versão não-forçada é chamável por anon e não
   barra `auth.uid() null`; write anônimo no caminho do dinheiro (só fecha ao
   preço certo, não rouba). Verificar se a página pública depende do lazy-close
   anônimo antes de revogar.
3. **Afiliado em coletiva** — `repasse_afiliado=0` fixo no rateio; `?ref=` não
   credita. Decisão de negócio.
4. **Cron externo** — sem Vercel cron a expiração/avisos só rodam na visita às
   páginas ou no botão manual (atrasa liberação de estoque).
5. **Notificações no-op** — Resend (domínio Failed) e WhatsApp (número
   NOT_VERIFIED) não disparam o aviso de "pague até tal dia".
