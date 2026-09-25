## Purpose

Permite ao seller cadastrar as transportadoras com que trabalha, com limites, cubagem, rastreio e categorias atendidas, isoladas da visão de outras lojas, e ver o que impede o frete da loja de funcionar.

## ADDED Requirements

### Requirement: Cadastro da transportadora própria
O sistema SHALL permitir ao seller cadastrar, editar, ativar e desativar transportadoras da própria loja com: nome (obrigatório), código de referência, peso mínimo e máximo por envio (kg), valor mínimo e máximo dos produtos por envio (R$), altura, largura e comprimento máximos (cm), fator de cubagem e URL de rastreio. Limite vazio SHALL significar "sem limite". A transportadora própria SHALL ficar disponível sem aprovação prévia.

#### Scenario: Cadastro válido
- **WHEN** o seller salva uma transportadora com nome "Jadlog", peso máximo 30 e fator de cubagem 6000
- **THEN** a transportadora é gravada na loja do seller, ativa, sem passar por aprovação

#### Scenario: Mínimo maior que o máximo
- **WHEN** o seller informa peso mínimo 50 e peso máximo 30, ou valor mínimo maior que o valor máximo
- **THEN** o sistema recusa a gravação e aponta o campo

#### Scenario: Nome repetido na mesma loja
- **WHEN** o seller tenta cadastrar uma segunda transportadora com nome já usado na própria loja
- **THEN** o sistema recusa com a mensagem de que a loja já tem transportadora com esse nome

#### Scenario: Fator de cubagem no modo avançado
- **WHEN** o seller tenta subir tabela no modo avançado para uma transportadora sem fator de cubagem
- **THEN** o sistema recusa o upload e pede o fator de cubagem

#### Scenario: Desativar com pedido em aberto
- **WHEN** o seller desativa uma transportadora usada em pedido já pago
- **THEN** a transportadora deixa de ser oferecida e o pedido existente não muda

### Requirement: Categorias atendidas pela transportadora
O sistema SHALL permitir ligar a transportadora a um ou mais nós da árvore de taxonomia; o nó SHALL valer para os nós abaixo dele. Sem nó marcado, a transportadora SHALL atender todos os produtos da loja. Ao marcar um nó, o sistema SHALL mostrar quantos produtos da loja ele cobre.

#### Scenario: Marcar um nó
- **WHEN** o seller marca o nó "Materiais de construção > Cimento" e a loja tem 14 produtos nesse nó ou abaixo dele
- **THEN** a tela mostra "cobre 14 produtos da sua loja" e a ligação é gravada

#### Scenario: Nó removido da árvore
- **WHEN** um nó ligado a uma transportadora é removido da taxonomia
- **THEN** o nó some da lista da transportadora e o dono dela vê aviso para revisar as categorias

### Requirement: Isolamento por loja
O sistema SHALL impedir que um seller leia ou altere transportadora própria, faixa de frete, grade simples, ligação a nós ou ativação de global de outra loja, inclusive por acesso direto ao banco com a sessão do seller.

#### Scenario: Leitura de transportadora de outra loja
- **WHEN** um seller consulta transportadoras com a própria sessão
- **THEN** recebe só as transportadoras da própria loja e as globais ativas, nunca a transportadora própria de outra loja, mesmo que ela esteja ativa

#### Scenario: Escrita em faixa de outra loja
- **WHEN** um seller tenta gravar ou desativar faixa de transportadora de outra loja
- **THEN** a operação é recusada

### Requirement: Painel de pendências do frete
O sistema SHALL mostrar ao seller, em `/seller/transportadoras`, as pendências que impedem o frete de funcionar: transportadora ativa sem faixa ativa, produtos sem peso ou sem alguma das três medidas, produtos que nenhuma transportadora ativa atende por categoria, e CDs sem CEP. Sem pendências, SHALL mostrar estado vazio positivo.

#### Scenario: Transportadora sem tabela
- **WHEN** a loja tem transportadora ativa sem nenhuma faixa ativa
- **THEN** o painel mostra "sem tabela, não aparece no checkout" para ela

#### Scenario: Produto sem medidas
- **WHEN** um produto aprovado da loja não tem peso ou alguma das três medidas
- **THEN** o painel lista o produto como "vai para Entrega a combinar", com link para editar

#### Scenario: Tudo completo
- **WHEN** não há nenhuma pendência
- **THEN** o painel mostra que o frete da loja está pronto
