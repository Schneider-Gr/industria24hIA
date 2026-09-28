## Purpose

Quando não há frete calculável, o comprador pede ao vendedor a cotação do frete antes da compra, o vendedor responde valor e prazo ou recusa, e o comprador paga produto e frete cotado num pagamento só, com o valor gravado no servidor. Vale só para loja com a flag de entrega a combinar ligada pelo admin.

## ADDED Requirements

### Requirement: Exibição na página do produto
O sistema SHALL mostrar "Entrega a combinar com o vendedor", a cidade e a UF do CEP de origem e o botão "Pedir cotação de frete" quando a loja tem a flag de entrega a combinar, o produto aceita entrega a combinar, o CEP do comprador está numa das regiões declaradas do produto (ou, sem região declarada, na mesma UF do CEP de origem) e não há frete de tabela nem percentual para o produto e esse CEP. Sem CEP conhecido, o botão SHALL pedir o CEP primeiro.

#### Scenario: Produto sem frete calculável dentro da região
- **WHEN** a loja tem a flag, o produto não tem transportadora que o atenda e o CEP do comprador em Manaus está nas regiões do produto
- **THEN** a página mostra "Entrega a combinar com o vendedor · Manaus, AM" e o botão "Pedir cotação de frete"

#### Scenario: Produto sem região declarada
- **WHEN** o produto não tem região declarada, a origem é Manaus e o comprador informa um CEP do AM e depois um CEP de SP
- **THEN** a entrega a combinar aparece para o CEP do AM e não aparece para o CEP de SP

#### Scenario: CEP fora das regiões
- **WHEN** o CEP do comprador está fora das regiões declaradas do produto
- **THEN** a página mostra "Não entregamos na sua região" e a retirada, se houver

#### Scenario: Seller desligou no produto
- **WHEN** o produto tem a entrega a combinar desligada
- **THEN** a página não mostra a opção

#### Scenario: Loja sem a flag
- **WHEN** a loja não tem a flag de entrega a combinar
- **THEN** a página se comporta como hoje

#### Scenario: Cotação já pedida
- **WHEN** o comprador já pediu cotação desse produto para o mesmo CEP e quantidade e ela foi respondida
- **THEN** a página mostra o valor, o prazo e a validade no lugar do botão

### Requirement: Pedido de cotação
O sistema SHALL aceitar o pedido de cotação só de usuário logado que não é dono da loja, com CEP, quantidade e observação opcional de até 500 caracteres. O sistema SHALL recusar observação com telefone, e-mail, chave Pix ou link, SHALL limitar a 10 pedidos por comprador por hora e SHALL substituir o pedido aberto com o mesmo comprador, loja, CEP e itens com quantidades. O sistema SHALL conferir no servidor que os itens de fato não têm frete de tabela nem percentual.

#### Scenario: Pedido válido
- **WHEN** o comprador logado pede cotação de 10 unidades para o CEP 69050-000 com a observação "entregar no depósito dos fundos"
- **THEN** a cotação fica "Aguardando o vendedor, resposta em até 24 h"

#### Scenario: Observação com telefone
- **WHEN** a observação contém "me liga 92 99999-1234"
- **THEN** o pedido é recusado com a mensagem de que contatos não são permitidos

#### Scenario: Comprador não logado
- **WHEN** um visitante clica em "Pedir cotação de frete"
- **THEN** vai para o login e volta ao produto

#### Scenario: Seller pedindo cotação do próprio produto
- **WHEN** o dono da loja pede cotação de um produto dela
- **THEN** o pedido é recusado

#### Scenario: Limite por hora
- **WHEN** o comprador faz o 11º pedido de cotação dentro de uma hora
- **THEN** o pedido é recusado

#### Scenario: Novo pedido igual
- **WHEN** o comprador pede de novo a cotação com o mesmo produto, quantidade e CEP
- **THEN** o pedido anterior fica substituído e só o novo vale

### Requirement: Aviso e lembrete ao seller
O sistema SHALL avisar o seller na hora por e-mail, WhatsApp e no painel, com produto, quantidade, CEP, bairro, cidade e observação, sem nome nem contato do comprador. O sistema SHALL mandar um lembrete quando a cotação passar de 12 h sem resposta.

#### Scenario: Aviso imediato
- **WHEN** o comprador envia o pedido de cotação
- **THEN** o seller recebe, em até 1 minuto, o e-mail e o WhatsApp com o link da cotação no painel, e o menu "Cotações de frete" mostra o contador de pendentes

#### Scenario: Seller sem WhatsApp
- **WHEN** a loja não tem WhatsApp cadastrado
- **THEN** o aviso sai só por e-mail e no painel

#### Scenario: Lembrete
- **WHEN** a cotação completa 12 h sem resposta
- **THEN** o seller recebe um lembrete, uma vez só

### Requirement: Resposta do seller
O sistema SHALL permitir ao dono da loja responder uma cotação aguardando dentro de 24 h com valor (R$ 0,00 ou mais) e prazo mínimo e máximo em dias úteis, com valor opcional para o carrinho inteiro da loja quando o pedido tiver itens de tabela, ou recusar com "não entrego nesse CEP". A resposta SHALL valer 48 h. Valor acima de 50% do valor dos produtos SHALL exigir confirmação.

