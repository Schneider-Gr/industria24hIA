---
prd_number: "053"
status: pronto
priority: alta
created: 2026-09-24
issue: ""
depends_on: ["008", "049", "052", "048"]
references:
  - "supabase/migrations/0079_logistica_afiliado_produto.sql" – flag permite_logistica_afiliado por produto e percurso na corrida
  - "supabase/migrations/0102_corrida_revisao_afiliado.sql" – versão atual de despachar_corrida_automatica (exclusividade de 5 min, pool)
  - "supabase/migrations/0139_uber_direct_transportadora.sql" – cotação externa gravada com validade (cotacoes_frete_externo)
  - "supabase/migrations/0140_checkout_cotacao_uber_direct.sql" – pedido confere a cotação gravada em vez de recalcular
  - "supabase/migrations/0083_comissao_plataforma_corrida.sql" – comissão da plataforma sobre corrida de parceiro/afiliado
  - "src/lib/geo.ts" – calcularTrajeto (Google Routes API), teto diário de consultas
  - "src/lib/asaas-confirmar.ts" – despacho da corrida na confirmação de pagamento
  - "docs/prds/049-frete-por-tabela-da-transportadora-do-seller.md" – ordem das fontes de frete (decisão 14) e CD como origem
  - "docs/prds/052-frete-no-repasse-do-seller.md" – frete de corrida de afiliado mantém a regra atual
  - "https://github.com/Schneider-Gr/industria24hIA/pull/748" – PRD 048, devolução de dinheiro ao comprador (aberto)
  - "https://github.com/Schneider-Gr/industria24hIA/pull/766" – simulador de preço por km no painel do seller
---

# PRD 053: Entrega por km do afiliado logístico, com valor por km definido pelo seller

## 1. Contexto

- **Produto/área**: logística do marketplace (Manaus). Afiliado logístico = motorista ou transportador aprovado por uma loja para entregar os produtos dela.
- **Estado atual** (verificado em 24/09/2026):
  - No app novo o seller só liga ou desliga "permite logística por afiliado" em cada produto (0079). Não existe valor.
  - Quando o pagamento é confirmado, a corrida é criada e aparece para o motorista na hora: 5 min de exclusividade para o afiliado da loja, depois o pool geral. A distância e a duração vêm do Google e ficam gravadas na corrida. O valor que o motorista vê (`valor_parceiro`) vem do frete do pedido, não da distância.
  - Nada encerra uma corrida que ninguém aceita: ela fica no pool para sempre, com o pedido pago.
  - No Bubble legado, o botão "avião" da lista de produtos ("Ativar ou desativar afiliado entregas") abre o popup "Parceiro de entrega" com um valor em R$. A lista do afiliado mostra esse número como "Valor por Km" e o modal do afiliado o chama de "% sobre o valor da venda". A unidade nunca foi definida.
- **Problema**: o consumidor não tem a opção de entrega local por motorista parceiro com preço justo pela distância, e o motorista recebe um valor que não tem relação com o quanto vai rodar. Sem unidade clara, o seller não sabe o que está cobrando.

> **Contexto técnico** no TRD. Pontos relevantes: a distância usa a mesma função de trajeto do despacho; o padrão de cotação gravada com validade já existe para o Uber Direct.

## 2. Solução Proposta

### Visão de produto

- O seller define, por produto, quanto o consumidor paga por km de entrega feita por afiliado logístico, num botão "avião" na lista de produtos, como no Bubble.
- No checkout, o consumidor vê "Entrega por parceiro local" com preço e prazo, ao lado das outras opções de frete, e escolhe.
- O preço fica fechado antes do pagamento e é exatamente o que o motorista vê na corrida.
- Se nenhum motorista aceitar a tempo, o consumidor recebe de volta o valor da entrega e o pedido vira retirada.

### Decisões de produto

