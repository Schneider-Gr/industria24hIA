# Decisões por Jev (TypeSafe System One)

## ADDED Requirements

### Requirement: Cliente Jev resiliente a limite e sobrecarga

O sistema SHALL retentar uma chamada ao Jev que falhe com 429 ou 529, com
espera crescente, no máximo 2 vezes, e SHALL respeitar o `Retry-After` quando
a API o enviar.

#### Scenario: Sobrecarga momentânea

- **WHEN** a API responde 529 e, na nova tentativa, 200
- **THEN** a decisão do Jev é usada normalmente

#### Scenario: Erro que não se resolve com nova tentativa

- **WHEN** a API responde 401 ou 422
- **THEN** o sistema não retenta e o chamador cai no seu fallback

#### Scenario: Sobrecarga persistente

- **WHEN** a API responde 429 ou 529 nas 3 tentativas
- **THEN** o chamador cai no seu fallback, sem travar o fluxo do usuário

### Requirement: Versão do modelo travada onde há limiar calibrado

O sistema SHALL chamar o modelo `jev-1.13.0` explicitamente, e não o alias
`jev-latest`, em toda decisão comparada a um limiar de confidence.

#### Scenario: TypeSafe publica versão nova

- **WHEN** o alias `jev-latest` passa a apontar para outra versão
- **THEN** lead scoring e taxonomia seguem no `jev-1.13.0` até recalibração

### Requirement: Confidence vem da API

O sistema SHALL usar o `confidence` devolvido pela API do Jev para o gate de
decisão, sem recalcular a partir das probabilidades.

#### Scenario: Lead com intenção ambígua

- **WHEN** o Jev devolve confidence abaixo de `CONFIANCA_MINIMA` para o score
- **THEN** o score do lead é o do Claude

### Requirement: Persona do bot identificada na 1ª mensagem

O sistema SHALL classificar a persona da conversa nova do bot de atendimento
pela 1ª mensagem, entre `consumidor`, `seller`, `motorista` e `afiliado`,
quando o Jev tiver confidence acima do limiar.

#### Scenario: Mensagem inicial clara

- **WHEN** a 1ª mensagem é "quero rastrear meu pedido 1234"
- **THEN** a persona `consumidor` é gravada antes da 1ª chamada ao Claude e o
  bot já responde com as ferramentas dessa persona

#### Scenario: Mensagem inicial ambígua

- **WHEN** a 1ª mensagem é "oi"
- **THEN** o fluxo atual segue: o bot pergunta quem a pessoa é

### Requirement: Loja avisada quando o comprador está pronto para comprar

O sistema SHALL avisar a loja por WhatsApp quando o comprador do chat
comprador↔loja atingir score `quente` com confidence acima do limiar, uma
única vez por conversa, sem interromper a resposta do bot.

#### Scenario: Comprador pede quantidade e prazo

- **WHEN** o comprador escreve "preciso de 500 unidades até sexta, qual o preço?"
- **THEN** o bot responde e a loja recebe um WhatsApp com o link da conversa

#### Scenario: Comprador segue quente

- **WHEN** a conversa já gerou aviso e o comprador manda outra mensagem quente
- **THEN** nenhum aviso novo é enviado

### Requirement: Motivo de devolução escolhido pelo comprador na lista vigente

O sistema SHALL oferecer os motivos de devolução como opções clicáveis geradas
da mesma lista da tela (`motivosDisponiveis`), e o link de devolução SHALL
levar o valor da opção escolhida. O Jev não infere o motivo: com 3 disputas em
produção (24/09) não há volume para calibrar, e um erro cairia num fluxo de
dinheiro; o comprador sabe o motivo.

#### Scenario: Comprador escolhe a opção

- **WHEN** o bot pergunta o motivo e o comprador toca em "Diferente do anúncio"
- **THEN** o link de devolução vem com `motivo=produto_diferente_anunciado`

#### Scenario: Motivo de perecível em item comum

- **WHEN** o comprador escolhe "Estragado/vencido" para um item não perecível
- **THEN** a tela descarta o valor (`motivoSugeridoValido`) e o comprador escolhe no select
