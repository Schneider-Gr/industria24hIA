---
prd_number: "052"
status: rascunho
priority: alta
created: 2026-09-24
issue: ""
depends_on: ["049", "050"]
references:
  - "supabase/migrations/0158_repasse_seller_valor_derivado_e_solicitacao.sql" – repasse do seller sem frete, decisão pendente do dono
  - "supabase/migrations/0083_comissao_plataforma_corrida.sql" – comissão sobre frete pago a parceiro/afiliado
  - "docs/prds/049-frete-por-tabela-da-transportadora-do-seller.md" – transportadoras pagas pelo seller
  - "docs/prds/050-entrega-a-combinar-com-o-vendedor.md" – frete cotado pelo seller
---

# PRD 052: Frete no repasse do seller

## 1. Contexto

- **Produto/área**: repasse ao seller (caminho do dinheiro).
- **Estado atual** (verificado no código em 24/09/2026): o repasse do seller é derivado do valor dos itens e **não inclui frete**. A migration 0158 registra que a decisão antiga ("seller recebe ... + frete", de 16/07) foi deixada de fora porque, na Uber Direct e nas transportadoras da plataforma, o frete tem outro destinatário, e que incluir frete fica "como decisão explícita do dono". O frete de corridas de parceiro ou afiliado tem regra própria de comissão (0083).
- **Problema**: com os PRDs 049 e 050, surgem fretes que o próprio seller paga ou executa: transportadora própria, transportadora global que ele contrata e paga, e frete cotado por ele ("Entrega a combinar"). Nesses casos, se o frete não for repassado, o seller paga a entrega e a plataforma fica com o dinheiro.

## 2. Solução Proposta

### Visão de produto

- O frete de um envio passa a ter um destinatário explícito, definido pela fonte do frete.
- Quando quem entrega ou paga a entrega é o seller, o frete entra integral no repasse dele, sem comissão.
- Quando o frete é pago pela plataforma a terceiros (Uber Direct, corridas de parceiro), a regra atual não muda.
- O seller vê, no extrato do pedido, produto e frete separados.

### Decisões de produto

1. Frete de transportadora própria do seller, de transportadora global que o seller contrata e paga, e de "Entrega a combinar" vai **integral para o seller, sem comissão** (decisão da dona, 24/09). Motivo: o seller arca com a entrega; comissão sobre o frete o empurraria a cotar mais caro.
2. Frete Uber Direct e de corridas de parceiro ou afiliado mantém a regra atual (destinatário próprio e comissão da 0083) *(premissa — confirme ou corrija)*.
3. Frete percentual por CEP de hoje (faixas sem transportadora): o seller é quem entrega nesses casos; o frete passa a ir para ele *(premissa — confirme ou corrija; muda o comportamento atual)*.
4. O frete segue o mesmo gatilho do repasse do produto: só é liberado após a confirmação de entrega (regra atual do repasse) *(premissa — confirme ou corrija)*.
5. Em devolução ou estorno do pedido, o frete segue a regra de estorno do PRD 048 *(premissa — confirme ou corrija)*.
6. Pedidos já existentes não são recalculados; a regra vale para pedidos criados após o deploy *(premissa — confirme ou corrija)*.

### Fora do escopo

- Cobrança centralizada: a plataforma pagar a transportadora e reter o frete.
- Mudança nas taxas do gateway de pagamento sobre o valor do frete *(premissa: a taxa do gateway continua absorvida como hoje — confirme ou corrija)*.
- Emissão de nota fiscal de frete.

## 3. Funcionalidades

### US01: Definir o destinatário do frete por fonte

Como plataforma, quero registrar para quem vai o frete de cada envio, para repassar o dinheiro certo.

**Rules:**
- Todo envio grava a fonte do frete (transportadora própria, global paga pelo seller, entrega a combinar, percentual por CEP, Uber Direct, parceiro) e o destinatário resultante (seller ou terceiro).
- Destinatário seller: frete integral no repasse, sem comissão.
- Destinatário terceiro: regra atual.

**Edge cases:**
- Pedido com envios de fontes diferentes → cada envio segue a sua regra.
- Frete R$ 0,00 → nada a repassar, sem erro.

### US02: Mostrar produto e frete no extrato do seller

Como seller, quero ver quanto recebo de produto e de frete em cada pedido, para conferir o que me é devido.

**Rules:**
- O extrato do pedido mostra: valor dos produtos, comissão, frete (e para quem vai), valor a receber.
- A solicitação de transferência considera o total a receber, incluindo o frete.

**Edge cases:**
- Pedido antigo, anterior à regra → mostra frete como "não incluído no repasse (pedido anterior a [data])".

## 4. Fluxo de Negócio

