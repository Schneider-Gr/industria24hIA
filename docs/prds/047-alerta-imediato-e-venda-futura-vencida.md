---
prd_number: "047"
status: rascunho
priority: alta
created: 2026-09-23
issue: ""
depends_on: ["038"]
references:
  - "docs/prds/038-ruptura-de-estoque-e-alertas-ao-seller.md"
  - "src/lib/asaas-confirmar.ts"
  - "src/lib/seller/estoque-estado.ts"
  - "src/lib/venda-futura/avisos.ts"
  - "src/app/api/venda-futura/avisos/tick/route.ts"
  - "src/app/api/estoque/alerta/tick/route.ts"
---

# PRD 047: Alerta imediato de estoque crítico e venda futura vencida

## 1. Contexto

- **Produto/área**: avisos ao seller no Indústria 24h. Continua o PRD 038, que entregou o alerta diário de ruptura.
- **Estado atual**, levantado no código em 23/09/2026:
  - O seller **já recebe** WhatsApp quando um pedido é pago (`mensagemPedidoPagoSeller`).
  - O comprador **já recebe** e-mail em `Pagamento Realizado` e `Cancelado`, e WhatsApp com o código de retirada.
  - O seller **já recebe** um e-mail diário com o que esgotou e o que está crítico, agrupado por loja.
  - Comprador e seller **já recebem** WhatsApp na véspera e no dia de uma venda futura.
- **Problema**: sobram dois buracos, e os dois custam dinheiro.
  1. **O estoque crítico só é avisado no dia seguinte.** A varredura roda às 11h. Um produto que esgota às 11h05 passa quase 24 horas fora da vitrine sem o seller saber. Para item de giro rápido, é um dia inteiro de venda perdida.
  2. **Venda futura vencida é silêncio absoluto.** O aviso só conhece dois marcos, véspera e o dia combinado. Passada a data, o sistema não emite nada, não escalona e não trava: o pedido fica pendente para sempre, sem ninguém ser cobrado. O histórico de 82 pedidos fantasma importados do Bubble mostra que "pendente para sempre" acontece de verdade neste sistema.

## 2. Solução Proposta

### Visão de produto

- Quando um pagamento derruba um produto a estoque crítico ou a zero, o seller é avisado **na hora**, não no dia seguinte.
- O aviso imediato vai por **WhatsApp e e-mail**, porque é perda de receita em curso e o seller pode estar em qualquer um dos dois.
- Um pedido que derruba vários produtos gera **um aviso só**, com a lista.
- Venda futura que passa da data combinada **deixa de ser silêncio**: vira aviso ao seller e ao admin, e entra numa fila visível de atrasadas.

### Decisões de produto

1. **O gatilho é a confirmação do pagamento, não o checkout.** Com PIX e boleto, pedido criado ainda não é venda; avisar antes geraria ruído com pedido que nunca é pago.
2. **O limiar do crítico é o que o seller já declarou.** Reusa `quantidade_minima` por produto, com o padrão de 5 unidades. Inventar um limiar novo faria o alerta discordar do painel.
3. **Um aviso por pedido, nunca um por produto.** É a mesma razão que levou o alerta diário a ser agrupado por loja: com 43% do catálogo esgotado, o volume vira spam e o seller silencia o canal.
4. **Teto diário de avisos imediatos por loja** *(premissa — confirme ou corrija: sugiro 5)*. Loja com muitos pedidos em sequência não pode transformar o WhatsApp num alarme contínuo.
5. **Venda futura vencida avisa seller e admin primeiro, não o comprador.** Avisar o comprador antes de alguém poder responder cria pânico e abre disputa que talvez não exista: atraso de safra costuma ser renegociável.
6. **Nada de estorno automático nesta feature.** Atraso em venda futura é entre empresas (o checkout exige CNPJ ou IE), costuma ser renegociável, e o dinheiro pode já ter sido repassado ao seller. Estorno vira PRD próprio, decidido com dados reais de quantos atrasam.

### Fora do escopo

- **Estorno e devolução ao comprador**: não existe no sistema hoje (só `repasses.status = 'estornado'`, que é contabilidade interna) e é caminho do dinheiro. PRD próprio.
- **Trava de venda para seller com atraso recorrente**: punição exige histórico que ainda não existe *(premissa — confirme ou corrija)*.
- **Preferências de canal por seller**: quem quer só e-mail ou só WhatsApp. Útil, mas não bloqueia nada agora *(premissa — confirme ou corrija)*.
- **Refatorar os avisos existentes** para um ponto único de notificação: vale a pena, mas é mudança estrutural que não precisa acontecer junto.
- **Aviso ao comprador sobre venda futura vencida**: depende da política de atraso, que não está decidida.

## 3. Funcionalidades

