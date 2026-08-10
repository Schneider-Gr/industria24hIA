# Pós-venda / Disputas Specification

## Purpose
Fluxo formal de abertura, resposta, escalonamento e mediação de disputas sobre pedidos, para comprador, seller e admin. Estado: ✅ produção (base, PRD 009, migrations 0104-0110, PR #229; Milestone 1 validado ao vivo) + ✅ correção de workflow em produção e parcialmente validada ao vivo, 10/08/2026 (migration `0115_disputas_workflow_mediacao.sql`, PR #261, brainstorm 2026-08-10 — loja propõe/comprador confirma-recusa testado ao vivo com dado real; verificação completa do lado admin com as duas threads pendente, ver Known Gaps). Fonte: `docs/prd/009-pos-venda-disputas.md`; código em `(admin)/admin/disputas/`, `(seller)/seller/disputas/`, `pedido/[id]/disputa/`, `src/lib/disputas.ts`, `src/components/chat/MediacaoThread.tsx`.

## Requirements

### Requirement: Meus Pedidos como pré-requisito
O sistema SHALL exibir para o comprador autenticado uma listagem de todos os seus pedidos (número, data, status, valor total, itens resumidos, mais recente primeiro), cada um linkando para `/pedido/[id]`.

#### Scenario: Comprador sem pedidos
- GIVEN um comprador autenticado sem nenhum pedido
- WHEN ele acessa a listagem de pedidos
- THEN vê um estado vazio explicando que ainda não comprou, com link para a vitrine

### Requirement: Janela de abertura de disputa
O sistema SHALL permitir abrir uma disputa sobre um pedido em até 7 dias corridos após a confirmação de entrega, através do botão "Trocar ou pedir ajuda" visível no pedido elegível.

#### Scenario: Janela expirada
- GIVEN um pedido cuja confirmação de entrega ocorreu há mais de 7 dias
- WHEN o comprador acessa o pedido
- THEN o botão de abrir disputa fica ausente ou desabilitado, com explicação do prazo expirado

### Requirement: Motivo categorizado obrigatório
O sistema SHALL exigir que o comprador escolha um motivo de uma lista fixa categorizada (não texto livre) ao abrir uma disputa, permitindo descrição livre e anexo de fotos como complemento.

#### Scenario: Tentativa de abrir disputa sem motivo
- GIVEN o formulário de abertura de disputa
- WHEN o comprador tenta enviar sem selecionar um motivo da lista fixa
- THEN o sistema bloqueia o envio até um motivo ser escolhido

### Requirement: Uma disputa ativa por item
O sistema SHALL impedir a abertura de uma segunda disputa para o mesmo item/linha enquanto já existir uma disputa ativa, direcionando o comprador para a disputa já aberta.

#### Scenario: Segunda tentativa de disputa no mesmo item
- GIVEN um item de pedido já com uma disputa ativa
- WHEN o comprador tenta abrir uma nova disputa para o mesmo item
- THEN o sistema leva direto para a disputa existente em vez de abrir um formulário novo

### Requirement: Regras diferenciadas para item perecível
O sistema SHALL aplicar, para pedidos com item marcado como perecível (PRD 010), a janela de 24h (em vez de 7 dias), foto obrigatória e o motivo adicional `produto_estragado_ou_vencido`, em substituição às regras padrão deste domínio.

#### Scenario: Disputa de item perecível após 24h
- GIVEN um item perecível entregue há mais de 24h
- WHEN o comprador tenta abrir disputa
- THEN o botão fica indisponível, seguindo a janela reduzida do PRD 010 em vez dos 7 dias padrão

### Requirement: SLA de resposta da loja
O sistema SHALL conceder à loja um prazo de 48h a partir da abertura da disputa para dar a primeira resposta; a resposta é registrada na mesma conversa vinculada à disputa (reaproveitando `conversas`/`mensagens`).

#### Scenario: Loja responde dentro do prazo
- GIVEN uma disputa aberta há menos de 48h
- WHEN a loja envia uma mensagem no chat da disputa
- THEN a mensagem é registrada no histórico da disputa

### Requirement: Loja propõe resolução, nunca fecha sozinha
O sistema SHALL exigir que uma proposta de resolução da loja (reembolso, troca, reenvio) passe pelo status `aguardando_confirmacao_comprador` — a loja MUST NOT ter caminho de código ou de RLS que mova a disputa direto para `resolvida_pela_loja`. *(Corrige bug de workflow encontrado em revisão 2026-08-10: antes desta correção a loja fechava a disputa sozinha e, se o comprador discordasse, não havia nenhum caminho de código para ele escalar — ver `0115_disputas_workflow_mediacao.sql`.)*

#### Scenario: Loja tenta fechar a disputa sem confirmação do comprador
- GIVEN uma disputa em `aberta` ou `em_atendimento_loja`
- WHEN a loja tenta mudar o status direto para `resolvida_pela_loja` (via client Supabase, contornando a UI)
- THEN a RLS (`guard_campos_restritos`) bloqueia a transição — só `em_atendimento_loja` ou `aguardando_confirmacao_comprador` são permitidos para a loja

#### Scenario: Loja propõe resolução
- GIVEN uma disputa aberta há menos de 48h
- WHEN a loja propõe uma solução (reembolso, troca ou reenvio) pela ação "Propor resolução"
- THEN o status muda para `aguardando_confirmacao_comprador` e o comprador vê as opções de confirmar ou recusar

### Requirement: Comprador confirma ou recusa a proposta sem trava de tempo
O sistema SHALL permitir que o comprador, a partir do status `aguardando_confirmacao_comprador`, confirme (→ `resolvida_pela_loja`) ou recuse (→ `em_mediacao_admin`) a qualquer momento, sem exigir prazo mínimo ou máximo de espera. Se o comprador não reagir, o sistema MUST NOT fechar a disputa automaticamente a favor da loja — a UI mostra um lembrete após 3 dias, mas isso não é uma trava de negócio.

#### Scenario: Comprador recusa a proposta imediatamente
- GIVEN uma disputa em `aguardando_confirmacao_comprador` havia 1 minuto
- WHEN o comprador clica em "Recusar e pedir mediação"
- THEN o status muda para `em_mediacao_admin` na hora, sem checar SLA nem tempo mínimo desde a proposta

#### Scenario: Comprador confirma a proposta
- GIVEN uma disputa em `aguardando_confirmacao_comprador`
- WHEN o comprador clica em "Aceitar resolução"
- THEN o status muda para `resolvida_pela_loja`

### Requirement: Escalonamento para mediação do admin
O sistema SHALL permitir que o comprador escale a disputa para mediação do admin em dois casos: (a) o SLA de 48h da loja expirar sem qualquer resposta/proposta; ou (b) o comprador recusar explicitamente uma proposta de resolução da loja (`aguardando_confirmacao_comprador` → `em_mediacao_admin`, sem trava de tempo — ver requirement acima).

#### Scenario: Escalonamento antes do SLA vencer, sem proposta da loja
- GIVEN uma disputa aberta há menos de 48h sem resposta/proposta da loja
- WHEN o comprador tenta escalar
- THEN o sistema bloqueia o escalonamento até o SLA vencer

### Requirement: SLA do admin com indicador de atraso, sem ação automática
O sistema SHALL conceder ao admin um prazo de 24h a partir do escalonamento (`escalada_em`) para atuar numa disputa em mediação. Estourar o prazo MUST NOT disparar nenhuma ação automática nesta versão — só marca a disputa como "Atrasada" na fila e no detalhe do admin, para priorização visual.

#### Scenario: Disputa escalada há mais de 24h sem decisão
- GIVEN uma disputa em `em_mediacao_admin` escalada há mais de 24h
- WHEN o admin acessa a fila de disputas ou o detalhe do caso
- THEN a disputa aparece marcada como "Atrasada", sem nenhuma outra consequência automática

### Requirement: Canal de mediação privado e separado por lado
O sistema SHALL, a partir do escalonamento para mediação, oferecer ao admin dois canais de mensagem privados e independentes — um só com o comprador, outro só com a loja — armazenados em tabela própria (`disputa_mensagens_mediacao`), nunca reaproveitando `conversas`/`mensagens` (que amarra comprador e loja na mesma linha por design). Nenhum dos dois lados MUST ver as mensagens trocadas entre o admin e o outro lado.

#### Scenario: Admin conversa só com o comprador
- GIVEN uma disputa em mediação com mensagens do admin no canal do comprador
- WHEN a loja consulta as mensagens de mediação da disputa
- THEN a RLS (`disputa_mediacao_seller_read`) retorna zero linhas do canal `comprador` — a loja não vê essas mensagens

#### Scenario: Admin conversa só com a loja
- GIVEN uma disputa em mediação com mensagens do admin no canal da loja
- WHEN o comprador consulta as mensagens de mediação da disputa
- THEN a RLS (`disputa_mediacao_comprador_read`) retorna zero linhas do canal `loja` — o comprador não vê essas mensagens

### Requirement: Bot nunca cria disputa diretamente
O sistema MUST garantir que o bot de atendimento multi-persona apenas oriente o comprador e monte um rascunho de disputa; a abertura formal exige confirmação explícita do comprador na tela de abertura — o bot nunca grava a disputa sozinho.

#### Scenario: Bot monta rascunho durante atendimento
- GIVEN um comprador relatando um problema ao bot de atendimento
- WHEN o bot identifica que se trata de um caso de disputa
- THEN ele monta um rascunho e pede confirmação explícita do comprador na tela de abertura, sem gravar a disputa sozinho

### Requirement: Mediação do admin com decisão auditável
O sistema SHALL permitir que o admin, ao arbitrar uma disputa escalada, visualize motivo, descrição, fotos e histórico completo de mensagens, e registre uma decisão dentre `reembolso_total`, `reembolso_parcial` (com valor), `troca` ou `negada`, sempre com justificativa textual obrigatória.

#### Scenario: Reembolso parcial não pode exceder o valor do item
- GIVEN uma disputa em mediação com valor de item conhecido
- WHEN o admin tenta registrar reembolso parcial com valor maior que o valor do item disputado
- THEN o sistema bloqueia a submissão e nenhuma decisão é gravada

### Requirement: Decisão de reembolso não dispara pagamento automático
O sistema SHALL, ao registrar uma decisão de reembolso, apenas criar uma pendência no processo manual de repasse/estorno já existente (ver spec `pagamentos`) — a execução financeira segue manual, fora deste fluxo.

#### Scenario: Admin decide reembolso total
- GIVEN uma disputa decidida com `reembolso_total`
- WHEN a decisão é registrada
- THEN uma pendência é criada no processo manual de repasse/estorno, sem nenhum pagamento automático disparado

### Requirement: Upload de evidência via bucket privado com URL assinada
O sistema MUST armazenar fotos de disputa em bucket privado (`disputas`, `public: false`) e gerar URLs assinadas (10 min) sob demanda para exibição em telas de seller/admin — nunca usar `getPublicUrl()` para bucket privado (bug já corrigido: URL pública gravada nunca carregava).

#### Scenario: Admin visualiza foto de evidência
- GIVEN uma disputa com fotos anexadas pelo comprador
- WHEN o admin abre a tela de mediação
- THEN as fotos são exibidas via URL assinada gerada sob demanda, nunca via `getPublicUrl()`

## Known Gaps (premissas do PRD ainda não confirmadas)
- Lista exata de motivos categorizados (`produto_avariado`, `produto_diferente_anunciado`, `produto_nao_entregue`, `quantidade_incorreta`, `outro`) é premissa do PRD, não confirmada como final.
- Número máximo de fotos por disputa (premissa: 5) não confirmado.
- Reabertura de disputa já decidida: hoje não permitida (premissa) — comprador precisaria de novo caso.
- Disputas sobre entregas por afiliado logístico e sobre pedidos de venda futura/compra coletiva estão fora do escopo deste fluxo padrão — tratar como PRD futuro se necessário.
- Os requirements de correção de workflow (loja propõe/comprador confirma, SLA do admin, canal de mediação separado) foram implementados na migration `0115_disputas_workflow_mediacao.sql`. Testados ao vivo em produção, 10/08/2026, com dado real: loja propôs resolução pela UI, comprador recusou e escalou imediatamente sem trava de tempo (corrigindo o bug original), mensagem do comprador no canal privado confirmada invisível para a loja. **Não testado ao vivo**: visão do admin com as duas threads lado a lado e indicador de "Atrasada" — RLS confirmada por query direta (`disputas_admin_all`), mas não clicado na UI; validar manualmente antes de considerar 100% aceito (ver PRD 009, Milestone 2).
- Mensagens do canal de mediação (`disputa_mensagens_mediacao`) só suportam texto — sem anexo de foto, diferente da abertura de disputa (US01, até 5 fotos). Feedback do dono do produto durante teste ao vivo, 10/08/2026: necessário para reforçar a arbitragem do admin. Não implementado nesta rodada.
