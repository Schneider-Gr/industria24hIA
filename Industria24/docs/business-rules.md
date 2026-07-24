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

## Compra coletiva (confirmado — implementado 22–24/07/2026)

Feature do rebuild (não existe no Bubble). Compradores pequenos somam
quantidade no mesmo produto até destravar desconto por volume.

- **Configuração é do seller**, por produto, em `coletiva_regras` (migration
  0076): meta, mínimo e máximo de participantes, prazo (1–30 dias), curva de
  lotes e se a entrega é conjunta. Curva validada no banco: quantidade
  crescente, preço estritamente decrescente, todo lote abaixo do preço base,
  no máximo 4 lotes. Sem regra cadastrada vale o comportamento herdado (1ª
  faixa de `promocoes_progressivas` com desconto real).
- **Bater a meta não fecha a coletiva** (mudança de 24/07): ela vira `Viavel`
  e segue aberta até o prazo, descendo de lote conforme entra volume. Fecha
  por prazo, por lotação (`max_participantes`), ao desbloquear o último lote,
  ou quando o dono da loja fecha na mão. Prazo vencido sem viabilidade =
  `Expirada`, sem pedidos e sem estorno — **ninguém é cobrado antes do
  fechamento**.
- **Divisão entre compradores no fechamento** (`coletiva_fechar`, 0077): todos
  pagam o preço do melhor lote atingido; cada pedido é preço × quantidade do
  participante e a sobra de centavos fica com o maior participante, de modo
  que a soma dos pedidos feche exata com o total da coletiva. Frete conjunto
  (opcional) usa o percentual da `faixas_cep` do destino único e é rateado por
  quantidade, com a mesma correção de centavos. `ValorPedidoMinimo` da loja é
  avaliado sobre o **total agregado**, não por participante.
- Repasse da plataforma segue 5% por linha, sobre o valor já rateado.
