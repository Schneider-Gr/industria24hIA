## Purpose

Mostrar mais produtos por tela no celular sem perder legibilidade de preço, para o comprador que navega a vitrine pelo celular (a maioria, segundo a dona) comparar e adicionar ao carrinho sem abrir a página de cada produto.

## ADDED Requirements

### Requirement: Trilhos mobile mostram dois cards e meio
Em viewport abaixo de `sm` (640px), cada item de um trilho horizontal da vitrine SHALL ocupar 40% da largura do trilho, de modo que dois cards inteiros e metade do terceiro fiquem visíveis.

#### Scenario: Trilho em tela de 360px
- **WHEN** o comprador abre a home num celular de 360px de largura com um trilho de 6 produtos
- **THEN** o trilho exibe dois cards inteiros e parte do terceiro, e a rolagem horizontal revela os demais

#### Scenario: Desktop inalterado
- **WHEN** a mesma home é aberta em 1280px
- **THEN** a largura dos itens segue as regras atuais de `sm`, `md` e `lg`

### Requirement: Foto do card contida num quadrado claro
O card de produto no mobile SHALL exibir a foto inteira (`object-contain`) centralizada num quadrado de fundo `lm-cinza`, sem recortar o produto.

#### Scenario: Foto em proporção vertical
- **WHEN** o produto tem foto vertical (garrafa, vergalhão em pé)
- **THEN** a foto aparece inteira, centralizada, com o quadrado claro preenchendo as laterais

#### Scenario: Produto sem foto
- **WHEN** o produto não tem foto
- **THEN** o quadrado claro exibe o texto "sem imagem", como hoje

### Requirement: Botão de adicionar sobre a foto
O card SHALL posicionar o botão de adicionar rápido sobre o canto inferior direito da foto, com área de toque de no mínimo 44×44px e cor `lm-azul`.

#### Scenario: Adicionar pelo card
- **WHEN** o comprador toca o "+" de um produto disponível para o CEP dele
- **THEN** o produto entra no carrinho com a quantidade mínima do produto, sem navegar para a página do produto, e o badge do carrinho na tab bar atualiza

#### Scenario: Toque fora do botão
- **WHEN** o comprador toca na foto ou no nome, fora do "+"
- **THEN** a página do produto abre, como hoje

### Requirement: Desconto progressivo legível no card
Quando o produto tem promoção progressiva ativa com faixa de desconto real, o card SHALL exibir o menor preço da faixa com a quantidade que o ativa, o preço unitário base riscado e o percentual de desconto.

#### Scenario: Produto com faixa a partir de 10 unidades
- **WHEN** o produto custa R$ 5,09 e tem faixa de R$ 4,07 a partir de 20 unidades
- **THEN** o card mostra "R$ 4,07 /un. a partir de 20 un", "1 un. R$ 5,09" riscado e a pílula "−20%"

#### Scenario: Faixa vencida ou mais cara que o preço base
- **WHEN** a única faixa da promoção está vencida ou tem valor maior que o preço base
- **THEN** o card mostra só o preço base, sem riscado nem pílula