1. Unidade: **R$ por km** rodado. Encerra a ambiguidade R$ / % / km do Bubble (decisão da dona, 24/09).
2. Quem define: **o seller, por produto** (decisão da dona, 24/09).
3. Onde configura: **popup no botão avião** da lista de produtos, com liga/desliga e R$/km, mostrando o valor atual (decisão da dona, 24/09).
4. Quem paga: **o consumidor, no checkout** (decisão da dona, 24/09).
5. **Não cobra ida e volta**: km cobrados = km da ida (decisão da dona, 24/09).
6. A opção aparece **junto com as outras opções de frete** e o consumidor escolhe. Não entra na cadeia de reserva da decisão 14 do PRD 049; é uma opção paralela (decisão da dona, 24/09).
7. Ninguém aceitou a corrida em **60 minutos** após o pagamento → o valor da entrega volta ao consumidor e o pedido vira retirada (decisão da dona, 24/09).
8. Distância: rota de carro do CD de onde o pedido sai até o endereço do comprador (confirmado pela dona, 24/09).
9. Carrinho com produtos de R$/km diferentes da mesma loja: usa o **maior R$/km** entre os itens. É uma viagem só; somar cobraria a mesma estrada várias vezes (confirmado pela dona, 24/09).
10. Preço fechado: a cotação é gravada com validade, como no Uber Direct; o pedido usa a cotação gravada e não recalcula (confirmado pela dona, 24/09).
11. O valor cotado vira o `preco_final` da corrida; o motorista recebe o `valor_parceiro`, que é o `preco_final` menos a comissão da plataforma da regra atual (0083, hoje 10%), conforme o PRD 052 (confirmado pela dona, 24/09).
12. A opção só aparece quando a loja tem ao menos um afiliado logístico aprovado **e** todos os itens com entrega estão com o avião ligado (confirmado pela dona, 24/09).
13. Existe um **piso por km por loja**, definido pela plataforma; o seller não salva R$/km abaixo do piso da sua loja. Valor padrão: **R$ 6,00 por km** (decisão da dona, 24/09).
14. Prazo exibido: duração da rota somada à janela de aceite (confirmado pela dona, 24/09).

### Fora do escopo

- Preço por veículo, peso ou volume: o valor é só por km. O afiliado já informa veículo e peso suportado no cadastro, mas isso não entra no preço *(premissa aceita pela dona em 24/09)*.
- Adicional noturno, taxa de parada ou pedágio *(premissa aceita pela dona em 24/09)*.
- Corrida com coleta em mais de uma loja: carrinho com várias lojas gera uma cotação e uma corrida por loja *(premissa aceita pela dona em 24/09)*.
- Migrar os valores do Bubble: a unidade de lá não é confiável; o seller configura de novo *(premissa aceita pela dona em 24/09)*.
- Mudar a regra de exclusividade de 5 min e o pool.
- A devolução em si: pertence ao PRD 048; aqui só se define quando ela é disparada.

## 3. Funcionalidades

### US01: Configurar a entrega por km no botão avião

Como seller, quero ligar a entrega por afiliado logístico e definir o R$/km de cada produto num botão da lista de produtos, para decidir quanto o consumidor paga pela entrega local.

**Rules:**
- Cada produto da lista tem o botão avião: aceso quando a entrega por km está ligada, apagado quando desligada.
- O popup mostra o nome do produto, o R$/km atual e um campo para o novo valor, com as ações "Salvar", "Desligar" e "Sair".
- Ligar exige R$/km maior ou igual ao piso da plataforma.
- O popup mostra uma prévia: "uma entrega de 10 km sai R$ X" *(premissa aceita pela dona em 24/09)*.
- Desligar mantém o último R$/km guardado, para religar sem digitar de novo *(premissa aceita pela dona em 24/09)*.

**Edge cases:**
- Valor abaixo do piso → não salva; a mensagem mostra o piso.
- Valor vazio, zero ou negativo → não salva.
- Produto sem entrega (só retirada) → botão desabilitado, com a explicação *(premissa aceita pela dona em 24/09)*.
- A loja não tem afiliado logístico aprovado → salva, mas avisa que a opção só aparece no checkout depois que houver afiliado aprovado *(premissa aceita pela dona em 24/09)*.
- Produto já ligado pela flag antiga (0079) e sem R$/km → aparece desligado até o seller informar o valor *(premissa aceita pela dona em 24/09)*.

