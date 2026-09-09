## ADDED Requirements

### Requirement: Bairro preenchido pela coordenada do navegador
O sistema DEVE gravar o bairro no cookie `cep_comprador` quando o comprador obtém a
localização pelo botão "Utilizar localização automática", extraindo-o da mesma
resposta de reverse geocoding que já resolve CEP, cidade e UF — sem chamada paga
adicional.

#### Scenario: Coordenada urbana com bairro identificado
- **WHEN** o reverse geocoding devolve um `address_component` de bairro para a
  coordenada
- **THEN** o cookie `cep_comprador` é gravado com esse bairro, junto com CEP, cidade e UF

#### Scenario: Coordenada sem nenhum componente de bairro
- **WHEN** a resposta não traz `sublocality_level_1`, `sublocality` nem `neighborhood`
  (zona rural, via expressa)
- **THEN** o bairro é gravado vazio e o endereço continua válido — a ausência de bairro
  nunca invalida o CEP

#### Scenario: CEP ausente na coordenada
- **WHEN** a resposta traz bairro mas nenhum `postal_code` de 8 dígitos
- **THEN** o endereço é recusado com `sem_resultado`, como já ocorria — o bairro não
  substitui o CEP

### Requirement: Precedência entre os nomes de bairro do Google
O sistema DEVE preferir `sublocality_level_1`, depois `sublocality`, e só então
`neighborhood`, porque o Google nomeia o mesmo conceito de três formas no Brasil e
`neighborhood` costuma ser mais granular que o bairro que o comprador reconhece no
próprio endereço.

#### Scenario: Resposta traz sublocality_level_1 e neighborhood
- **WHEN** a coordenada devolve `neighborhood = "Conjunto Vieiralves"` e
  `sublocality_level_1 = "Nossa Senhora das Graças"`
- **THEN** o bairro gravado é "Nossa Senhora das Graças"

#### Scenario: Resposta traz apenas neighborhood
- **WHEN** a coordenada devolve `neighborhood` e nenhum dos dois `sublocality`
- **THEN** o bairro gravado é o `neighborhood`

### Requirement: Rua permanece vazia na localização automática
O sistema NÃO DEVE preencher o logradouro a partir da coordenada do navegador, cuja
precisão é de dezenas de metros e levaria a errar a quadra. O campo `rua` do cookie
segue vazio nessa via.

#### Scenario: Localização automática em endereço urbano
- **WHEN** o comprador usa o botão de localização automática
- **THEN** o cookie tem `rua` vazia, mesmo que a resposta do Google traga `route`

#### Scenario: CEP digitado manualmente
- **WHEN** o comprador digita o CEP em vez de usar a localização
- **THEN** rua e bairro continuam vindo do ViaCEP, sem alteração de comportamento
