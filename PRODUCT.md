# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Dois públicos com o mesmo peso na vitrine (confirmado pela dona em 18/09/2026):
- Comprador B2B pequeno de Manaus/AM (mercadinho, restaurante, construtora) comprando em volume.
- Consumidor final comprando direto da indústria.

Superfícies secundárias: seller (fabricante/produtor que abre loja grátis), afiliado e admin.

## Product Purpose
Marketplace D2C industrial em Manaus: comprar direto de quem fabrica, sem intermediário. A plataforma retém comissão por item (padrão 5%, configurável por categoria). Sucesso = comprador encontra o produto, entende o menor preço possível e fecha o pedido.

## Positioning
Cinco mecanismos que a home deve deixar claros, todos confirmados:
1. Direto da fábrica: sem intermediário, preço de indústria.
2. Venda futura: comprar antes da produção, com preço menor.
3. Desconto por volume: quanto mais leva, menor o preço (desconto progressivo).
4. Compra coletiva: juntar-se a outros compradores para comprar em volume.
5. Entrega 24h local: Manaus/AM, cobertura por CEP.

## Operating Context
- A vitrine exige CEP: sem CEP a home não lista produto; produto fora da faixa de CEP some.
- Regra de preço no card (18/09/2026): exibir sempre o menor preço entre desconto progressivo válido e venda futura, como "a partir de", com o preço cheio riscado.
- Clique na foto ou no card abre o produto (PDP).

## Capabilities and Constraints
- Next.js App Router + Supabase + Vercel; produção em industria24.com.br.
- Merge em master publica produção; plano Vercel tem limite diário de deploys.
- Mobile primeiro: a maioria acessa pelo celular.

## Brand Commitments
- Manter a identidade atual: nome "Indústria 24h", logo, paleta azul-marinho/azul/amarelo/vermelho de promoção, tom direto. Layout, composição e navegação da home podem ser redesenhados (leitura das respostas "manter identidade" + "pode redesenhar").
- `DESIGN.md` é a fonte dos tokens visuais.

## Evidence on Hand
Produtos, lojas, banners e categorias reais vêm do banco. Não há depoimentos, números de clientes ou selos de imprensa confirmados: não inventar.

## Product Principles
1. Menor preço visível sem clique: o comprador vê o melhor preço que pode pegar.
2. Produto antes de loja: produto converte, loja navega.
3. Cada mecanismo de economia (venda futura, volume, coletiva) tem porta de entrada clara na home.
4. Nada anunciado que o checkout recuse (cobertura por CEP, validade de faixa).
5. Mobile é o caso principal, desktop é extensão.
