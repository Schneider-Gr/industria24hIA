# Pagamento do entregador

## ADDED Requirements

### Requirement: Repasse automático ao entregador por Pix

O sistema SHALL, quando uma corrida for entregue, criar um único repasse ao
entregador no valor do `valor_parceiro` e transferi-lo por Pix pelo Asaas para
a chave cadastrada, sem nunca gerar duas transferências para o mesmo repasse.

#### Scenario: Corrida entregue

- **WHEN** o entregador conclui a entrega de uma corrida
- **THEN** nasce um repasse do `valor_parceiro` e o Pix é enviado para a chave
  dele

#### Scenario: Confirmação repetida

- **WHEN** a entrega da mesma corrida é confirmada duas vezes
- **THEN** existe um único repasse e um único Pix

#### Scenario: Falha do Asaas

- **WHEN** a transferência é recusada pelo Asaas
- **THEN** o repasse fica "falhou", aparece para o admin e pode ser reenviado

### Requirement: Carência da chave Pix do entregador

O sistema SHALL segurar o repasse enquanto a chave Pix do entregador tiver sido
trocada há menos de 24 horas.

#### Scenario: Chave recém-trocada

- **WHEN** o entregador troca a chave e conclui uma corrida em seguida
- **THEN** o repasse fica aguardando e só vira Pix depois da carência

### Requirement: Segundo fator por SMS na troca da chave Pix

O sistema SHALL concluir a troca da chave Pix do entregador somente depois da
confirmação por código enviado por SMS ao telefone cadastrado.

#### Scenario: Código errado

- **WHEN** o entregador pede a troca da chave e digita um código errado
- **THEN** a chave não muda

### Requirement: Chave Pix para aceitar corrida

O sistema SHALL impedir que um entregador sem chave Pix aceite corridas.

#### Scenario: Entregador sem chave

- **WHEN** um entregador sem chave Pix tenta aceitar uma corrida
- **THEN** o aceite é recusado com a explicação de cadastrar a chave
