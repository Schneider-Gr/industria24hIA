# Backend Workflows — Industria24h (Rascunho Inferido)

> ⚠️ **Status: rascunho inferido**, não é exportação literal do Bubble.
> Construído a partir do fluxo de pedido e das regras de negócio já mapeadas
> (`business-rules.md`, `database.md`). Precisa ser validado/corrigido
> workflow a workflow diretamente no editor Bubble (aba Backend Workflows).
> Preencher a coluna "Confirmado?" conforme for validando.

Convenção: cada workflow abaixo segue o formato
**Nome → Trigger → Condições → Ações → Dados afetados**.

---

## 1. Aprovar Produto

| Campo | Valor |
|---|---|
| Trigger provável | Mudança de campo `StatusProduto` para `Aprovado` (disparado por admin) |
| Condições | Usuário disparando a ação é `superadm` ou `promotoradm` |
| Ações | 1. Atualiza `Produto.StatusProduto = Aprovado`<br>2. Torna produto visível no marketplace (afeta índice Elasticsearch — reindexação) |
| Dados afetados | `Produto` |
| Confirmado? | ☐ |

## 2. Reindexar Produto no Elasticsearch

| Campo | Valor |
|---|---|
| Trigger provável | Criação/edição/aprovação de `Produto` |
| Condições | `StatusProduto = Aprovado` |
| Ações | `POST /elasticsearch/...` (indexação do documento produto) |
| Dados afetados | Índice Elasticsearch (externo) |
| Confirmado? | ☐ |

## 3. Calcular Frete no Checkout

| Campo | Valor |
|---|---|
| Trigger provável | Usuário informa CEP no checkout |
| Condições | CEP válido (via ViaCEP) |
| Ações | 1. Consulta `FaixaCEP` compatível com o CEP informado<br>2. Calcula frete usando Peso do(s) produto(s), `AdValorem`, `KgAdicional`, `PesoFinal`<br>3. Preenche `LinhaDoItem.ValorFrete` | 
| Dados afetados | `LinhaDoItem`, consulta `FaixaCEP` |
| Confirmado? | ☐ |
| Pendência | Confirmar se Melhor Envio participa deste cálculo ou é só `FaixaCEP` interna (ver `integrations.md`) |

## 4. Criar Cobrança (Pagamento)

| Campo | Valor |
|---|---|
| Trigger provável | Confirmação do checkout |
| Condições | Carrinho válido, endereço e frete calculados |
| Ações | 1. `POST /customers` no Asaas (se cliente não existir)<br>2. `POST /payments` no Asaas<br>3. Cria/atualiza `LinhaDoItem` com `FormaPagamento` |
| Dados afetados | `LinhaDoItem`, Asaas (externo) |
| Confirmado? | ☐ |

## 5. Confirmar Pagamento (Webhook Asaas)

| Campo | Valor |
|---|---|
| Trigger provável | Webhook recebido do Asaas (evento de pagamento confirmado) |
| Condições | Assinatura/autenticidade do webhook validada |
| Ações | 1. Atualiza `LinhaDoItem.PAGO = true`<br>2. Dispara workflow "Calcular Repasse"<br>3. Notifica lojista (BubbleWhats) |
| Dados afetados | `LinhaDoItem` |
| Confirmado? | ☐ |
| Pendência | Este é o maior ponto de risco a validar — payload exato do webhook Asaas |

## 6. Calcular Repasse

| Campo | Valor |
|---|---|
| Trigger provável | `LinhaDoItem.PAGO` muda para `true` |
| Condições | Pedido pago |
| Ações | 1. `RepasseInd24 = ValorTotal * 5%`<br>2. Se afiliado envolvido: `RepasseAfiliado = ValorTotal * PercentualAfiliado`<br>3. Valor restante destinado ao lojista |
| Dados afetados | `LinhaDoItem` |
| Confirmado? | ☐ |

## 7. Executar Transferência ao Lojista

| Campo | Valor |
|---|---|
| Trigger provável | Recurring/Scheduled Workflow (periódico) ou disparado após "Calcular Repasse" |
| Condições | `LinhaDoItem.PAGO = true` e `Entregue = true` (a confirmar se repasse depende de entrega) |
| Ações | `POST /transfers` no Asaas usando `Empresa.ChavePix` / `TipoChavePix` |
| Dados afetados | `LinhaDoItem`, Asaas (externo) |
| Confirmado? | ☐ |
| Pendência | Confirmar se é workflow recorrente (lote) ou disparado por pedido individual |

## 8. Sincronizar Pedido com Bling

| Campo | Valor |
|---|---|
| Trigger provável | Pedido confirmado/pago |
| Condições | Loja possui integração Bling ativa |
| Ações | Envia pedido ao Bling (ERP) para baixa de estoque/emissão fiscal |
| Dados afetados | `LinhaDoItem`, `Produto.EstoqueAtual`, Bling (externo) |
| Confirmado? | ☐ |

## 9. Atualizar Estoque

| Campo | Valor |
|---|---|
| Trigger provável | Pedido confirmado ou sincronização Bling |
| Condições | — |
| Ações | Decrementa `Produto.EstoqueAtual` pela `Quantidade` da `LinhaDoItem` |
| Dados afetados | `Produto` |
| Confirmado? | ☐ |

## 10. Liberar Venda Futura

| Campo | Valor |
|---|---|
| Trigger provável | Scheduled Workflow (data de disponibilidade atingida) |
| Condições | `VendaFutura.Disponibilidade` atinge a data prevista |
| Ações | Move/libera estoque de `VendaFutura` para `Produto.EstoqueAtual` disponível para entrega |
| Dados afetados | `VendaFutura`, `Produto` |
| Confirmado? | ☐ |

## 11. Notificar Cliente/Lojista (WhatsApp)

| Campo | Valor |
|---|---|
| Trigger provável | Mudanças de status do pedido (pago, enviado, entregue) |
| Condições | — |
| Ações | Envia mensagem via BubbleWhats |
| Dados afetados | Nenhum (efeito colateral externo) |
| Confirmado? | ☐ |

## 12. Marcar Pedido como Entregue

| Campo | Valor |
|---|---|
| Trigger provável | Atualização manual (lojista/admin) ou webhook Melhor Envio/transportadora |
| Condições | — |
| Ações | `LinhaDoItem.Entregue = true` |
| Dados afetados | `LinhaDoItem` |
| Confirmado? | ☐ |

---

## Recurring / Scheduled Workflows (candidatos)

| Nome | Frequência provável | Ação |
|---|---|---|
| Processar repasses pendentes | Diário | Executa "Executar Transferência ao Lojista" em lote |
| Expirar promoções | Diário | Desativa `Promocao` fora da validade |
| Liberar vendas futuras | Diário | Executa "Liberar Venda Futura" para itens elegíveis |
| Atualizar `ultimaVezOnline` | Sob demanda (login/atividade) | Atualiza campo em `User` |

---

## Como validar este documento

1. Abrir o editor Bubble → aba **Backend Workflows**
2. Para cada workflow real, conferir se corresponde a um item acima (marcar "Confirmado?")
3. Adicionar workflows não previstos aqui
4. Remover/corrigir suposições erradas
5. Depois de validado, este arquivo alimenta o **Workflow Agent** para gerar as Edge Functions/triggers equivalentes em Supabase
