---
prd_number: "011"
status: rascunho
priority: média
created: 2026-08-10
issue: ""
depends_on: ["009"]
references:
  - "https://myaccount.mercadolivre.com.br/my_purchases/list — referência de UX: lista de compras com CTA 'Opinar' quando o produto está liberado para avaliação"
  - "src/app/pedido/[id]/page.tsx — página de detalhe do pedido, ponto de entrada para o CTA de avaliação"
  - "src/app/(seller)/seller/reputacao/page.tsx — painel de reputação operacional da loja (cancelamento, reclamação, envio incorreto); indicador interno, não é o mesmo dado desta feature"
  - "docs/prd/009-pos-venda-disputas.md — infraestrutura de 'Meus Pedidos' e conceito de entrega confirmada reaproveitados"
  - "docs/prd/programa-confianca-inicial-vendedor.md — rascunho que usa a reputação operacional de seller/reputacao/page.tsx para badge de confiança; não modela nota pública de avaliação de comprador, mas é candidato a exibir a nota desta feature futuramente"
  - "supabase/migrations — corrida_avaliacoes (tabela de avaliação já existente no domínio de corridas/afiliado logístico) — padrão de schema de avaliação já usado no projeto, referência de convenção"
---

# PRD 011: Avaliação e Reputação de Loja Pós-Entrega

## 1. Contexto

- **Produto/área**: Indústria 24h (industria24.com.br) — marketplace B2B multiloja. Módulo novo de avaliação pública, acessível pelo comprador a partir de um pedido entregue.
- **Estado atual**: o único sinal de reputação de loja hoje é operacional e interno — `seller/reputacao/page.tsx` calcula % de cancelamento, reclamação e envio incorreto sobre os próprios pedidos da loja, mas isso não é visível ao comprador na vitrine nem alimentado por opinião dele. Não existe nenhuma forma do comprador dar nota ou comentário público sobre produto ou loja depois de receber o pedido.
- **Problema**: sem avaliação pública, o comprador que nunca comprou de uma loja não tem sinal de confiança de terceiros antes de decidir a compra — só o próprio anúncio do vendedor. Isso é a lacuna clássica de cold-start de confiança em marketplace, e é o dado que falta hoje na vitrine e na página de loja/produto do Industria24h.

> **Contexto técnico** (stack, RLS, modelo de dados) vive no TRD e no PLAN de implementação. Aqui só um ponteiro: a feature deve seguir o mesmo padrão de tabela de avaliação já usado no domínio de corridas (`corrida_avaliacoes`) e o padrão de moderação de conteúdo público já usado em `admin/produtos`.

## 2. Solução Proposta

### Visão de produto

- Comprador com pedido entregue vê, em "Meus Pedidos" e na página do pedido, um convite para avaliar — nota de 1 a 5 estrelas + comentário opcional, separado para o **produto** e para a **loja**.
- Nota e comentário viram públicos imediatamente (sem moderação prévia bloqueante) e passam a compor a reputação exibida na página do produto e na página da loja.
- Loja pode responder publicamente a uma avaliação recebida, uma única resposta por avaliação, para contextualizar ou agradecer.
- Admin pode remover avaliação (própria fila de moderação, reaproveitando o padrão de `ModerarStatusProduto.tsx`) em caso de conteúdo ofensivo, spam ou fora do escopo de uma compra real.
- A nota de avaliação de comprador é um dado **novo e distinto** do painel operacional de `seller/reputacao` — este PRD não altera nem substitui aquele indicador; os dois podem, no futuro, ser combinados numa exibição única de confiança (fora de escopo aqui).

### Decisões de produto

1. Avaliação só pode ser feita após entrega confirmada do pedido — mesmo evento que hoje libera a janela de disputa (código de retirada/entrega validado, PRD 009). *(premissa — confirme se o evento certo é a confirmação de entrega ou o pagamento realizado)*
2. Janela para avaliar: **30 dias corridos** após a entrega confirmada — depois disso o CTA some. *(premissa — valor a confirmar com o dono do produto)*
3. Uma avaliação por item comprado (não por loja de forma solta) — compra repetida do mesmo produto na mesma loja permite nova avaliação a cada pedido novo.
4. Nota é pública e imediata; não há fila de aprovação antes de publicar, só moderação reativa pós-publicação (denúncia ou revisão do admin), para não atrasar o valor do dado para outros compradores.
5. Comprador pode editar sua nota/comentário dentro da mesma janela de 30 dias; loja recebe apenas a versão final (edições não notificam a loja repetidamente). *(premissa)*
6. Loja responde a avaliação uma única vez, sem editar depois de publicado *(premissa — evita disputa via edição retroativa da resposta)*.
7. Reputação agregada da loja (nota média + contagem de avaliações) é exibida na página da loja e nos cards de produto na vitrine — não bloqueia nem restringe operação da loja (diferente do papel do painel operacional em `seller/reputacao`, que já tem essa função).

