# PRD 030 — Vitrine por proximidade (geolocalização)

**Status:** fases 1 e 2 em produção; fase 3 nesta branch.
**Substitui:** o PRD "026 — vitrine raio/geolocalização" de 04/09/2026, que nunca
foi commitado (o número 026 pertence ao hardening OWASP). O conteúdo de lá está
absorvido aqui, já corrigido pelos achados de 05/09 e 08/09.

## Problema

O comprador não tem como saber, na vitrine, o que sai de perto dele. Frete e
prazo só aparecem no checkout, no fim da jornada.

## Decisão central: ordenar, nunca esconder

A primeira versão deste recurso filtrava o catálogo por faixa de CEP. Foi
revertida em 05/09 (PR #517) porque `faixas_cep` só cobre AM e DF/GO: qualquer
CEP fora disso zerava home, categoria, busca e galerias.

A medição de 08/09 confirma que filtrar continua sendo a escolha errada, agora
por outro motivo — cobertura de dado:

| origem do CEP do produto | produtos |
|---|---|
| `produtos.cep_produto` preenchido | 73 |
| herdado de `lojas.cep` | 52 |
| sem CEP nenhum | 81 |
| **total** | **206** |

Filtrar por distância tornaria 81 produtos (39% do catálogo) invisíveis por
ausência de cadastro, não por indisponibilidade real.

Portanto: **proximidade reordena a listagem e nunca remove item.** A
indisponibilidade real continua sendo avisada na página do produto e da loja, e
bloqueada de verdade na RPC `checkout_criar_pedido`.

## Fases

### Fase 1 — infraestrutura (em produção, PRs #513/#515/#517)

`geo.ts` com `geocodificarCep`, `enderecoDaCoordenada` e `distanciaKm`
(haversine, sem rede). `ceps-geo.ts` como cache CEP→coordenada em `ceps_geo`,
único ponto do fluxo de vitrine que chama o Google. Modal "Onde você está?" com
CEP manual e geolocalização do navegador, CSP liberando `viacep.com.br` e
`Permissions-Policy: geolocation=(self)`.

### Fase 2 — raio declarado pelo seller (esta branch)

`produtos.raio_entrega_km` (migration 0161) existia no schema mas nenhum código
lia ou escrevia a coluna. Agora é campo do `ProdutoForm`, usado tanto pelo
seller quanto pelo admin, e persistido nas duas actions. Em branco significa
sem limite.

### Fase 3 — ordenação por proximidade (esta branch)

`src/lib/catalogo-compra/proximidade.ts` expõe `ordenarPorProximidade(itens,
cepComprador)`:

- CEP do produto é `cep_produto`, com fallback para `lojas.cep`. A leitura usa o
  service client porque `lojas.cep` é PII e não está na view pública
  `lojas_vitrine`.
- Coordenadas vêm de `coordenadasDeCeps`, que serve do cache e só chama o Google
  para CEP inédito.
- Ordena por distância ascendente. Sort estável: empates e o bloco sem
  coordenada preservam a ordem que veio do banco.
- `raio_entrega_km` é critério de desempate, não filtro: produto cujo raio o
  comprador excede vai para o fim da lista, e continua visível.
- Degrada em silêncio: sem CEP, sem service role ou sem chave do Maps a lista
  volta intacta.

Pontos de uso: home (lista principal), categoria e busca. Na busca é a opção
"Mais perto de mim" do seletor de ordenação, ao lado de preço e recentes; nas
outras duas é o default quando existe CEP no cookie.

O card acima do banner que pede o CEP agora aparece sempre que falta CEP,
inclusive para quem está logado — antes exigia também ausência de sessão, então
o seller logado nunca via.

## Fora de escopo

Raio em polígono ou por rota real (a distância é em linha reta, o que basta para
ordenar). Cobrança de frete por distância — frete continua saindo de
`faixas_cep`.

## Pendência que não é código

`lojas.cep` está preenchido em 7 de 19 lojas. Das 12 restantes, 4 estão inativas
e sem nome e várias são contas de teste; nenhuma tem rua e número que permitam
derivar o CEP com precisão. Backfill automático inventaria dado em coluna que
alimenta cálculo de frete, então fica como cadastro manual do admin. Enquanto
não for feito, os produtos dessas lojas simplesmente não recebem posição por
proximidade.