### US01: Alerta imediato quando a venda derruba o estoque

Como seller, quero ser avisado na hora em que uma venda deixa meu produto crítico ou esgotado, para repor antes de perder o dia seguinte de vendas.

**Rules:**
- O alerta dispara na confirmação do pagamento, considerando o estoque resultante.
- Só alerta produto que **mudou de estado** por causa deste pedido: o que já estava crítico antes não realerta.
- Um pedido gera um único aviso, com a lista dos produtos afetados e o saldo de cada um.
- O aviso vai por WhatsApp e por e-mail.
- O limiar é a `quantidade_minima` do produto, ou 5 unidades quando ela não foi declarada.
- Falha no envio nunca derruba a confirmação do pagamento.

**Edge cases:**
- Loja sem WhatsApp cadastrado → envia só o e-mail, sem erro.
- Pedido com produtos de uma loja só derruba vários itens → um aviso com a lista, não um por item.
- Loja já recebeu o teto de avisos do dia → o alerta é suprimido e o item continua no resumo diário.
- Produto de venda futura → não entra no alerta de estoque crítico, porque não consome `estoque_atual`.
- Pedido cancelado depois, devolvendo o estoque → não há aviso de retratação; o resumo do dia seguinte mostra o estado real.

### US02: Venda futura vencida deixa de ser silêncio

Como seller, quero ser cobrado quando passo da data combinada de uma venda futura, para não deixar um pedido pendente indefinidamente.

**Rules:**
- No dia seguinte à data prevista, item de venda futura ainda não entregue gera aviso ao seller.
- O mesmo evento avisa o admin, porque é risco de disputa e de dinheiro parado.
- O aviso sai uma única vez por item, como os marcos existentes.
- O aviso diz qual pedido, qual produto e há quantos dias venceu.

**Edge cases:**
- Item entregue no próprio dia do vencimento → não gera aviso.
- Venda futura sem data prevista → não gera aviso, e aparece como pendência de cadastro para o admin *(premissa — confirme ou corrija)*.
- Pedido cancelado → não gera aviso.
- Itens vencidos de várias ofertas da mesma loja → agrupados num aviso por loja.

### US03: Fila de vendas futuras atrasadas no admin

Como administrador, quero ver todas as vendas futuras vencidas e não entregues, para cobrar o seller e decidir caso a caso.

**Rules:**
- A fila lista item, pedido, loja, comprador, data prevista e dias de atraso.
- Ordenada do atraso maior para o menor.
- Item entregue sai da fila.

**Edge cases:**
- Fila vazia → diz que não há atraso, sem parecer erro.
- Pedido cancelado com item vencido → não aparece na fila.

## 4. Fluxo de Negócio

```
Pagamento confirmado
   │
   ▼
Algum produto do pedido mudou para crítico ou esgotado?
   ├── não ──▶ nada
   └── sim ──▶ Loja já bateu o teto de avisos do dia?
                  ├── sim ──▶ suprime (segue no resumo diário)
                  └── não ──▶ um aviso com a lista, por WhatsApp e e-mail

Venda futura: data prevista + 1 dia, item não entregue
   │
   ▼
Aviso ao seller + aviso ao admin ──▶ item entra na fila de atrasadas
   │
   └── (política de estorno: fora desta feature)
```

## 5. Critérios de Aceite

### 5a. Critérios de aceite da feature

| Critério | Razão de negócio | Como verificar (observável) |
|----------|------------------|-----------------------------|
| Venda que derruba produto abaixo do limiar gera aviso no mesmo fluxo do pagamento | O ciclo diário custa até 24h de vitrine vazia no item de giro | Pagar pedido que zera um produto e conferir o disparo |
| Produto que já estava crítico antes da venda não realerta | Realertar todo dia é o caminho para o seller silenciar o canal | Pagar segundo pedido do mesmo produto já crítico |
| Pedido que derruba N produtos gera um aviso, não N | Volume vira spam; foi a razão de agrupar o alerta diário | Pedido com 3 itens derrubando os 3 |
| Falha de WhatsApp ou e-mail não derruba a confirmação do pagamento | O pagamento já está registrado no Asaas: perder a confirmação é pior que perder o aviso | Simular falha no envio e conferir que o pedido segue pago |
| Limiar usado é o mesmo do painel do seller | Alerta que discorda do painel destrói a confiança nos dois | Produto com `quantidade_minima` declarada e outro sem |
| Venda futura vencida gera aviso ao seller e ao admin uma única vez | Sem cobrança, o pedido fica pendente para sempre | Oferta com data de ontem e item não entregue |
| Venda futura entregue no prazo não gera aviso de atraso | Cobrar quem cumpriu queima o canal | Item entregue no dia da previsão |
| A fila de atrasadas mostra os itens vencidos, ordenados por atraso | É o instrumento do admin para cobrar | Abrir a fila com itens vencidos |