> Nenhuma decisão arquitetural durável identificada neste PRD (reaproveita padrões de tabela de avaliação e moderação já estabelecidos no repo). Se a implementação exigir um mecanismo novo (ex.: agregação de nota em cache/materialized view por volume), registrar como ADR separado.

### Fora do escopo

- Combinar a nota pública de comprador com o indicador operacional de `seller/reputacao` numa única métrica ou badge — cada um segue como dado independente até decisão de produto futura.
- Avaliação de afiliado logístico/entregador — já coberta por `corrida_avaliacoes`, domínio distinto.
- Moderação por IA automática de conteúdo ofensivo — moderação nesta v1 é manual pelo admin, reagindo a denúncia. *(premissa — confirme ou corrija)*
- Sistema de denúncia de avaliação pelo público (botão "denunciar") — nesta v1 a remoção depende de o admin encontrar/ser avisado por outro canal; fila de denúncia fica para PRD futuro se o volume justificar. *(premissa — confirme ou corrija)*
- Incentivo/gamificação para aumentar taxa de avaliação (cupom, lembrete por e-mail) — fora do escopo desta v1, que cobre só o mecanismo de avaliar e exibir.
- Avaliação de pedidos de venda futura/compra coletiva com ciclo de entrega próprio — este PRD cobre o fluxo padrão de pedido; casos desses modelos ficam de fora até PRD dedicado. *(premissa — confirme ou corrija)*

## 3. Funcionalidades

### US01: Comprador avaliar produto e loja após entrega

Como comprador, quero avaliar o produto e a loja depois de receber meu pedido, para registrar minha experiência e ajudar outros compradores a decidir.

**Rules:**
- CTA "Avaliar compra" aparece em cada item elegível na lista "Meus Pedidos" e na página de detalhe do pedido, só quando a entrega foi confirmada e dentro da janela de 30 dias (§2 decisão 2).
- Formulário pede nota de 1 a 5 estrelas (obrigatória) e comentário (opcional) para o produto, e nota + comentário (ambos opcionais, mas se preencher nota é obrigatória) para a loja — dois blocos numa única tela.
- Ao salvar, avaliação fica pública imediatamente na página do produto e da loja.
- Comprador pode voltar e editar sua avaliação enquanto a janela de 30 dias não fechar.

**Edge cases:**
- Comprador tenta avaliar pedido ainda não entregue → CTA não aparece; se acessar rota direta, bloqueado com mensagem explicando que precisa aguardar a entrega.
- Comprador tenta avaliar fora da janela de 30 dias → CTA some; rota direta bloqueada com mensagem de prazo expirado.
- Comprador tenta avaliar o mesmo item duas vezes → segunda tentativa abre a avaliação existente em modo edição, não cria duplicata.
- Pedido cancelado ou reembolsado antes da entrega → CTA de avaliação nunca aparece para esse item.

### US02: Loja responder publicamente a uma avaliação

Como loja (seller), quero responder publicamente a uma avaliação recebida, para contextualizar um problema ou agradecer o feedback.

**Rules:**
- Loja vê, no painel seller, a lista de avaliações recebidas (produto e loja) com opção de responder.
- Resposta é pública, aparece junto à avaliação original, limitada a uma resposta por avaliação.
- Loja não pode editar nem apagar a nota/comentário do comprador, só adicionar sua própria resposta.

**Edge cases:**
- Loja tenta responder duas vezes à mesma avaliação → segunda tentativa bloqueada; precisa editar a resposta existente (se edição for permitida) ou não pode responder de novo. *(premissa — decidir se resposta é editável; assumido que sim, dentro de 7 dias da publicação, para corrigir erro de digitação)*
- Avaliação removida pelo admin após a loja já ter respondido → resposta some junto com a avaliação.

### US03: Visitante ver reputação da loja e do produto na vitrine

Como visitante/comprador em decisão de compra, quero ver a nota média e os comentários de outros compradores na página do produto e da loja, para decidir com mais confiança.

