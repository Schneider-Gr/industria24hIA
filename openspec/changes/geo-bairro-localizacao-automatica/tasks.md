# Tasks

## 1. Extrair o bairro no reverse geocoding

- [x] 1.1 `EnderecoAproximado` ganha o campo `bairro` em `src/lib/geo.ts`
- [x] 1.2 `enderecoDaCoordenada` varre os `address_components` de todos os resultados
      atrás de `sublocality_level_1`, `sublocality` e `neighborhood`, nessa ordem
- [x] 1.3 A condição de parada do laço passa a considerar o bairro, sem torná-lo
      obrigatório: só o CEP de 8 dígitos continua sendo requisito para o endereço valer

## 2. Gravar no cookie

- [x] 2.1 `definirLocalizacaoAutomatica` grava `bairro: r.valor.bairro` em vez da
      string vazia, em `src/app/vitrine-cep-actions.ts`
- [x] 2.2 `rua` permanece vazia, com o motivo registrado em comentário (precisão da
      coordenada do navegador)

## 3. Testes

- [x] 3.1 Cenário de precedência: resposta com `neighborhood` e `sublocality_level_1`
      grava o segundo
- [x] 3.2 Cenário sem nenhum componente de bairro: campo vazio, endereço válido
- [x] 3.3 Os dois asserts existentes de `enderecoDaCoordenada` atualizados para o novo
      formato do objeto

## 4. Verificação

- [x] 4.1 `tsc --noEmit` limpo
- [x] 4.2 `npm run test` — 182 passando, 1 skip pré-existente
- [x] 4.3 Verificação em produção após o deploy, com geolocalização simulada em Manaus:
      cookie carrega o bairro
