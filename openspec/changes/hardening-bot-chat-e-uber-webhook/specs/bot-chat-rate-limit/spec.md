## Purpose

Aplicar o rate limit já disponível no projeto (`src/lib/rate-limit.ts`) ao endpoint do bot de
atendimento, que roda um loop de agente OpenAI e hoje está acessível anônimo e sem limite,
alinhando-o ao padrão já usado em `/api/checkout/cotar-frete` e nas server actions de coletiva.

## ADDED Requirements

### Requirement: `POST /api/bot/chat` tem rate limit por usuário ou IP
O sistema SHALL aplicar `checarLimite` antes de criar a conversa ou chamar o agente, usando a
chave `bot-chat:<user.id>` quando houver sessão e `bot-chat:<ip>` quando anônimo, retornando `429`
quando o limite for excedido, sem chamar a OpenAI nem inserir em `bot_conversas`.

#### Scenario: Mensagens dentro do limite
- **WHEN** um usuário (logado ou anônimo) envia mensagens ao bot dentro do limite na janela de
  tempo
- **THEN** a resposta é `200` com a resposta do bot

#### Scenario: Mensagens acima do limite
- **WHEN** a mesma chave excede o número de mensagens permitido na janela
- **THEN** as mensagens excedentes recebem `429` e nenhuma chamada à OpenAI é feita nem linha em
  `bot_conversas` é criada

#### Scenario: Bot segue acessível sem login
- **WHEN** um visitante não autenticado envia a primeira mensagem dentro do limite
- **THEN** a conversa é criada com `usuario_id` nulo e o bot responde normalmente

### Requirement: `POST /api/bot/chat` rejeita mensagem acima de um teto de tamanho
O sistema SHALL rejeitar com `400` requisições cujo campo `mensagem` exceda um teto fixo de
caracteres, antes de qualquer chamada ao agente.

#### Scenario: Mensagem longa demais
- **WHEN** a requisição traz `mensagem` acima do teto de caracteres
- **THEN** a resposta é `400` e o agente não é chamado
