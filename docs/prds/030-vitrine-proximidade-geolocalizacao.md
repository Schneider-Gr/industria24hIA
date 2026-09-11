# PRD 030 — Vitrine por proximidade (geolocalização)

**Status:** fases 1, 2 e 3 em produção. Cobertura por CEP unificada em 11/09/2026
(PR #591 em produção; PR #590 mergeado e aguardando deploy).

## Estado em 11/09/2026: uma regra de cobertura para todo o site

### Problema encontrado

Com o CEP 90050-102 (Porto Alegre), a home listava o "Cimento 50k" da loja
`construção` e a página do mesmo produto dizia "Indisponível na sua região".
Havia duas regras em produção. Home, busca e categoria usavam a cobertura N:N
**por produto** da migration 0169 (`produto_faixas_cep`). Já a página do produto,
a página da loja e o cross-sell do carrinho continuavam na regra antiga **por
loja** (`lojaCobreCep`), que exige faixa ativa. O cross-sell lia o CEP do cookie
e descartava o valor.

### Regra em vigor

O produto aparece e pode ser comprado pelo comprador de um CEP quando as duas
condições valem:

1. **Cobertura:** alguma região declarada no produto (`produto_faixas_cep`)
   contém o CEP. Produto sem região declarada não é escondido por esta regra.
2. **Recebível:** existe faixa de frete **ativa** cobrindo o CEP (global ou da
   própria loja), ou a loja permite retirada.

Uma única implementação decide isso em todas as superfícies (home, busca,
categoria, página do produto, página da loja e cross-sell do carrinho):
`idsForaDaFaixaCep` / `filtrarPorFaixaCep` em
`src/lib/catalogo-compra/faixa-cep-produto.ts`. `lojaCobreCep` ficou sem uso
nas páginas e não deve voltar a decidir exibição.

Comportamento por superfície:

- Listagens (home, busca, categoria, carrinho): o produto fora da regra some.
- Página da loja: esconde o que não chega. Se nada da loja chega ao CEP, a lista
  vazia diz isso, em vez de "loja sem produtos".
- Página do produto por link direto: continua acessível, e a compra é trocada
  pelo aviso "Indisponível na sua região", com o WhatsApp como ação principal
  (pedido do dono em 11/09).

### Papel duplo de `faixas_cep`

`faixas_cep.ativo = true` significa que a faixa entra no cálculo de frete
(`checkout_criar_pedido`, `cotar_frete_interno`, `coletiva_fechar`). Com
`ativo = false`, ela é só uma região de cobertura que o seller escolhe no
cadastro do produto: são as 30 faixas por UF da migration 0165. **Ativar uma UF
define preço de frete e é decisão do dono.**

### Decisões do dono em 11/09/2026 (migration 0171, aplicada em produção)

| Decisão | Efeito |
|---|---|
| Frete ativo só nas UFs com venda: RS, que inclui Porto Alegre | Faixa "Rio Grande do Sul (RS)" com `ativo = true`, 10% e `kg_adicional = 0`, o mesmo padrão das outras faixas globais (Manaus, Acre, DF/GO). As outras UFs seguem só como cobertura. |
| Cerâmica Iguatú (Rio Branco/AC) atende o Acre | Os 51 produtos saíram de "Manaus e região (AM)" e foram para "Acre (AC)", em `produto_faixas_cep` e em `produtos.faixa_cep_id`. O backfill da 0167 tinha atribuído Manaus. |
| Sem tela de faixas próprias no painel do seller por enquanto | O seller continua marcando as regiões globais no cadastro de cada produto. A policy `faixas_cep_seller_own` já permitiria faixas por loja, mas isso fica para outro PRD. |

Medido em produção depois da 0171 (produtos aprovados com cobertura para o CEP):
Porto Alegre 14, Rio Branco 63, Manaus 32.

### Pendências

- Deploy do #590 (página da loja e cross-sell do carrinho). O deploy de
  11/09 foi recusado pelo limite diário de deploys da Vercel. Depois do deploy,
  validar em produção com cookie de CEP e cache-buster.
- UFs sem frete ativo: fora de AM, AC, DF/GO e RS, a compra só fecha por
  retirada na loja. Para ativar outra UF, o dono precisa definir o percentual.

---

**A decisão central deste PRD foi REVERTIDA pelo dono em 08/09/2026 (PR #535,
Closes #534).** O produto cuja faixa de CEP não cobre o comprador voltou a ser
ESCONDIDO, e não rotulado. O texto abaixo da seção "Decisão central" preserva o
raciocínio de 05/09 como registro histórico — ele explica por que a marcação foi
tentada, não o que vale hoje.

O impacto foi apresentado ao dono antes da decisão e aceito: com as faixas
cadastradas cobrindo só AM, AC e DF, a vitrine mostra 72 produtos para Manaus,
22 para Rio Branco, 14 para Porto Alegre e nenhum para São Paulo. Vitrine vazia
onde nenhum seller declarou cobertura é o comportamento esperado, não incidente.
O caminho para reduzir isso é cadastro, não código.

Medição em produção logo após o deploy do #535: home com 48 cards sem CEP, 31
com Manaus e 5 com São Paulo.

**Complemento (PR #539):** esconder em silêncio fazia o catálogo parecer menor
do que é, ainda mais quando o CEP veio da localização automática. A vitrine
passa a informar quantos produtos ficaram de fora, sem devolvê-los à lista.

A porta de entrada do CEP por geolocalização ganhou PRD próprio: **PRD 031 —
Localização automática do comprador**, que documenta a queda de 04/09 a 08/09
por chave inválida do Google Maps e a correção.
**Substitui:** o PRD "026 — vitrine raio/geolocalização" de 04/09/2026, que nunca
foi commitado (o número 026 pertence ao hardening OWASP). O conteúdo de lá está
absorvido aqui, já corrigido pelos achados de 05/09 e 08/09.

## Problema

O comprador não tem como saber, na vitrine, o que sai de perto dele. Frete e
prazo só aparecem no checkout, no fim da jornada.

## Decisão central (HISTÓRICO — revertida em 08/09 pelo PR #535)

> O que segue nesta seção valeu de 05/09 a 08/09/2026 e está preservado porque
> explica o raciocínio e os dados de cobertura. A regra em vigor é a do PR #535:
> **esconder** o produto fora da faixa, com aviso da quantidade omitida (#539).

### Ordenar, nunca esconder

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
