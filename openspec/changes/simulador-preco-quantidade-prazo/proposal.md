## Why

Brainstorm de 09/10/2026 (noite) com a dona, a partir do print do montador de faixas na
Fibra de Coco da Revgrow7 (`frete-versus-desconto-versus-quantidade.jpg`). O montador da
change `montador-faixas-custo-frete` não respondia à pergunta do seller:

- Ele procurava "a quantidade em que o frete cabe em 20% / 10% do pedido". Em produto caro
  (R$ 250, frete 1–4%) isso já vale na quantidade mínima, e a tela mostrava só 2 linhas sem
  nada mudar.
- Volume e prazo ficavam em telas separadas (promoções e venda futura).
- A margem do prazo não tinha origem: o seller digitava o % de cada degrau sem base.
- O frete é do comprador (afiliado logístico), então volume não gera margem ao seller e o
  desconto de volume ficava em 0%.

A demanda, nas palavras da dona: "quanto maior for o volume mais viável ficará o frete,
quanto mais futuro o prazo de entrega maior a margem para o seller, assim ele consegue dar
mais descontos".

## Decisões da dona (09/10)

1. A margem do prazo vem do custo que cai quando o seller produz com antecedência (opção A).
   O seller informa um número: quanto o custo cai por mês de antecedência.
2. Quantidade mínima viável = joelho da curva: a partir dela, dobrar o pedido baixa menos de
   2% o que o comprador paga por unidade com frete (opção c).
3. Uma tela só, que substitui o montador nas promoções e na venda futura.
4. "Pode criar" sobre a consolidação: desconto recomendado = o maior que mantém o lucro por
   unidade de hoje; volume não dá desconto por padrão; a tela não grava, leva os descontos
   ao formulário da venda futura.

## What Changes

- Página nova `/seller/simulador-preco` (menu Catálogo): produto; custo hoje ou markup;
  "custo cai por mês de antecedência" (%); distância do comprador (km).
- Quantidade mínima viável calculada pelo frete das bandas do avião.
- Matriz quantidade × prazo (imediato, 15, 30, 60, 90 dias, editáveis, até 6 prazos
  futuros): cada célula = quanto o comprador paga por unidade com frete; cada coluna mostra
  o custo no prazo, o desconto sugerido (editável), o máximo sem prejuízo e o lucro por
  unidade.
- Botão "Criar lote de venda futura com estes descontos" abre `/seller/venda-futura` com o
  produto e os degraus preenchidos (validados com a mesma regra do cadastro).
- Sai: o montador de faixas (promoções e venda futura), a gravação de faixas pelo montador
  e o simulador da curva dentro do formulário da venda futura. Promoções e venda futura
  ganham link para o simulador.
- Checkout, frete, repasse e banco não mudam.
