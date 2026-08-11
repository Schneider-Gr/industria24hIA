# PRD - Pós-venda / Disputas: correção de workflow e mediação com canal separado

> Escrito nesta sessão (10/08/2026) a partir de revisão de código real + brainstorm de workflow — não é export do Confluence.

### Product overview

| **Target date** | Concluído — em produção desde 10/08/2026 |
|---|---|
| **Document status** | LIVE |
| **Team members** | Andreia Schneider |

### Objective

Corrigir um bug de desenho no fluxo de pós-venda/disputas (`seller-posvenda`): a loja podia marcar uma disputa como "resolvida" diretamente, sem confirmação do comprador, e se o comprador discordasse não havia nenhum caminho de código para ele escalar para mediação — a disputa ficava travada permanentemente. Corrigido junto com a introdução de um canal de mediação privado e separado por lado (admin↔comprador, admin↔loja), que antes não existia.

### Problem statement

O sistema de disputas previa nos status (`em_atendimento_loja`, `aguardando_confirmacao_comprador`) e no guard de RLS um fluxo de confirmação do comprador, mas nenhuma action de código jamais atribuía esses status. `marcarResolvidaPelaLoja` ia direto para `resolvida_pela_loja`; `escalarParaAdmin` bloqueava explicitamente o escalonamento quando o status já era `resolvida_pela_loja`. Resultado: se a loja marcasse resolvida e o comprador discordasse da solução, ele ficava sem recurso — contradizendo a promessa central do módulo de pós-venda (comprador sempre tem uma via de arbitragem imparcial). Além disso, quando uma disputa chegava à mediação do admin, ele só lia o histórico público comprador↔loja — não tinha canal próprio para conversar com cada lado sem que o outro visse.

### Success metrics

| **Goal** | **Metric** |
|---|---|
| Comprador sempre tem via de escalonamento após proposta da loja | % de disputas em `aguardando_confirmacao_comprador` que eventualmente saem desse status (confirmadas ou escaladas), nunca ficando presas indefinidamente por falta de ação disponível |
| Mediação do admin não vaza posição de um lado para o outro | 0 casos de mensagem do canal `comprador` visível para a loja (ou vice-versa) — garantido por RLS, não só por UI |
| Fila de mediação com prioridade visível | % de disputas escaladas com SLA de 24h vencido corretamente marcadas "Atrasada" na fila do admin |

### Requirements

| **Requirement** | **Importance** |
|---|---|
| Loja propõe resolução (`aguardando_confirmacao_comprador`), nunca fecha a disputa sozinha | HIGH |
| Comprador confirma (fecha) ou recusa (escala) a qualquer momento após a proposta, sem trava de tempo | HIGH |
| Se o comprador nunca reagir, a disputa não fecha automaticamente a favor da loja | HIGH |
| Admin tem canal de mensagens privado e separado por lado (comprador, loja) durante a mediação, em tabela própria (`disputa_mensagens_mediacao`), sem reaproveitar o chat público comprador↔loja | HIGH |
| Admin tem SLA de 24h desde o escalonamento; estourar só marca "Atrasada" na fila, sem ação automática | MEDIUM |
| RLS (`guard_campos_restritos`) impede a loja de contornar a UI e mudar o status direto para `resolvida_pela_loja` | HIGH |

### Out of Scope

- Anexo de foto nas mensagens do canal de mediação (só texto nesta versão) — feedback do dono do produto durante teste ao vivo, registrado como gap para iteração futura.
- Alerta ou escalonamento interno automático quando o SLA de 24h do admin vence — nesta versão só o indicador visual "Atrasada".
- Reabertura de uma disputa já decidida pelo admin.
- Disputas de entregas por afiliado logístico e de pedidos de venda futura/compra coletiva (fora do escopo deste fluxo padrão).

### Decisão de produto

A loja nunca fecha uma disputa sozinha; quem decide o desfecho é sempre o comprador (confirmar ou recusar) — mesmo que ele nunca reaja, o sistema não fecha automaticamente a favor da loja. Motivo: a plataforma lida com dinheiro de terceiro, e "silêncio do comprador = derrota" seria uma escolha de produto ruim para uma decisão financeira. Decisão tomada em brainstorm de revisão de workflow, 10/08/2026, aceita pelo dono do produto.

### Referências

- Migration `0115_disputas_workflow_mediacao.sql` (repo `web`) — implementação da correção e da tabela de mediação.
- PR #261 — código mergeado em `master` do repo `web`, testado ao vivo em produção com dado real (compra → disputa → proposta → recusa → mediação com canais separados, confirmado ponta a ponta).
- `openspec/specs/seller-posvenda/spec.md` e `openspec/specs/admin-disputas/spec.md` — specs formais atualizadas/criadas junto com este PRD.