### US02: Cotar a entrega por km no checkout

Como consumidor, quero ver o preço e o prazo da entrega por parceiro local ao lado das outras opções, para escolher a que me serve.

**Rules:**
- Preço = km da rota de carro do CD até o meu endereço × maior R$/km dos itens da loja, arredondado em centavos. Sem ida e volta.
- Aparece junto com as demais opções de frete (transportadoras, Uber Direct, percentual, a combinar), com o rótulo "Entrega por parceiro local", o preço e o prazo.
- Prazo = duração da rota + janela de aceite de até 60 min.
- Só aparece quando a loja tem afiliado logístico aprovado e todos os itens com entrega estão com o avião ligado.
- A cotação fica gravada com validade; ao expirar, o checkout recota antes de pagar.

**Edge cases:**
- O Google não encontra rota ou está indisponível → a opção não aparece; as demais continuam *(premissa aceita pela dona em 24/09)*.
- Teto diário de consultas ao Google atingido → a opção não aparece nesse dia.
- Endereço do comprador incompleto → a opção pede o endereço antes de cotar.
- Um item do carrinho com o avião desligado → a opção não aparece para aquela loja.
- Carrinho com mais de uma loja → uma opção por loja, cada uma com a sua rota *(premissa aceita pela dona em 24/09)*.
- O seller muda o R$/km depois da cotação e antes do pagamento → vale a cotação gravada até expirar.

### US03: Pedido pago cria a corrida com o valor cotado

Como afiliado logístico, quero ver na corrida o valor que o consumidor pagou pela entrega, para decidir se aceito sabendo quanto vou receber.

**Rules:**
- O pedido usa o valor da cotação gravada, nunca um valor recalculado ou enviado pelo navegador.
- A corrida nasce com `preco_final` = valor cotado; o `valor_parceiro` que o motorista vê é esse valor menos a comissão da plataforma (0083, hoje 10%).
- A corrida mostra km, tempo estimado e link da rota, como hoje.
- A exclusividade de 5 min para o afiliado da loja e o pool geral continuam iguais.

**Edge cases:**
- Cotação expirada na hora de fechar o pedido → o pedido não é criado; o checkout recota e pede nova confirmação.
- Cotação de outro comprador, CEP ou carrinho → o pedido é recusado.
- Dois pagamentos confirmados para o mesmo pedido (webhook repetido) → uma corrida só, como hoje.

### US04: Devolver o valor da entrega quando ninguém aceita

Como consumidor, quero receber de volta o valor da entrega se nenhum motorista aceitar, para não pagar por um serviço que não aconteceu.

**Rules:**
- Se a corrida não for aceita em 60 minutos após a confirmação do pagamento, ela é encerrada sem motorista.
- O valor da entrega volta ao consumidor pela regra do PRD 048; o valor dos produtos não muda.
- O pedido passa a ser retirada na loja ou no CD, e consumidor e seller são avisados com o endereço de retirada.
- O prazo de 60 minutos vale só para a entrega por km *(premissa aceita pela dona em 24/09)*.

**Edge cases:**
- Motorista aceita aos 59 minutos → vale o aceite; nada é devolvido.
- Motorista tenta aceitar depois do encerramento → recusado, com mensagem.
- A devolução automática ainda não existe (PRD 048 aberto) → o encerramento acontece mesmo assim e a devolução entra numa fila manual do admin *(premissa aceita pela dona em 24/09)*.
- Consumidor não pode ou não quer retirar → segue o fluxo de cancelamento e devolução do PRD 048 *(premissa aceita pela dona em 24/09)*.

### US05: Definir o piso por km de cada loja

Como admin, quero definir o valor mínimo por km de cada loja, para impedir preços que nenhum motorista aceita.

**Rules:**
- Cada loja tem o seu piso por km; loja sem piso próprio usa o padrão de R$ 6,00 (decisão da dona, 24/09).
- Só o admin altera o piso de uma loja; o seller vê o piso da sua loja no popup do avião *(premissa aceita pela dona em 24/09)*.
- Mudar o piso não altera produtos já configurados abaixo dele; esses produtos saem do checkout até o seller corrigir, e o seller recebe aviso *(premissa aceita pela dona em 24/09)*.

