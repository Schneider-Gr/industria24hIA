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

**Rateio com afiliado (confirmado durante implementação do fix de
`repasse_vendedor` ausente, 07/08/2026):** a comissão do afiliado sai da
fatia do lojista, não da fatia da plataforma — `repasse_vendedor =
valor_item - repasse_ind - repasse_afiliado`. A coluna `linha_itens.
repasse_vendedor` nunca era calculada pelo checkout (migration 0114 do
`web/`); o repasse automático ao seller (0111) dependia dela e estava
funcionalmente morto desde que foi mesclado.

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
- **Janela de pagamento e inadimplência** (`coletiva_expirar_pagamentos`, 0080,
  confirmado 24/07): o fechamento debita o estoque do grupo inteiro e gera um
  pedido `Aguardando Pagamento` por participante. Cada coletiva ganha um prazo
  de pagamento (`pagamento_ate`, 48h fixas na v1, carimbado por trigger na
  transição para `Atingida`). Vencido o prazo, quem **não pagou** tem o pedido
  marcado `Cancelado` e a quantidade **devolvida ao estoque**; quem **pagou
  mantém o pedido e o preço** — não há re-rateio para cima (recobrar após o
  pagamento seria abuso). A coletiva permanece `Atingida`. A varredura é
  automática (`/api/coletivas/tick`) e o dono da loja também pode acioná-la na
  mão em `/seller/coletivas` ("Cancelar não pagos"). A RPC é idempotente (só
  toca pedidos ainda em `Aguardando Pagamento`).

## Descontos progressivos por faixa (confirmado — paridade Bubble, PR #93, 23/07/2026)

`promocoes_progressivas.faixas` (JSONB por produto): cards clicáveis na página
do produto, em ordem decrescente de quantidade; clicar seta a quantidade para
o `min_qtd` da faixa. Faixa acima do estoque disponível fica listada e
bloqueada ("Estoque insuficiente!"). **O preço da faixa vale para TODAS as
unidades do pedido**, não é desconto marginal por degrau — `src/lib/preco-faixa.ts`
é a fonte única usada por vitrine e checkout (nunca duplicar a regra).

🔴 **Achado de dado sem correção:** existem promoções ativas com
`valor_unitario` de alguma faixa **maior** que o preço base do produto (o
"desconto" encarece) e faixas fora de ordem decrescente entre si. O banco
aplica a faixa mesmo assim, então o checkout cobra o valor inflado. A compra
coletiva (0070) já filtra faixa sem desconto real; vitrine e checkout comuns
não. Antes de mexer em qualquer promoção progressiva, rodar a query de
`docs/business-rules.md`/memória `industria24h-faixas-desconto-selecionaveis-2026-07-23`
para checar se o produto tocado tem faixa inconsistente — decisão de corrigir
cadastro vs. bloquear na validação do seller ainda pendente do dono.

## Consolidação de carga por rota (confirmado — MPDD-46, PR #86, 23/07/2026)

Agrupa pedidos pagos da MESMA loja e mesmo corredor de CEP (prefixo 3 dígitos)
num único lote/corrida, com **30% de desconto fixo no frete** de cada pedido
participante (plataforma repassa 100% do frete, sem margem na v1). Checkbox
"frete consolidado" no checkout (só para entrega, não retirada) marca
`pedidos.frete_consolidado` e abate o desconto do `valor_pedido` antes da
cobrança Asaas. O lote é uma corrida-manifesto (reusa o motor de `corridas`)
com N pedidos; `criar_lote_consolidacao` exige ≥2 pedidos pagos, mesma loja,
mesmo corredor, sem lote/corrida prévia — operado em `/admin/lotes`.
`despachar_corrida_automatica` não despacha pedido consolidado sozinho
(retorna null, webhook aguarda o lote). V1 é só mesma loja/1 coleta; v2
(não implementada): multi-loja, rastreio por parada, peso real, margem.

**Regra de sistema que qualquer alteração no checkout precisa respeitar:**
nunca dar `default` a parâmetro novo de RPC de checkout (overload com DEFAULT
já quebrou toda a compra com `?ref=` em produção por ambiguidade 42725 —
sempre args explícitos nas chamadas internas).

## Afiliado logístico por produto e percurso (confirmado — PR #97, 24/07/2026)

O afiliado logístico Aprovado de uma loja ganha exclusividade de 5 min sobre
a corrida gerada no pagamento — mas só se **todos os itens com entrega** do
pedido tiverem `produtos.permite_logistica_afiliado = true` (default `true`,
seller desliga por produto); senão a corrida vai pro pool geral de
transportadores. A corrida grava percurso real (`corridas.distancia_m`,
`duracao_s`, `link_mapa` via Google Distance Matrix; sem a chave, grava só o
link). Cadastro de afiliado logístico e de parceiro de plataforma tem entrada
pública em `/seja-parceiro` além da URL direta de solicitação.

## Chat direto comprador ↔ vendedor (confirmado — MPDD-15, PR #88/#91/#94, em produção)

Conversa por `comprador × loja × produto`, RLS restrita a participante (mais
admin); update de mensagem só é permitido na coluna `lida_em` — corpo da
mensagem é imutável após o envio, nem pelo autor. Thread em tempo real via
Supabase Realtime (exige `setAuth` com o token da sessão antes do
`.subscribe()`, senão RLS bloqueia o stream). Fora do escopo v1: notificação
de mensagem nova por e-mail/WhatsApp.

## Carência de saque do afiliado (parcial — confirmado o prazo, escopo pendente)

Saldo de comissão de afiliado tem carência de **15 dias** antes de poder ser
sacado. Ponto de início da contagem, tipo de bloqueio (por lançamento vs. por
saldo total) e ação ao vencer ainda não têm decisão registrada do dono — não
implementar sem confirmar esse detalhe primeiro.

## Planejado — código existe, NÃO confirmado como regra ativa em produção

Não tratar como fato: fica registrado aqui só para não reimplementar do zero.
Antes de assumir que qualquer item abaixo já vale em produção, confirmar
aplicação/QA na sessão atual.

- **Repasse PIX automático ao lojista** (PR #43, migration 0058, webhook
  `/transfers`): decisão já registrada de usar PIX manual/automatizado em vez
  de Split/subconta Asaas (ver seção Dinheiro), mas o PR segue **aberto**,
  sem aplicar/QA em prod.
- **MCP de integração com terceiros** (`api_keys`, docs `/desenvolvedores`,
  rastreio Mercado Envios): código existe (PR #48/#71), falta aplicar a
  migration 0059 em prod e configurar o domínio.