**Rules:**
- Página do produto exibe nota média do produto (estrelas + contagem) e lista de comentários mais recentes.
- Página da loja exibe nota média da loja (estrelas + contagem), separada da nota de produto.
- Card de produto na busca/vitrine exibe a nota média resumida (estrelas + contagem), quando existir pelo menos 1 avaliação. *(premissa — confirme se o card de listagem também deve exibir, ou só a página de detalhe)*
- Produto/loja sem nenhuma avaliação ainda não exibe nota (nem "0 estrelas") — mostra estado neutro, sem penalizar visualmente quem ainda não tem histórico.

**Edge cases:**
- Loja nova, sem nenhuma avaliação → nenhuma seção de nota aparece, sem mensagem de "sem avaliações" que soe negativa.
- Produto com avaliações mas todas de nota 1 (muito negativas) → exibidas normalmente, sem filtro ou ocultação — nota real é o objetivo.

### US04: Admin remover avaliação inadequada

Como admin, quero remover uma avaliação que viole as regras da plataforma (spam, ofensiva, sem relação com compra real), para manter a confiabilidade do sistema de reputação.

**Rules:**
- Admin acessa fila/lista de avaliações (reaproveitando o padrão de moderação de `admin/produtos`), pode filtrar por loja ou produto.
- Ao remover, avaliação some da exibição pública imediatamente; ação é registrada com admin responsável e motivo. *(premissa — motivo obrigatório, texto livre)*
- Remoção recalcula a nota média da loja/produto automaticamente.

**Edge cases:**
- Admin remove avaliação já respondida pela loja → resposta é removida junto (US02 edge case).
- Comprador cuja avaliação foi removida tenta recriar a mesma avaliação para o mesmo item → permitido recriar (não há bloqueio permanente); moderação é reativa, não é banimento do comprador. *(premissa — confirme ou corrija; alternativa seria bloquear nova avaliação do mesmo comprador para aquele item)*

## 4. Fluxo de Negócio

```
Pedido tem entrega confirmada
   │
   ▼
Dentro da janela de 30 dias?
   ├── não ──▶ CTA de avaliação não aparece (nunca mais para este item)
   └── sim ──▶ Comprador avalia produto + loja (nota + comentário opcional)
                          │
                          ▼
              Avaliação publicada imediatamente
                          │
              ┌───────────┴────────────┐
              ▼                        ▼
      Loja pode responder      Nota entra na média pública
      (uma vez, público)       exibida em produto/loja/vitrine
                          │
                          ▼
              Admin encontra conteúdo inadequado?
                    ├── não ──▶ permanece pública
                    └── sim ──▶ remove (com motivo) ──▶ média recalculada
```

## 5. Critérios de Aceite

### 5a. Critérios de aceite da feature

| Critério | Razão de negócio | Como verificar (observável) |
|----------|------------------|-----------------------------|
| CTA de avaliação só aparece para item com entrega confirmada | Avaliação sem recebimento real do produto não tem valor de sinal de confiança e pode ser manipulada | Tentar avaliar pedido não entregue via rota direta e confirmar bloqueio |
| Comprador não consegue criar duas avaliações para o mesmo item | Duplicata infla artificialmente a nota média | Tentar avaliar o mesmo item duas vezes e confirmar que a segunda abre edição, não cria nova linha |
| Nota média exibida reflete corretamente a remoção de uma avaliação em até alguns segundos | Nota desatualizada após remoção prejudica a confiabilidade do dado | Remover avaliação como admin e conferir recálculo imediato na página do produto/loja |
| Loja não consegue editar ou apagar a nota/comentário do comprador | Integridade da avaliação — é a garantia de que a nota é do comprador, não filtrada pela loja | Tentar, como seller, alterar o texto/nota de uma avaliação recebida e confirmar bloqueio |

### 5b. Métricas de sucesso

| Métrica | Baseline (fonte) | Meta | Prazo | Mín. aceitável | Responsável |
|---------|-------------------|------|-------|-----------------|-------------|
| % de pedidos entregues que recebem avaliação dentro da janela de 30 dias | 0% (feature não existe hoje) | 25% | 90 dias após lançamento | 10% | Time de produto |
| % de lojas ativas com pelo menos 1 avaliação pública | 0% (feature não existe hoje) | 40% | 90 dias após lançamento | 20% | Time de produto |

## 6. Milestones

### Milestone 1: Comprador avalia, avaliação aparece publicamente

**Por que é um marco:** primeira vez que existe um sinal de confiança gerado por comprador real e visível a outros compradores antes da decisão de compra — fecha a lacuna de cold-start de confiança que hoje só existe como indicador interno da loja.

**Funcionalidades:** US01, US03

