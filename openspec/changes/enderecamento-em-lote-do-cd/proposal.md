## Why

O CD do Indústria em Manaus está em produção desde 16/09/2026 com **zero
posições de armazenagem**, e sem posição nada entra nele: a 0179 exige endereço
para toda entrada em centro `tipo = 'industria'`.

A causa não é falta de tela. A tela existe desde a 0176 e cadastra **uma posição
por vez**, com quatro campos. Um galpão endereçado tem dezenas ou centenas de
posições, e três ruas com dez prédios, quatro níveis e três apartamentos já são
360 cadastros manuais. Ninguém faz isso, então o CD segue vazio e o Milestone 2
do PRD 039 fica entregue no papel e parado na prática.

Cadastrar chamando a função de uma posição em laço também não resolve: seriam
360 idas ao banco sem transação comum, e uma queda no meio deixaria o galpão meio
endereçado, que é pior do que vazio, porque parece pronto.

## What Changes

- **Faixas em vez de valores soltos.** Cada um dos quatro campos aceita lista
  (`A,B,C`) e faixa (`1-10`, `A-C`), e o lote é o produto cartesiano dos quatro.
- **Prévia antes de gravar**, mostrando quantas posições serão criadas e os
  códigos das pontas. A prévia e o servidor usam a mesma função de expansão, para
  que o número confirmado seja o número criado.
- **Uma transação por lote**, com a criação feita por função `security definer`
  que resolve a loja por dono, como as demais funções de endereço da 0176.
- **Lote repetível**: posição que já existe é mantida como está e não derruba o
  lote. Endereçar galpão é trabalho incremental, e o segundo lote quase sempre
  reaproveita o primeiro.
- **Teto por lote**, validado na tela e repetido no banco, porque a tela é
  conveniência e o banco é autoridade.

## Non-goals

- Não decide a topologia do galpão. Quantas ruas, prédios, níveis e apartamentos
  existem é informação física de quem conhece o lugar; inventá-la seria dado
  falso. A change entrega a ferramenta, não o conteúdo.
- Não trata de recebimento, conferência, separação nem expedição. Isso é o
  Milestone 3 do PRD 039 e segue bloqueado por validação fiscal, contrato de
  depósito e a decisão do galpão.
- Não mexe na regra de endereço obrigatório na entrada, que é da 0179.
