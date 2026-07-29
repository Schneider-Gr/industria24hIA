# PRD — Lançar pedido pago no Bling (ERP) — E5.5

> Preenchido seguindo `docs/prd-template.md`. Fonte: `backlog.md` E5.5,
> `backend-workflows.md` §8, `integrations.md` §Bling, `migration.md`.

## 1. Problema
Hoje, quando um pedido é pago (`checkout_criar_pedido`, migration 0014), nada
sincroniza com o Bling. No Bubble em produção existe um componente "Lançar
pedidos bling" que confirma uso real — sem isso replicado, o seller perde a
baixa de estoque/emissão fiscal automática ao cortar o Bubble, e o cutover
(M4) fica bloqueado por essa lacuna funcional.

## 2. Fora de escopo (explícito)
- Sincronização bidirecional (Bling → Supabase). Só saída (pedido pago → Bling).
- Emissão de NF-e diretamente — só o que o Bling já faz ao receber o pedido.
- Catálogo de produtos sincronizado com Bling (fora, decisão futura).
- Consignado (fora do cutover por decisão do dono, ver `roadmap.md`).

## 3. Jornada do usuário
Nenhuma tela nova para o seller/comprador — é um workflow de backend
disparado por evento. Fluxo hipotético (a validar na descoberta):
1. `checkout_criar_pedido` marca pedido como `PAGO` (via webhook Asaas).
2. Um job/trigger dispara envio do pedido ao Bling (produtos + valores +
   dados do comprador necessários para NF).
3. Se a loja não tem integração Bling ativa (`backend-workflows.md` §8:
   "Condições: loja possui integração Bling ativa"), pula sem erro.
4. Falha de rede/API do Bling **não** derruba o pedido nem o pagamento —
   fica em fila/retry, com flag visível no admin.

## 4. Dados
**BLOQUEADO até a descoberta (passo 0 abaixo).** Não inventar nome de
tabela/coluna. Candidatos, a confirmar:
- Nova tabela `integracoes_bling` (por loja: token/API key, ativo bool) —
  padrão já usado em `asaas_clientes`.
- Campo em `pedidos`/`item_para_compra` para status de sync (`bling_status`,
  `bling_pedido_id`) — nomes exatos a definir na implementação, não aqui.

## 5. Edge cases
- Loja sem integração Bling configurada → não tenta enviar, sem erro visível ao comprador.
- Bling fora do ar / timeout → pedido continua `PAGO`; sync marcado como falho, retry depois.
- Pedido cancelado após já ter sido lançado no Bling → como estornar? (não documentado — perguntar ao dono antes de implementar, não assumir).
- Produto sem correspondência de SKU no Bling → o quê? (mesma observação acima).

## 6. Critério de aceite
Um pedido de teste pago no ambiente sandbox do Bling aparece lá com os
itens e valores corretos; falha de conexão não bloqueia o pedido; painel
admin mostra o status de sync (enviado/pendente/falhou).

## 7. Risco / dependências — **é aqui que trava, não no código**
Esta é a "Passo 0" do vídeo: **descoberta de config real antes de codar**.
`migration.md` confirma: só PagBank tem config capturada no API Connector;
Bling (e Asaas) aparecem só como labels/componentes, sem endpoint, payload
ou credencial capturados. **Não dá pra escrever `lib/bling.ts` sem isso.**

Ação necessária antes de qualquer linha de código (mesma tarefa que
`backlog.md` já nomeia como E4.0, estendida a Bling):
1. Abrir o editor Bubble real → localizar o componente "Lançar pedidos bling"
   → capturar payload/endpoint/auth reais usados hoje em produção.
2. Confirmar com o dono se **todas** as lojas usam a mesma conta Bling da
   plataforma, ou se é uma integração por loja (isso muda o modelo de dados
   da seção 4).
3. Registrar o resultado em `integrations.md` marcado "confirmado" — só
   depois volta pra este PRD e preenche a seção 4 de verdade.

**Gate:** este PRD não vira ticket de implementação enquanto o passo 1-2
acima não sair de "hipótese" para "confirmado".
