## Purpose

Avisar o admin assim que uma loja nova entra em análise, para que a aprovação não
dependa de alguém abrir `/admin` e notar a contagem. Usa a Resend (e-mail) e a
integração BubbleWhats (WhatsApp) já existentes.

## ADDED Requirements

### Requirement: E-mail ao admin na nova solicitação de loja
O sistema SHALL enviar um e-mail para `industria24hs@gmail.com` com o assunto
`Quero vender - solicitação de cadastro` sempre que uma loja for criada com
situação `EmAnalise`.

#### Scenario: Seller cria a primeira loja
- **WHEN** `salvarLoja` insere uma loja nova para o seller
- **THEN** o sistema envia o e-mail com nome da loja, contato do seller
  disponível, cidade/UF, data e link para `/admin/lojas/<id>`

#### Scenario: Loja criada só com o nome
- **WHEN** a loja é criada sem CNPJ, WhatsApp, e-mail ou endereço
- **THEN** o e-mail é enviado mesmo assim e omite os campos vazios, sem exibir
  "null" ou "undefined"

### Requirement: WhatsApp ao admin na nova solicitação de loja
O sistema SHALL enviar via BubbleWhats, para o número de WhatsApp do admin
configurado em variável de ambiente, a mensagem "Nova solicitação de cadastro de
loja" com nome da loja, contato e link para `/admin/lojas/<id>`.

#### Scenario: BubbleWhats e número configurados
- **WHEN** uma loja nova é criada e `isBubblewhatsConfigured` é verdadeiro e o
  número do admin está definido
- **THEN** o sistema envia a mensagem ao número do admin

#### Scenario: Número do admin ou BubbleWhats ausente no ambiente
- **WHEN** a variável do número não existe ou o BubbleWhats não está configurado
- **THEN** o WhatsApp não é enviado, o e-mail é enviado normalmente e a ausência
  é registrada no Sentry como `warning`

### Requirement: Edição de loja não gera aviso
O sistema SHALL disparar os avisos somente na criação da loja, nunca em
atualização de loja existente.

#### Scenario: Seller salva alterações da loja
- **WHEN** `salvarLoja` atualiza uma loja que já existe
- **THEN** nenhum e-mail nem WhatsApp de nova solicitação é enviado

### Requirement: Aviso é best-effort
O sistema SHALL criar a loja independentemente do resultado dos avisos, e a falha
de um canal SHALL NOT impedir o outro.

#### Scenario: Resend falha e BubbleWhats funciona
- **WHEN** `enviarEmail` retorna `enviado=false` durante a criação da loja
- **THEN** a loja permanece criada, o WhatsApp é enviado e a falha do e-mail vai
  para o Sentry

#### Scenario: BubbleWhats com aparelho desconectado
- **WHEN** `enviarBubblewhats` retorna `ok=false`
- **THEN** a loja permanece criada, o e-mail é enviado e a falha vai para o
  Sentry com o motivo retornado
