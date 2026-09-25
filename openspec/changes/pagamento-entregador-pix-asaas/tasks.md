## 1. Entregador recebe pela corrida (PRD 055, Milestone 1)

- [ ] 1.1 Migration: `repasses.destino` aceita `entregador`; coluna `corrida_id`
      com unicidade (um repasse por corrida); `entregador_id`
- [ ] 1.2 RPC `chave_pix_elegivel_repasse_parceiro` com carência de 24 h (modelo
      0035); a troca protegida da 0042 já zera a confirmação
- [ ] 1.3 Chave Pix no cadastro do entregador e exigência para aceitar corrida
- [ ] 1.4 Criar o repasse quando a corrida vira `Entregue`, idempotente
- [ ] 1.5 `src/lib/repasses.ts`: destino entregador usa a chave de
      `parceiros_logisticos` e a RPC nova; mesma trava pendente → processando
- [ ] 1.6 Teste: repasse único por corrida, chave em carência segura, falha do
      Asaas vira `falhou` (fetch mockado); teste SQL begin/rollback da migration
- [ ] 1.7 Confirmação da dona antes do merge (caminho do dinheiro)

## 2. Ganhos visíveis e falhas resolvidas (Milestone 2)

- [ ] 2.1 Painel de ganhos do entregador: a receber, recebido no mês, por corrida
- [ ] 2.2 Admin: filtro por destino, reenviar falha, estornar, com auditoria
