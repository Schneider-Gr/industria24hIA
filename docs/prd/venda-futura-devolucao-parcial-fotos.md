# PRD - Venda Futura: devolução parcial mediante avaliação de fotos

> Escrito nesta sessão (12/08/2026) a partir de brainstorm de contexto para o assistente de pós-venda — não é export do Confluence.

### Product overview

| **Target date** | Concluído — em produção desde 12/08/2026 |
|---|---|
| **Document status** | LIVE |
| **Team members** | Andreia Schneider |

### Objective

Fechar a lacuna deixada intencionalmente pelo PRD 009 e pelo PRD de mediação (`pos-venda-disputas-workflow-mediacao.md`), que excluíam explicitamente pedidos de venda futura do módulo de disputas ("casos desses modelos ficam de fora até PRD dedicado"). Um item de venda futura não pode ser trocado nem devolvido fisicamente — já foi entregue/consumido no momento da colheita/produção —, então o único desfecho de arbitragem que faz sentido é reembolso parcial proporcional ao defeito, avaliado por foto.

### Problem statement

O comprador de um item de venda futura que recebe produto avariado ou em quantidade incorreta não tinha nenhum caminho de disputa — o módulo padrão excluía esse tipo de pedido do escopo. Sem PRD dedicado, a lacuna ficaria aberta indefinidamente.

### Success metrics

| **Goal** | **Metric** |
|---|---|
| Comprador de venda futura tem via de reembolso proporcional | % de disputas de itens de venda futura resolvidas com `reembolso_parcial` ou `negada` (nunca `troca`/`reembolso_total`, bloqueados no servidor) |
| Avaliação sempre baseada em evidência | 100% das disputas de venda futura abertas com ao menos 1 foto (bloqueio no servidor impede abertura sem foto) |

### Requirements

| **Requirement** | **Importance** |
|---|---|
| Foto obrigatória para abrir disputa de item de venda futura (`linha_itens.venda_futura_id` preenchido) | HIGH |
| Desfecho do admin restrito a `reembolso_parcial` ou `negada` — `troca`/`reembolso_total` bloqueados no servidor | HIGH |
| Reembolso parcial não pode exceder o valor do item (regra já existente, reaproveitada) | HIGH |
| Janela de disputa: 7 dias padrão, sem regra própria (item de venda futura não é perecível por definição) | MEDIUM |
| Reaproveitar 100% da infraestrutura de disputas existente (tabela, RLS, telas seller/admin, canais de mediação) — sem tabela nova | HIGH |

### Out of Scope

- Motivo de disputa dedicado para venda futura — reaproveita `produto_avariado`/`quantidade_incorreta` já existentes.
- Alteração da janela de disputa para acompanhar a data de colheita/produção em vez da data de entrega — usa a mesma lógica de `entregue_em` já existente.
- Ajuste da UI do admin para esconder as opções `troca`/`reembolso_total` do dropdown quando o item é de venda futura — a validação roda no servidor; a UI continua mostrando as 4 opções e o servidor rejeita a inválida.

### Decisão de produto

Item de venda futura nunca aceita troca nem reembolso total via disputa — só reembolso parcial proporcional ao defeito mostrado em foto, ou negada. Motivo: o produto já foi entregue fisicamente no ato da colheita/produção, não há via de devolução física nem "troca" possível nesse modelo de pré-venda.

### Referências

- Migration `0118_disputa_venda_futura_devolucao_parcial.sql` (repo `web`) — expõe `venda_futura_id` na view `linha_itens_cliente`.
- `openspec/specs/venda-futura-disputas/spec.md` — spec formal.
- `docs/prds/009-pos-venda-disputas.md` e `docs/prd/pos-venda-disputas-workflow-mediacao.md` — exclusão original de venda futura do escopo de disputas.