### 5b. Métricas de sucesso

| Métrica | Baseline (fonte) | Meta | Prazo | Mín. aceitável | Responsável |
|---------|-------------------|------|-------|-----------------|-------------|
| Tempo entre esgotar e o seller saber | até 24h (varredura diária das 11h) | minutos | imediato na entrega | 1h | Dona |
| Vendas futuras vencidas sem tratamento | A levantar em produção | 0 sem aviso | 30 dias | — | Dona |
| Avisos imediatos por loja por dia | — | mediana até 2 | 30 dias | teto de 5 respeitado | Dona |

## 6. Milestones

### Milestone 1: Avisar na hora

**Por que é um marco:** o seller passa a saber que esgotou no minuto em que esgota, em vez de no dia seguinte. É a diferença entre repor hoje e perder o dia.

**Funcionalidades:** US01

**Checklist de aceite:**
- [ ] Venda que derruba abaixo do limiar gera aviso no fluxo do pagamento
- [ ] Produto já crítico antes da venda não realerta
- [ ] Pedido que derruba N produtos gera um aviso só
- [ ] Falha de envio não derruba a confirmação do pagamento
- [ ] O limiar é o mesmo do painel do seller

**Aprovador:** Dona

### Milestone 2: Cobrar a venda futura vencida

**Por que é um marco:** a venda futura deixa de ser uma promessa sem cobrança. Vencido passa a ter dono, aviso e fila.

**Funcionalidades:** US02, US03

**Checklist de aceite:**
- [ ] Vencida gera aviso ao seller e ao admin uma única vez
- [ ] Entregue no prazo não gera aviso
- [ ] A fila de atrasadas lista e ordena por dias de atraso

**Aprovador:** Dona

## 7. Riscos e Dependências

| Risco | Impacto | Mitigação | Status |
|-------|---------|-----------|--------|
| Fadiga de notificação: o seller já recebe pedido pago, ruptura diária e avisos de venda futura | Alto | Só alerta mudança de estado, um aviso por pedido, teto diário | Monitorando |
| WhatsApp depende de serviço externo e de número validado | Médio | E-mail em paralelo; falha nunca derruba o pagamento | Mitigado no desenho |
| Atraso de venda futura pode ser legítimo, e o aviso soar como acusação | Médio | Texto de cobrança amigável; comprador não é avisado nesta fase | Pendente |
| Pressão por estorno automático depois que a fila mostrar os atrasos | Alto | Decidir com dados, em PRD próprio; o dinheiro pode já ter sido repassado | Pendente |

**Dependências:**

| Dependência | Tipo | Status | Impacto se bloqueado |
|-------------|------|--------|----------------------|
| PRD 038, ruptura e alertas ao seller | Interna | Em produção | Reusa limiar, idempotência e o canal de e-mail |
| Serviço de WhatsApp (Bubblewhats) | Externa | Em produção | Sem ele o aviso sai só por e-mail |
| Decisão da dona sobre teto diário e política de atraso | Interna | Pendente | Ajuste de parâmetro, não bloqueia a entrega |

## 8. Referências

- [PRD 038, ruptura de estoque e alertas ao seller](038-ruptura-de-estoque-e-alertas-ao-seller.md) — esta feature é a continuação dele
- `src/lib/seller/estoque-estado.ts` — limiar único de crítico, reusado aqui
- `src/lib/asaas-confirmar.ts` — ponto onde o pagamento confirma e os avisos já saem
- `src/lib/venda-futura/avisos.ts` — marcos de véspera e do dia, onde entra o vencido

## 9. Registro de Decisões

- **2026-09-23:** Gatilho é a confirmação do pagamento, não o checkout. Motivo: com PIX e boleto, pedido criado ainda não é venda.
- **2026-09-23:** Reusar `estadoEstoque()` e `quantidade_minima` em vez de criar limiar. Motivo: alerta que discorda do painel destrói a confiança nos dois.
- **2026-09-23:** Só alertar mudança de estado, um aviso por pedido, com teto diário. Motivo: o seller já recebe três tipos de aviso; volume vira silenciamento.
- **2026-09-23:** Venda futura vencida avisa seller e admin, não o comprador. Motivo: avisar antes de alguém poder responder cria disputa que a renegociação resolveria.
- **2026-09-23:** Estorno automático fora do escopo. Motivo: não existe devolução de pagamento no sistema, o comprador é empresa, o atraso costuma ser renegociável e o dinheiro pode já ter sido repassado.
- **2026-09-23:** Escopo enxuto porque o levantamento mostrou que aviso ao seller na venda, aviso ao comprador e lembretes de venda futura **já existiam**. Motivo: o pedido original supunha que nada disso existia.