**Checklist de aceite** (marcado pelo Aprovador após a implementação):
- [ ] CTA de avaliação só aparece para item com entrega confirmada e dentro da janela de 30 dias
- [ ] Comprador não consegue criar duas avaliações para o mesmo item
- [ ] Nota média e comentários aparecem corretamente na página do produto e da loja
- [ ] Produto/loja sem avaliação não exibe nota nem mensagem negativa

**Aprovador:** Dono do produto (Indústria24h)

### Milestone 2: Loja responde e admin modera

**Por que é um marco:** fecha o ciclo — loja ganha voz para contextualizar avaliação recebida, e a plataforma ganha mecanismo de remoção para manter a confiabilidade do dado público.

**Funcionalidades:** US02, US04

**Checklist de aceite** (marcado pelo Aprovador após a implementação):
- [ ] Loja consegue responder publicamente a uma avaliação, uma única vez
- [ ] Loja não consegue editar ou apagar a nota/comentário do comprador
- [ ] Admin remove avaliação inadequada e a nota média é recalculada automaticamente
- [ ] Remoção de avaliação registra admin responsável e motivo

**Aprovador:** Dono do produto (Indústria24h)

## 7. Riscos e Dependências

| Risco | Impacto | Mitigação | Status |
|-------|---------|-----------|--------|
| Baixa taxa de avaliação (comprador não volta para avaliar) esvazia o valor do sinal de confiança | Alto | Lembrete/incentivo fica para PRD futuro (fora de escopo aqui); monitorar métrica de §5b desde o lançamento | Pendente |
| Avaliação manipulada (loja pede avaliação falsa para si mesma ou concorrente avalia mal sem ter comprado) | Médio | Vínculo obrigatório a pedido real com entrega confirmada (US01) já mitiga a maior parte; moderação admin (US04) cobre o restante | Mitigado por design |
| Coexistência de dois sinais de reputação (operacional interno + nota pública desta feature) confunde comprador ou loja sobre qual é a "reputação oficial" | Médio | Nomear claramente os dois na UI ("Reputação operacional" vs "Avaliações de clientes"); unificação fica para decisão de produto futura | Pendente |

**Dependências:**

| Dependência | Tipo | Status | Impacto se bloqueado |
|-------------|------|--------|----------------------|
| "Meus Pedidos" e conceito de entrega confirmada (PRD 009, US00) | Interna | Em produção | Sem lista de pedidos e evento de entrega confirmada, não há onde ancorar o CTA de avaliação nem como validar elegibilidade |
| Padrão de fila de moderação (`admin/produtos`, `ModerarStatusProduto.tsx`) | Interna | Em produção | US04 precisaria criar um padrão de moderação novo em vez de reaproveitar o existente |

## 8. Referências

- [Mercado Livre — Minhas Compras](https://myaccount.mercadolivre.com.br/my_purchases/list) — referência de UX: lista de compras com CTA "Opinar" quando o produto está liberado para avaliação.
- `src/app/pedido/[id]/page.tsx` — página de detalhe do pedido, ponto de entrada natural para o CTA de avaliação.
- `src/app/(seller)/seller/reputacao/page.tsx` — painel de reputação operacional já existente; dado distinto do desta feature, mas mesmo domínio de "confiança da loja".
- `docs/prd/009-pos-venda-disputas.md` — infraestrutura de "Meus Pedidos" e conceito de entrega confirmada reaproveitados.
- `docs/prd/programa-confianca-inicial-vendedor.md` — rascunho relacionado que usa a reputação operacional para badge de confiança; candidato natural a, no futuro, incorporar a nota pública desta feature.
- Tabela `corrida_avaliacoes` (domínio de corridas/afiliado logístico) — padrão de schema de avaliação já usado no projeto, referência de convenção para a implementação técnica.

## 9. Registro de Decisões

- **2026-08-10:** PRD criado a partir de comparação direta com a UX de "Minhas Compras" do Mercado Livre (`myaccount.mercadolivre.com.br/my_purchases/list`), que expõe avaliação pós-entrega como CTA "Opinar" — funcionalidade que não existe hoje no Industria24h.
- **2026-08-10:** Escopo deliberadamente separado de dois outros itens levantados na mesma análise: (1) filtros de categoria/data na listagem "Meus Pedidos" — feature de navegação independente, vira PRD próprio se confirmado; (2) unificação com o painel operacional `seller/reputacao` — mantido como dado paralelo nesta v1, decisão de unificar fica para o dono do produto avaliar depois que a nota pública tiver volume real.
- **2026-08-10:** `depends_on: ["009"]` registrado porque o CTA de avaliação depende diretamente da lista "Meus Pedidos" e do conceito de entrega confirmada já especificados naquele PRD — sem eles não há onde ancorar a elegibilidade do item para avaliação.