**Edge cases:**
- Loja sem piso próprio → vale o padrão de R$ 6,00.
- Piso vazio ou negativo → não salva.

## 4. Fluxo de Negócio

```
Seller liga o avião e informa R$/km (>= piso)
   │
   ▼
Checkout: loja tem afiliado aprovado e todos os itens com avião ligado?
   ├── não ──▶ opção não aparece
   └── sim ──▶ rota CD → comprador ok?
                 ├── não ──▶ opção não aparece
                 └── sim ──▶ "Entrega por parceiro local: R$ km × maior R$/km" (cotação gravada)
                                │ consumidor escolhe e paga
                                ▼
                     Corrida criada com preco_final = valor cotado (5 min exclusivo → pool)
                                │
                     Aceita em até 60 min?
                        ├── sim ──▶ coleta → entrega (fluxo atual)
                        └── não ──▶ corrida encerrada → devolve o valor da entrega (PRD 048)
                                    → pedido vira retirada → avisa consumidor e seller
```

## 5. Critérios de Aceite

### 5a. Critérios de aceite da feature

| Critério | Razão de negócio | Como verificar (observável) |
|----------|------------------|-----------------------------|
| O seller liga o avião, informa R$/km e o valor aparece no popup ao reabrir | Paridade com o Bubble e valor visível | Ligar num produto, reabrir o popup |
| Valor abaixo do piso não é salvo | Preço que nenhum motorista aceita trava o pedido | Tentar salvar abaixo do piso |
| No checkout, a opção mostra preço = km × maior R$/km, sem ida e volta | Regra de preço decidida | Carrinho com 2 produtos de R$/km diferentes; conferir com a distância da rota |
| O valor pago no pedido é igual ao da cotação exibida | Consumidor não pode pagar diferente do que viu | Pagar e comparar pedido × cotação |
| A corrida mostra ao motorista o valor cotado menos a comissão 0083 | O motorista decide pelo valor real | Abrir a corrida no painel do afiliado |
| Sem afiliado aprovado ou com item de avião desligado, a opção não aparece | Não vender entrega que ninguém pode fazer | Checkout nas duas situações |
| Corrida não aceita em 60 min é encerrada, o pedido vira retirada e os dois lados são avisados | Consumidor não fica pago e sem entrega | Pedido de teste sem aceite; conferir após 60 min |
| Falha do Google não quebra o checkout | As outras opções continuam vendendo | Simular indisponibilidade; as demais opções aparecem |

### 5b. Métricas de sucesso

| Métrica | Baseline (fonte) | Meta | Prazo | Mín. aceitável | Responsável |
|---------|-------------------|------|-------|-----------------|-------------|
| Corridas por km aceitas em até 60 min | A levantar (hoje não há corrida por km) | 80% | 60 dias após o deploy | 60% | Dona |
| Pedidos com entrega por km devolvidos por falta de aceite | A levantar | < 10% | 60 dias após o deploy | 20% | Dona |
| Produtos com avião ligado nas lojas com afiliado aprovado | 0 (feature nova) | 50% | 30 dias após o deploy | 20% | Dona |

## 6. Milestones

### Milestone 1: Seller precifica a entrega local

**Por que é um marco:** o seller passa a ter preço por km com unidade clara, no mesmo lugar que usava no Bubble.

**Funcionalidades:** US01, US05

**Checklist de aceite:**
- [ ] O seller liga o avião, informa R$/km e o valor aparece no popup ao reabrir
- [ ] Valor abaixo do piso não é salvo
- [ ] Loja sem piso próprio usa R$ 6,00/km; o admin altera o piso de uma loja e ele passa a valer no popup do seller

**Aprovador:** Dona

### Milestone 2: Consumidor compra com entrega por parceiro local

**Por que é um marco:** a entrega local por km passa a ser vendida no checkout e o motorista recebe o valor que o consumidor pagou.

**Funcionalidades:** US02, US03

