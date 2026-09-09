## Why

A localização automática da vitrine ("Utilizar localização automática") resolve a
coordenada do navegador em CEP, cidade e UF por reverse geocoding do Google, e grava
tudo no cookie `cep_comprador`. O bairro era descartado, embora viesse na mesma
resposta já paga: `definirLocalizacaoAutomatica` gravava `bairro: ""` literal.

O tipo do cookie (`EnderecoCep`, em `src/lib/cep.ts`) sempre teve o campo `bairro`, e o
caminho do CEP digitado o preenche pelo ViaCEP. Ou seja, dois compradores com o mesmo
endereço terminavam com cookies diferentes conforme a via que usaram — quem digitou o
CEP tinha bairro, quem usou o botão de localização não.

Decisão do dono em 09/09/2026, movendo o bairro de "fora de escopo" para escopo no
PRD 031. A rua permanece fora: a coordenada do navegador tem precisão de dezenas de
metros e chutar logradouro erra a quadra.

## What Changes

- `src/lib/geo.ts`: `EnderecoAproximado` ganha o campo `bairro`, e
  `enderecoDaCoordenada` passa a extraí-lo dos `address_components`, varrendo todos os
  resultados como já fazia para CEP, cidade e UF.
- `src/app/vitrine-cep-actions.ts`: `definirLocalizacaoAutomatica` grava
  `bairro: r.valor.bairro` em vez da string vazia. `rua` continua vazia, agora com o
  motivo registrado no código.
- `src/lib/geo-raio.test.ts`: dois cenários novos — bairro presente com precedência
  entre os três componentes, e coordenada sem nenhum deles.

Sem migration, sem mudança de RLS, sem chamada paga a mais: o bairro vem na mesma
resposta de reverse geocoding que já era feita.

## Capabilities

- `geo-bairro-localizacao-automatica` — preenchimento do bairro no endereço obtido por
  geolocalização.

## Impact

O bairro é dado de endereço, não de decisão: não entra em cobertura por faixa de CEP,
frete, filtro de vitrine nem em qualquer regra de negócio. O risco é de exibição, e o
pior caso é o campo vir vazio, que é exatamente o estado anterior.

Compradores que já têm cookie gravado seguem sem bairro até informarem a localização de
novo — o cookie não é reescrito retroativamente, e forçar isso custaria uma chamada
paga por visitante sem benefício proporcional.
