## Purpose

Calcula o frete de transportadora de tabela por envio no checkout, deixa o comprador escolher a transportadora de cada envio vendo valor e prazo, e grava o pedido com o valor recalculado pela plataforma. Vale só para loja com a flag de frete por tabela ligada pelo admin.

## ADDED Requirements

### Requirement: Envios por origem e transportadora
O sistema SHALL agrupar os itens de cada loja com a flag por CEP de origem do produto (CEP do produto normalizado, senão CEP da loja) e, dentro de cada origem, formar um envio único quando alguma transportadora atende todos os itens, ou envios por conjunto de transportadoras que atendem cada item. O checkout SHALL mostrar quais produtos vão em cada envio.

#### Scenario: Transportadora geral leva tudo
- **WHEN** o carrinho tem guaraná e adubo da mesma origem e a loja tem a transportadora C, sem categoria marcada
- **THEN** o checkout mostra um envio com os dois produtos

#### Scenario: Carrinho misto sem transportadora geral
- **WHEN** o carrinho tem guaraná e adubo da mesma origem, a transportadora A leva só Bebidas e a B leva só Agro
- **THEN** o checkout mostra dois envios, um com A para o guaraná e outro com B para o adubo

#### Scenario: Origens diferentes
- **WHEN** dois produtos da mesma loja têm CEP de origem diferentes
- **THEN** o checkout mostra um envio para cada origem

### Requirement: Transportadoras que atendem o envio
O sistema SHALL oferecer num envio só a transportadora ativa na loja (própria ativa, ou global ativada na loja), não desativada pelo admin e não encerrada, que leva a categoria de todos os produtos do envio, cujos limites de medidas comportam cada produto, cujos limites de peso cobrado e de valor dos produtos comportam o envio, e que tem faixa ativa com a origem e o destino do envio.

#### Scenario: Global não ativada
- **WHEN** a loja não ativou a global "Transportadora Y"
- **THEN** ela não aparece em nenhum envio da loja

#### Scenario: Produto maior que o limite
- **WHEN** um produto tem 250 cm de comprimento e a transportadora aceita no máximo 200 cm
- **THEN** a transportadora não aparece no envio desse produto

#### Scenario: Global encerrada
- **WHEN** a data de encerramento da global chegou
- **THEN** ela não aparece em nenhum envio

### Requirement: Valor do frete do envio
O sistema SHALL calcular o valor de cada transportadora no envio com peso cobrado = maior entre o peso real e o peso cubado (medidas × quantidade ÷ fator de cubagem), valor da faixa, kg adicional acima da maior faixa, AdValorem sobre o valor dos produtos, taxa fixa, frete mínimo e ICMS por dentro, arredondado em centavos. Sem kg adicional, peso acima da maior faixa SHALL tirar a transportadora do envio.

#### Scenario: Cubagem e AdValorem
- **WHEN** o envio tem 3 unidades de 1 kg a 30 × 30 × 30 cm e 1 unidade de 1 kg a 10 × 10 × 10 cm, fator 6000, valor dos produtos R$ 200,00, faixa 5,001 a 30 kg com Valor 40,00 e AdValorem 1%
- **THEN** o frete é R$ 42,00, e R$ 47,73 com ICMS de 12%

#### Scenario: Frete mínimo
- **WHEN** o envio tem 1 kg e R$ 50,00, a faixa tem Valor 8,00, AdValorem 1%, Taxa Fixa 3,00 e Frete Mínimo 15,00
- **THEN** o frete é R$ 15,00

#### Scenario: Acima da maior faixa com kg adicional
- **WHEN** o envio tem 120 kg, a maior faixa vai até 100 kg com Valor 150,00 e KgAdicional 1,50
- **THEN** o frete é R$ 180,00

#### Scenario: Acima da maior faixa sem kg adicional
- **WHEN** o envio tem 120 kg, a maior faixa vai até 30 kg e KgAdicional está vazio
- **THEN** a transportadora não aparece nesse envio

### Requirement: Escolha da transportadora pelo comprador
O checkout SHALL mostrar, por envio, as transportadoras que atendem, com nome, valor e prazo, ordenadas por valor, com a mais barata pré-selecionada e o selo "mais rápida" na de menor prazo máximo. O prazo SHALL somar os dias úteis para postar da loja ao prazo da faixa. O total de frete SHALL ser a soma dos envios, recalculada ao mudar CEP, endereço ou itens, mantendo a escolha que continuar disponível.

#### Scenario: Prazo com dias para postar
- **WHEN** a loja tem 2 dias úteis para postar e a faixa tem prazo de 3 a 5 dias
- **THEN** o checkout mostra "de 5 a 7 dias úteis"

#### Scenario: Escolha deixa de atender
- **WHEN** o comprador muda o CEP e a transportadora escolhida deixa de atender o envio
- **THEN** o checkout seleciona a mais barata e avisa a troca

#### Scenario: Faixa sem prazo
- **WHEN** a faixa aplicada não tem prazo
- **THEN** o checkout mostra "prazo a combinar"

### Requirement: Pedido com o frete recalculado
O sistema SHALL recalcular o frete de cada envio ao criar o pedido, com os dados do cadastro e a tabela vigente, sem usar valor vindo do navegador, e SHALL gravar em cada item a transportadora, o frete rateado do envio, o prazo e a identificação do envio. Se a transportadora escolhida não estiver mais entre as opções do envio, o pedido SHALL não ser criado.

#### Scenario: Escolha da mais cara
- **WHEN** o comprador escolhe a transportadora mais cara de um envio e finaliza
- **THEN** o pedido grava essa transportadora e o mesmo valor exibido

#### Scenario: Tabela mudou antes de finalizar
- **WHEN** a transportadora escolhida deixou de atender entre a cotação e a finalização
- **THEN** o pedido não é criado e o checkout avisa que o frete mudou e recalcula

### Requirement: Fontes quando a tabela não atende
Para loja com a flag e com transportadora de tabela ativa, o envio sem nenhuma transportadora que atenda SHALL ir para "Entrega a combinar" (PRD 050); enquanto ela não existir, a loja SHALL oferecer só retirada nesse carrinho. Loja com a flag e sem transportadora de tabela ativa, e loja sem a flag, SHALL seguir o frete percentual e a Uber Direct como hoje.

#### Scenario: Loja sem flag
- **WHEN** a loja não tem a flag ligada
- **THEN** o checkout e o pedido seguem o frete percentual e a Uber Direct, sem mudança

#### Scenario: Tabela não cobre o destino
- **WHEN** a loja tem a flag e transportadora de tabela ativa, mas nenhuma cobre o CEP do comprador
- **THEN** o envio não tem opção de transportadora e o checkout oferece a saída sem frete calculável

### Requirement: Frete consolidado fora do frete de tabela
O desconto de frete consolidado SHALL não se aplicar a item com frete de transportadora de tabela, e o checkout SHALL esconder a opção quando todos os envios da loja forem de tabela.

#### Scenario: Pedido só com tabela
- **WHEN** todos os envios da loja são de transportadora de tabela
- **THEN** a opção de frete consolidado não aparece e o frete gravado é o da tabela

### Requirement: Flag por loja
O sistema SHALL guardar por loja se o frete por tabela vale no checkout, desligado por padrão, e SHALL permitir só ao admin ligar ou desligar.

#### Scenario: Seller tenta ligar a flag
- **WHEN** o seller tenta alterar a flag da própria loja
- **THEN** a operação é recusada
