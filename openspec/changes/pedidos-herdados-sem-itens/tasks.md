## 1. Levantamento (nenhuma escrita em `pedidos`)

- [ ] 1.1 Obter credencial do Asaas de **produção**, de leitura se possível — a chave atual é sandbox (`ASAAS_ENV=sandbox`) e não enxerga as cobranças `https://www.asaas.com/i/...`
- [ ] 1.2 Exportar os 84 pedidos herdados sem itens (82 `Aguardando Pagamento` + 2 `Pagamento Realizado`) com `id`, `id_venda`, `cliente_id`, `valor_pedido`, `asaas_cobranca_id`, `link_cobranca`, `loja_id`
- [ ] 1.3 Consultar no Asaas de produção o status de cada uma das 79 cobranças e das 2 dos pedidos pagos; guardar a resposta crua
- [ ] 1.4 Classificar nos três destinos e **apresentar o quadro à dona antes de escrever** — em especial a lista dos pagos, que envolve estorno
- [ ] 1.5 Conferir se algum dos 84 tem reserva, lançamento no ledger ou repasse (na medição de 17/09 eram zero nos três) — se mudou, reavaliar

## 2. Cancelamento dos não pagos

- [ ] 2.1 Rotina de cancelamento que lê a classificação do passo 1 e **nunca** decide por conta própria a partir do `status_pedido` local
- [ ] 2.2 Gravar `auditoria_eventos` por pedido com destino, status do provedor, valor e instante — inclusive para os que não forem alterados
- [ ] 2.3 Cancelar as cobranças correspondentes no Asaas de produção, só as pendentes e vencidas, abortando se alguma responder como paga
- [ ] 2.4 Rodar primeiro em `begin; … rollback;` contra produção, com asserção de que nenhum pedido pago entra no conjunto cancelado
- [ ] 2.5 Aplicar, e medir antes e depois: contagem por status, soma de `valor_pedido` por destino, paridade do ledger inalterada

## 3. Aviso ao comprador

- [ ] 3.1 E-mail próprio, explicando migração incompleta e que nada foi cobrado — não reaproveitar o texto genérico de cancelado, que manda falar com a loja
- [ ] 3.2 Envio best-effort: falha de e-mail vira alerta, nunca reverte o cancelamento
- [ ] 3.3 Registrar quantos ficaram sem aviso por falta de cliente ou de e-mail (na medição, 3 sem cliente)

## 4. Os dois pedidos pagos sem item

- [ ] 4.1 Tentar reconstituir o conteúdo pelo que restar do Bubble (`bubble_id`) ou pela descrição da cobrança no Asaas
- [ ] 4.2 Se o conteúdo não for reconstituível, registrar isso formalmente no pedido e levar à dona a decisão entre estorno e contato com o comprador
- [ ] 4.3 Não fechar esta change com os dois em aberto: eles são a razão de ela não ter virado um `delete`

## 5. Trava contra repetição

- [ ] 5.1 Migration com constraint ou trigger que recusa pedido sem nenhuma linha de item fora do instante da criação, e recusa a remoção da última linha
- [ ] 5.2 Verificar que o checkout atual não esbarra na trava: `checkout_criar_pedido` insere o pedido antes das linhas, na mesma transação — a regra tem de ser avaliada no fim da transação, não a cada linha
- [ ] 5.3 Teste em `begin; … rollback;` cobrindo: checkout normal passa, inserção de pedido sem item é recusada, remoção da última linha é recusada
- [ ] 5.4 Conferir colisão de número da migration com a regra do CI antes de criar e **de novo antes do push**

## 6. Fechamento

- [ ] 6.1 Confirmar que o funil deixou de contar os pedidos herdados como pendentes
- [ ] 6.2 Registrar no handoff o destino final de cada um dos 84 e o que sobrou em aberto