#### Scenario: Resposta com valor
- **WHEN** o seller responde R$ 35,00, de 2 a 3 dias úteis
- **THEN** a cotação fica respondida, válida por 48 h, e o comprador é avisado por e-mail e WhatsApp

#### Scenario: Frete grátis
- **WHEN** o seller responde R$ 0,00
- **THEN** o comprador vê "Frete grátis combinado com o vendedor"

#### Scenario: Recusa
- **WHEN** o seller responde "não entrego nesse CEP"
- **THEN** a cotação fica recusada e o comprador é avisado

#### Scenario: Frete alto
- **WHEN** o seller responde R$ 300,00 para produtos de R$ 400,00
- **THEN** o painel pede confirmação antes de gravar

#### Scenario: Resposta depois do prazo
- **WHEN** o seller tenta responder 25 h depois do pedido
- **THEN** a resposta é recusada e ele vê "cotação expirada"

### Requirement: Expiração
O sistema SHALL tratar como expirada a cotação aguardando depois de 24 h e como vencida a cotação respondida depois de 48 h, na leitura e no uso, sem depender do agendador. O agendador SHALL avisar o comprador da expiração uma vez só.

#### Scenario: Sem resposta em 24 h
- **WHEN** a cotação passa de 24 h sem resposta
- **THEN** ela aparece como expirada e o comprador é avisado e pode pedir de novo

#### Scenario: Agendador atrasado
- **WHEN** a cotação respondida venceu e o agendador ainda não rodou
- **THEN** o checkout não oferece a cotação

### Requirement: Cotação no checkout
O sistema SHALL, para cada envio (ou loja sem frete por tabela) sem nenhuma opção de frete, oferecer "Frete combinado com o vendedor" com a cotação respondida e válida do mesmo comprador, loja, CEP e itens com as mesmas quantidades, ou "Pedir cotação" só dos itens sem frete. Quando a cotação tiver valor para o carrinho inteiro e os itens de tabela da loja forem os mesmos do pedido de cotação, o sistema SHALL oferecer também "Tudo com o vendedor". Itens com frete calculável SHALL continuar com o frete de tabela em envio separado.

#### Scenario: Carrinho misto
- **WHEN** o carrinho tem cimento com frete de tabela de R$ 40,00 e porcelanato sem frete calculável, com cotação de R$ 35,00 para o porcelanato
- **THEN** o checkout mostra dois envios: cimento R$ 40,00 pela transportadora e porcelanato R$ 35,00 combinado com o vendedor

#### Scenario: Tudo com o vendedor
- **WHEN** o seller respondeu R$ 35,00 para o porcelanato e R$ 60,00 para o carrinho inteiro, e o carrinho não mudou
- **THEN** o comprador escolhe entre R$ 40,00 + R$ 35,00 e R$ 60,00 com o vendedor

#### Scenario: Quantidade mudou
- **WHEN** o comprador cotou 10 unidades e muda o carrinho para 12
- **THEN** a cotação não aparece e o checkout oferece "Pedir cotação" para 12

#### Scenario: Item novo sem frete
- **WHEN** o carrinho ganha outro produto sem frete calculável além do já cotado
- **THEN** o checkout pede nova cotação dos itens sem frete

#### Scenario: Cotação e Uber Direct
- **WHEN** o envio tem a Uber Direct disponível e também uma cotação respondida e válida
- **THEN** o checkout mostra as duas opções e o comprador escolhe

### Requirement: Pedido com frete cotado
O sistema SHALL criar o pedido com o valor gravado na cotação, nunca com valor vindo do navegador, depois de conferir no servidor comprador, loja, CEP, itens com quantidades, status respondida e validade. O sistema SHALL marcar a cotação como usada pelo pedido e SHALL devolvê-la a respondida se o pedido for cancelado antes do pagamento. O frete consolidado SHALL não se aplicar ao frete cotado.

#### Scenario: Compra com frete cotado
- **WHEN** o comprador finaliza com a cotação de R$ 35,00
- **THEN** o pedido tem R$ 35,00 de frete e a cotação fica usada

#### Scenario: Cotação venceu no meio do checkout
- **WHEN** a cotação vence entre a tela e o clique em finalizar
- **THEN** o pedido não é criado e o checkout mostra "A cotação do frete mudou ou venceu. Revise a entrega."

#### Scenario: Cotação de outro comprador
- **WHEN** a requisição traz a cotação de outro comprador
- **THEN** o pedido não é criado

#### Scenario: Chat continua bloqueado
- **WHEN** o comprador tem cotação respondida e nenhum pedido pago
- **THEN** o botão de falar com o vendedor continua indisponível

### Requirement: Flags
O sistema SHALL ter a flag de entrega a combinar por loja, desligada por padrão, que só o admin altera, e a opção por produto, ligada por padrão, que o seller altera no cadastro.

#### Scenario: Seller tenta ligar a flag da loja
- **WHEN** o seller tenta alterar a flag de entrega a combinar da loja
- **THEN** a alteração é barrada
