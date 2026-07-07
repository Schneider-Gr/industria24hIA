# Workflows — Industria24h

> Status: **~60% mapeado**. Backend Workflows especificamente: **10% mapeado** (maior lacuna do projeto).

## Fluxo de Pedido (conhecido)

```
Carrinho
  ↓
Checkout
  ↓
Pagamento
  ↓
Pedido
  ↓
Entrega
  ↓
Repasse
```

Cada etapa deste fluxo precisa ser detalhada com:
- Gatilhos (o que dispara a transição de estado)
- Condições (regras que precisam ser satisfeitas)
- Ações executadas (ex.: chamadas de API, atualização de campos, notificações)

## Categorias de Workflow no Bubble (a exportar)

Conforme identificado na engenharia reversa, é necessário exportar/documentar:

- **Backend Workflows** — lógica server-side (maior lacuna: 10%)
- **API Workflows** — endpoints expostos como API
- **Recurring Workflows** — tarefas recorrentes (ex.: repasses periódicos, atualização de status)
- **Scheduled Workflows** — tarefas agendadas (ex.: expiração de promoções, venda futura)

## Workflows conhecidos por regra de negócio

Ver detalhamento completo das regras em `business-rules.md`. Resumo dos workflows implícitos:

1. **Aprovação de Produto** — produto muda `StatusProduto` para `Aprovado` antes de ficar visível no marketplace.
2. **Cálculo de Comissão de Afiliado** — disparado quando produto com `PermiteAfiliacao = true` é vendido via link de afiliado.
3. **Cálculo de Repasse** — disparado na confirmação de pagamento do pedido (Ind24 = 5%, restante ao lojista).
4. **Cálculo de Frete** — disparado no checkout, usando CEP + Peso + Categoria contra `FaixaCEP`.
5. **Disponibilização de Venda Futura** — controla liberação de estoque futuro por `Disponibilidade`.

## Ação necessária (Prioridade 1 do projeto)

Para completar este documento, é necessário exportar diretamente do editor Bubble:

- [ ] Lista completa de Backend Workflows (nome, trigger, ações, condições)
- [ ] Lista completa de API Workflows (endpoint, parâmetros, resposta)
- [ ] Recurring Workflows (frequência, ação)
- [ ] Scheduled Workflows (agendamento, ação)

> Recomenda-se usar o Database Agent / Workflow Agent (ver `architecture.md`) para processar essa exportação assim que os dados brutos do Bubble estiverem disponíveis em `/bubble-export/workflows/`.