**Checklist de aceite:**
- [ ] No checkout, a opção mostra preço = km × maior R$/km, sem ida e volta
- [ ] O valor pago no pedido é igual ao da cotação exibida
- [ ] A corrida mostra ao motorista o valor cotado menos a comissão 0083
- [ ] Sem afiliado aprovado ou com item de avião desligado, a opção não aparece
- [ ] Falha do Google não quebra o checkout

**Aprovador:** Dona

### Milestone 3: Entrega sem motorista não fica paga

**Por que é um marco:** o consumidor recebe de volta o que pagou pela entrega que não aconteceu.

**Funcionalidades:** US04

**Checklist de aceite:**
- [ ] Corrida não aceita em 60 min é encerrada, o pedido vira retirada e os dois lados são avisados

**Aprovador:** Dona

## 7. Riscos e Dependências

| Risco | Impacto | Mitigação | Status |
|-------|---------|-----------|--------|
| Consumidor paga e nenhum motorista aceita | Alto | Opção só com afiliado aprovado; prazo de 60 min com devolução (US04) | Mitigado no desenho |
| Custo do Google cresce com cotações no checkout | Médio | Cotação gravada com validade; teto diário já existente | Monitorando |
| Seller põe R$/km irreal (o Bubble tem R$ 0,04) | Médio | Piso por loja, padrão R$ 6,00 (US05) | Mitigado |
| Piso de R$ 6,00/km deixa a entrega cara (10 km = R$ 60) e o consumidor não escolhe | Médio | Piso ajustável por loja; acompanhar a métrica de adoção | Monitorando |
| Opção paralela contradiz a cadeia de fontes do PRD 049 | Baixo | Adendo à decisão 14 do 049 registrando a opção paralela | Pendente |
| Devolução automática não existe ainda | Alto | Milestone 3 depende do PRD 048; até lá, fila manual | Pendente |

**Dependências:**

| Dependência | Tipo | Status | Impacto se bloqueado |
|-------------|------|--------|----------------------|
| PRD 048 (devolução ao comprador) | Interna | PR #748 aberto | Milestone 3 vira devolução manual |
| PRD 049 (CD como origem, ordem das fontes) | Interna | pronto | Milestone 2 sem origem por CD usa o CEP da loja |
| Simulador de km (PR #766) | Interna | aberto | Prévia do popup (US01) usa o mesmo cálculo; tirar "ida e volta" |

## 8. Referências

- Migrations 0079, 0102, 0139, 0140, 0083 (ver frontmatter): flag por produto, despacho, cotação gravada, comissão.
- `src/lib/geo.ts`: cálculo de trajeto e teto diário de consultas.
- PRDs 008, 048, 049, 052.
- PR #766: simulador de preço por km.

## 9. Registro de Decisões

- **2026-09-24:** Engenharia reversa do Bubble (`industria24h.com.br/seller`, botão avião, e `/afiliadologistica`): o mesmo número aparece como R$, "Valor por Km" e "%". Decidido R$ por km, definido pelo seller por produto, no popup do avião.
- **2026-09-24:** Consumidor paga; sem ida e volta; opção paralela às demais no checkout; sem aceite em 60 min → devolve o valor da entrega e vira retirada. Decisões da dona no brainstorm.
- **2026-09-24:** Confirmados pela dona: rota de carro do CD, maior R$/km no carrinho, cotação gravada, `valor_parceiro` com comissão 0083, exigência de afiliado aprovado, piso da plataforma, prazo = rota + janela de aceite.
- **2026-09-24:** `depends_on: ["008", "049", "052", "048"]`. Critério: 008 define a cotação externa gravada que a US02 reutiliza; 049 define o CD como origem e a ordem das fontes que a decisão 6 complementa; 052 fixa a regra do dinheiro do frete de afiliado; 048 executa a devolução da US04 (ainda no PR #748).
- **2026-09-24:** Piso por km é por loja, padrão R$ 6,00 (dona). Pendentes: premissas marcadas (fora do escopo, várias lojas, fila manual até o 048, piso único).
- **2026-09-24:** Piso é por km (confirmado pela dona). Todas as premissas aceitas; status passa a pronto.