```
Envio do pedido ──▶ fonte do frete?
   ├── transportadora própria / global paga pelo seller / entrega a combinar / percentual por CEP
   │        └──▶ destinatário: seller ──▶ frete integral no repasse, sem comissão
   └── Uber Direct / parceiro / afiliado
            └──▶ destinatário: terceiro ──▶ regra atual
   │
   ▼
Confirmação de entrega ──▶ repasse liberado (produto − comissão + frete do seller)
```

## 5. Critérios de Aceite

### 5a. Critérios de aceite da feature

| Critério | Razão de negócio | Como verificar (observável) |
|----------|------------------|-----------------------------|
| Pedido de R$ 200 de produto (comissão 10%) com frete combinado de R$ 35 → repasse de R$ 215 | O seller recebe o frete que executou | Pedido de teste e extrato |
| Mesmo pedido com frete Uber Direct → repasse de R$ 180 (frete com a regra atual) | Não mudar o que já funciona | Pedido de teste |
| Frete não entra no cálculo da comissão | Decisão 1 | Extrato |
| Repasse do frete só é liberado após a confirmação de entrega | Mesmo gatilho do produto | Pedido pago e não entregue |
| Pedido criado antes do deploy não muda | Não reescrever a história | Extrato de pedido antigo |

### 5b. Métricas de sucesso

| Métrica | Baseline (fonte) | Meta | Prazo | Mín. aceitável | Responsável |
|---------|-------------------|------|-------|-----------------|-------------|
| Divergências de repasse reclamadas por sellers envolvendo frete | A levantar (suporte; dona do produto; até o M1) | 0 | 60 dias após o deploy | 0 | Dona do produto |
| Envios com destinatário de frete gravado | 0 (campo não existe) | 100% dos pedidos novos | Desde o deploy | 100% | Engenharia |

## 6. Milestones

### Milestone 1: Seller recebe o frete que executou

**Por que é um marco:** o seller passa a receber pela entrega que faz ou paga, e vê isso separado no extrato.

**Funcionalidades:** US01, US02

**Checklist de aceite** (marcado pelo Aprovador após a implementação):
- [ ] Frete combinado de R$ 35 em pedido de R$ 200 → repasse de R$ 215
- [ ] Frete Uber Direct mantém a regra atual
- [ ] Frete fora da comissão
- [ ] Frete liberado só após a confirmação de entrega
- [ ] Pedido anterior ao deploy não muda

**Aprovador:** dona do produto

## 7. Riscos e Dependências

| Risco | Impacto | Mitigação | Status |
|-------|---------|-----------|--------|
| Mudança no caminho do dinheiro com efeito em repasses em andamento | Alto | Só pedidos novos; testar em transação com rollback antes de aplicar | Pendente |
| Frete percentual passar a ir para o seller muda o resultado da plataforma | Médio | Premissa 3 explícita; confirmar com a dona antes de implementar | Pendente |
| Taxa do gateway sobre o frete fica com a plataforma | Baixo | Registrar o custo; rever se o volume crescer | Monitorando |

**Dependências:**

| Dependência | Tipo | Status | Impacto se bloqueado |
|-------------|------|--------|----------------------|
| PRD 049 (fontes de frete por envio) | Interna | Rascunho | Sem a fonte gravada por envio, não há como definir o destinatário |
| PRD 050 (frete combinado) | Interna | Rascunho | Uma das fontes com destinatário seller |
| PRD 048 (devolução e estorno) | Interna | PR #748 aberto | Regra de estorno do frete |

## 8. Referências

- `supabase/migrations/0158_repasse_seller_valor_derivado_e_solicitacao.sql` – repasse sem frete e a decisão pendente
- `supabase/migrations/0083_comissao_plataforma_corrida.sql` – comissão sobre frete de corrida
- [PRD 049: Frete por tabela de transportadora](./049-frete-por-tabela-da-transportadora-do-seller.md)
- [PRD 050: Entrega a combinar com o vendedor](./050-entrega-a-combinar-com-o-vendedor.md)

## 9. Registro de Decisões

- **2026-09-24:** Frete de transportadora própria, de global paga pelo seller e de entrega a combinar vai integral para o seller, sem comissão. Motivo: o seller arca com a entrega. Resolve a "decisão explícita do dono" pendente na migration 0158 para essas fontes.
- **2026-09-24:** Isolado num PRD próprio por mexer no caminho do dinheiro, seguindo a regra do projeto de não misturar mudança de dinheiro com mudança de modelo de dados (migration 0175).
- **2026-09-24:** Premissas pendentes: Uber Direct e parceiros mantêm a regra atual; frete percentual passa a ir para o seller; mesmo gatilho de liberação do produto; estorno conforme PRD 048; só pedidos novos; taxa do gateway absorvida.
- **2026-09-24:** `depends_on: ["049", "050"]`. Critério: o destinatário depende da fonte do frete por envio, criada no PRD 049, e o frete combinado vem do PRD 050.
