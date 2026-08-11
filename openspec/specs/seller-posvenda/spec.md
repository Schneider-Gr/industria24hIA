# Seller Pós-venda (Disputas) Specification

## Purpose

Permite ao seller visualizar e responder disputas abertas por compradores sobre
pedidos da própria loja, e propor uma resolução (nunca fechar a disputa
sozinho — quem decide o desfecho é o comprador, ver
`## Requirement: Loja propõe resolução, nunca fecha sozinha` abaixo). Estado:
✅ produção, corrigido em 10/08/2026 (migration `0115_disputas_workflow_mediacao.sql`,
PR #261 no repo `web`) após bug de workflow encontrado em revisão: a versão
anterior permitia a loja marcar "resolvida" direto, e se o comprador
discordasse não havia caminho de código para ele escalar.

## Requirements

### Requirement: Acesso restrito à disputa da própria loja
O sistema SHALL restringir a visualização e resposta de uma disputa ao seller
dono da loja associada a ela.

#### Scenario: Disputa de outra loja
- **WHEN** o seller tenta acessar o detalhe de uma disputa que não pertence à sua
  loja
- **THEN** o sistema retorna "não encontrado"

### Requirement: Responder disputa pelo chat compartilhado
O sistema SHALL permitir que o seller responda a uma disputa através do mesmo
canal de chat usado na conversa comprador-vendedor.

#### Scenario: Resposta enviada pelo chat da disputa
- **WHEN** o seller envia uma mensagem na thread de uma disputa aberta da própria
  loja
- **THEN** a mensagem é registrada na mesma conversa vinculada à disputa

### Requirement: Loja propõe resolução, nunca fecha sozinha
O sistema SHALL exigir que uma proposta de resolução da loja (reembolso, troca,
reenvio) passe pelo status `aguardando_confirmacao_comprador` — a loja MUST NOT
ter caminho de código ou de RLS que mova a disputa direto para
`resolvida_pela_loja`. Quem decide o desfecho é sempre o comprador (confirmar
ou recusar).

#### Scenario: Loja propõe resolução
- **WHEN** a loja propõe uma solução pela ação "Propor resolução", numa disputa
  em `aberta` ou `em_atendimento_loja`
- **THEN** o status muda para `aguardando_confirmacao_comprador` e a loja vê a
  mensagem "aguardando o comprador confirmar ou recusar"

#### Scenario: Loja tenta fechar a disputa sem confirmação do comprador
- **WHEN** a loja tenta mudar o status direto para `resolvida_pela_loja` (via
  client Supabase, contornando a UI)
- **THEN** a RLS (`guard_campos_restritos`) bloqueia a transição

#### Scenario: Disputa já com resolução proposta
- **WHEN** a disputa já está em `aguardando_confirmacao_comprador` ou
  posterior
- **THEN** a ação de propor resolução não é exibida de novo

### Requirement: Fotos da disputa protegidas por URL assinada
O sistema SHALL disponibilizar as fotos anexadas à disputa apenas por URL
assinada de curta duração, nunca por link público permanente.

#### Scenario: Visualização de foto anexada
- **WHEN** o seller visualiza uma foto anexada à disputa
- **THEN** o sistema gera uma URL assinada de curta duração para aquela foto, em
  vez de expor um link público permanente

### Requirement: Prazo de resposta exibido sem bloqueio automático
O sistema SHALL exibir o prazo (SLA) de resposta da loja na lista e no detalhe da
disputa.

#### Scenario: SLA vencido
- **WHEN** o prazo de resposta da loja já venceu
- **THEN** o sistema continua exibindo a data vencida, sem bloquear nenhuma ação
  adicional com base nisso *(premissa — confirme ou corrija: pode ser lacuna a
  tratar, não regra intencional)*

### Requirement: Canal privado com o admin durante a mediação
O sistema SHALL, quando a disputa está em `em_mediacao_admin`, oferecer à loja
um canal de mensagens privado só com o admin — a loja MUST NOT ver as
mensagens que o admin troca com o comprador nesse mesmo caso.

#### Scenario: Loja não vê mensagens do canal do comprador
- **GIVEN** uma disputa em mediação com mensagens do admin no canal do
  comprador
- **WHEN** a loja consulta as mensagens de mediação da disputa
- **THEN** a RLS retorna zero linhas do canal `comprador` — a loja só vê o
  próprio canal (`loja`)

#### Scenario: Gap conhecido — sem anexo de foto
- **WHEN** a loja quer enviar uma foto no canal privado de mediação para
  reforçar sua posição na arbitragem
- **THEN** não há suporte a anexo nesta versão — só texto *(gap registrado,
  feedback do dono do produto em teste ao vivo, 10/08/2026 — não
  implementado)*
