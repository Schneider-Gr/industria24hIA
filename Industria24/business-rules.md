# Regras de Negócio — Industria24h

> Status: **~95% mapeado**.

## Produtos

- Produto precisa ser **aprovado** antes de ficar disponível no marketplace.
- Condição: `StatusProduto = Aprovado`.

## Afiliados

- Um produto pode permitir afiliação: `PermiteAfiliacao = true`.
- Comissão é definida por percentual: `PercentualAfiliado`.
- Ao ser vendido via link de afiliado, gera `RepasseAfiliado` na `LinhaDoItem`.

## Pedido

**Fluxo:**
```
Carrinho → Checkout → Pagamento → Pedido → Entrega → Repasse
```

## Repasse Plataforma

- A plataforma (Ind24) retém **5%** do valor do pedido.
- O restante (95%) é repassado ao lojista.

**Exemplo:**
| Item | Valor |
|---|---|
| Pedido | R$ 1.000 |
| Ind24 (5%) | R$ 50 |
| Lojista (95%) | R$ 950 |

> Campos relacionados em `LinhaDoItem`: `RepasseInd24`, `RepasseAfiliado`.

## Venda Futura

Permite ao cliente:
- Comprar hoje
- Receber futuramente

Disponibilidade controlada pelo campo `Disponibilidade` do Data Type `VendaFutura` (ver `database.md`).

## Frete

Calculado por:
- CEP
- Peso
- Categoria

Baseado na tabela `FaixaCEP`, que contém: CEP Inicial, CEP Final, ICMS, AdValorem, KgAdicional, PesoFinal.

> Ver pendência de confirmação sobre relação com Melhor Envio em `integrations.md`.

## Regras ainda não documentadas (pendências)

Estas regras existem no sistema mas não estão detalhadas no material de engenharia reversa disponível — precisam ser extraídas diretamente do Bubble (Backend Workflows) ou validadas com o time de negócio:

- [ ] Regras de cancelamento/estorno de pedido
- [ ] Regras de disputa/mediação entre cliente e lojista
- [ ] Regras específicas de `ConsorcioPromotor` (o que um "Promotor" pode fazer, como se relaciona com afiliados)
- [ ] Regras de `RetiradaNaLoja` (como isso altera o fluxo de frete/entrega)
- [ ] Regras de validação de `ValorPedidoMinimo` por loja
- [ ] Política de `PAGO` parcial vs. total em `LinhaDoItem`
