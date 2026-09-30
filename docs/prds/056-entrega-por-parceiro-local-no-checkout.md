---
prd_number: "056"
status: rascunho
priority: alta
created: 2026-09-28
issue: ""
depends_on: ["053", "054", "048"]
references:
  - "docs/prds/053-entrega-por-km-do-afiliado-logistico.md" – cotação gravada, corrida com o valor cotado, 60 min sem aceite (US02, US03, US04)
  - "docs/prds/054-entregador-afiliacao-por-produto-e-tarifa-por-veiculo.md" – bandas por veículo, classes por peso, simulador do avião (decisões 8–11, US05); US06 e decisão 22 revistas por este PRD
  - "supabase/migrations/0201_bandas_frete_produto.sql" – tarifa mínima e R$/km por veículo no produto
  - "supabase/migrations/0204_valor_km_sem_piso.sql" – R$/km livre acima de zero
  - "supabase/migrations/0202_travessias.sql" – tabela de balsas
  - "supabase/migrations/0197_comissao_corrida_5_pct.sql" – comissão da plataforma sobre a corrida (5%)
  - "src/lib/logistica-parceiro/simulador-km.ts" – cálculo do frete que o simulador do avião usa
  - "src/lib/checkout/opcoes-frete.ts" – opções de frete do checkout hoje (interna, Uber Direct, a combinar)
  - "https://github.com/Schneider-Gr/industria24hIA/pull/818" – regra atual: frete = maior entre tarifa mínima e km × R$/km
---

# PRD 056: Entrega por parceiro local no checkout, pelo preço das bandas do seller, com pedido mínimo por distância

## 1. Contexto

- **Produto/área**: logística do marketplace (Manaus), entrega local feita por afiliado logístico da loja.
- **Estado atual** (verificado em 28/09/2026):
  - O seller configura no botão avião, por produto, as bandas de frete por veículo (tarifa mínima e R$/km de moto, carro e caminhão) e a quantidade mínima, com a ajuda do simulador. Isso está em produção (#816, #818, migration 0204).
  - O checkout não oferece entrega por parceiro local. As opções hoje são transportadora interna, Uber Direct e a combinar com o vendedor. O que o seller salva no avião não chega ao comprador.
  - A afiliação do entregador por produto (PRD 054, Milestone 1) não existe. O que existe é o afiliado logístico aprovado na loja, que o despacho de corrida já usa.
  - A US06 do PRD 054 manda cobrar o custo declarado pelo entregador mais barato ÷ 0,95. Isso contradiz o simulador: o seller vê um valor no avião e o comprador pagaria outro.
- **Problema**: o seller calcula o frete no simulador e não consegue vendê-lo. O comprador não tem entrega local com preço pela distância. Uma entrega que custa mais que o pedido afasta o comprador e dá prejuízo a alguém.

> **Contexto técnico** no TRD. O cálculo do frete deve ser o mesmo que o simulador do avião usa, para que simulação e cobrança nunca divirjam.

## 2. Solução Proposta

### Visão de produto

- O comprador vê "Entrega por parceiro local" no checkout, ao lado das outras opções, com o preço que o seller definiu nas bandas do avião.
- **O que o seller simula é o que o comprador paga**: mesma regra, mesmos km, mesma balsa.
- Quando o frete pesa demais no pedido para aquele endereço, a opção não aparece e o comprador vê a partir de quanto a entrega passa a atender o CEP dele.
- Até existir a afiliação por produto, entrega quem já é afiliado logístico aprovado na loja.

### Decisões de produto

1. **Preço = banda do seller**: o maior entre a tarifa mínima e km rodado (só ida) × R$/km da banda do veículo que o peso exige, + balsa quando a rota tem travessia. É a mesma regra do simulador do avião (decisão da dona, 28/09).
2. A US06 e a decisão 22 do PRD 054 (preço pelo custo do parceiro mais barato ÷ 0,95) **deixam de definir o preço**. O custo declarado pelo entregador passa a servir só para decidir quem pode aceitar a corrida, quando o PRD 054 M1/M2 existir (decisão da dona, 28/09).
3. **Quem pode levar a corrida, por enquanto: o afiliado logístico já aprovado na loja.** A afiliação por produto (PRD 054 M1) substitui essa regra quando entrar, sem bloquear esta entrega (decisão da dona, 28/09).
4. **Pedido mínimo por distância**: quando o frete para o CEP do comprador passa do limite de viabilidade do simulador, a entrega por parceiro some para aquele carrinho e aparece o aviso "a partir de N un. entregamos no seu CEP". Retirada e as outras opções continuam (decisão da dona, 28/09).
5. Limite de viabilidade = **frete até 20% do valor dos itens que vão por parceiro**, o mesmo "viável" do simulador (decisão da dona, 28/09).
6. O motorista recebe o valor cotado menos a comissão da plataforma (hoje 5%, migration 0197), como na US03 do PRD 053 (decisão da dona, 28/09).
8. **Com a entrega por parceiro local oferecida, o frete padrão (percentual da faixa de CEP) não aparece.** Tabela de transportadora continua; se a cotação do parceiro falhar, o frete padrão volta como alternativa (decisão da dona, 30/09).
9. Continuam valendo do PRD 053: opção paralela às demais, cotação gravada com validade, pedido usa só o valor cotado, 60 minutos sem aceite devolve o frete e o pedido vira retirada.

### Fora do escopo

- Afiliação do entregador por produto, custos declarados pelo entregador e elegibilidade por custo (PRD 054, M1 e M2).
- Carrinho dividido em envio A (parceiro) e B (outras formas) (PRD 054, US10). Aqui, se algum item da loja não pode ir por parceiro, a opção não aparece para a loja (decisão da dona, 28/09).
- Pagamento ao entregador (PRD 055).
- Ajudantes de carga.
- Pedido mínimo por faixa de distância gravado pelo seller. O mínimo por distância sai da regra de viabilidade; o seller não configura faixas *(premissa — confirme ou corrija)*.
- Fatores oficiais de equivalência da balsa (continuam editáveis em `/admin/travessias`).

## 3. Funcionalidades

### US01: Cotar a entrega por parceiro local no checkout

Como comprador, quero ver o preço e o prazo da entrega por parceiro local ao lado das outras opções, para escolher a que me serve.

**Rules:**
- Classe do veículo pelo peso total dos itens da loja: moto até 20 kg, carro até 300 kg, caminhão acima; na fronteira vale a classe menor (PRD 054, decisões 9 e 10).
- Km = rota de carro do Google, do ponto de partida até o endereço do comprador, só ida. O km de barco fica fora do km cobrado.
- Ponto de partida = o mesmo do simulador: CEP do produto; sem ele, o endereço da loja. Itens com CEPs de partida diferentes → endereço da loja (decisão da dona, 28/09).
- Preço = o maior entre a tarifa mínima e km × R$/km da banda da classe, arredondado em centavos.
- Itens da mesma loja com bandas diferentes → vale a maior tarifa mínima e o maior R$/km da classe entre os itens. É uma viagem só (mesma lógica da decisão 9 do PRD 053) (decisão da dona, 28/09). Ex.: carro, 10 km, bandas A 8/1,00, B 10/0,80, C 8/1,50 → maior(10; 10 × 1,50) = R$ 15,00.
- Rótulo "Entrega por parceiro local", com preço e prazo. Prazo = duração da rota + até 60 min para um motorista aceitar.
- Só aparece quando a loja tem ao menos um afiliado logístico aprovado e todos os itens da loja estão com o avião ligado, com peso e com a banda da classe preenchida.
- A cotação fica gravada com validade; ao expirar, o checkout recota antes de pagar.

**Edge cases:**
- Partida e destino iguais (0 km) → vale a tarifa mínima.
- Item sem peso → a opção não aparece para a loja.
- Banda da classe exigida sem R$/km (ex.: carrinho de 400 kg e produto sem banda de caminhão) → a opção não aparece para a loja.
- Banda com R$/km e sem tarifa mínima → preço = km × R$/km *(premissa — confirme ou corrija)*.
- Google sem rota, indisponível ou com teto diário atingido → a opção não aparece; as demais continuam.
- Endereço do comprador incompleto → pede o CEP antes de cotar.
- Carrinho com mais de uma loja → uma cotação por loja, cada uma com a sua rota.
- Seller muda a banda depois da cotação e antes do pagamento → vale a cotação gravada até expirar.

### US02: Somar a balsa quando a rota tem travessia

Como comprador de um endereço que exige barco, quero que o preço já inclua a balsa, para não ter cobrança extra na entrega.

**Rules:**
- Rota do Google com trecho de barco → o preço soma a balsa da tabela `travessias` (valor do veículo equivalente × fator da classe), só de ida.
- No checkout a balsa entra sozinha quando a rota tem travessia. O comprador não escolhe: sem o barco, a carga não chega (decisão da dona, 28/09).
- A tela mostra a separação: "Entrega R$ X + balsa R$ Y".

**Edge cases:**
- Travessia detectada sem linha correspondente na tabela `travessias` → a opção não aparece; sugere "a combinar" quando a loja permitir *(premissa — confirme ou corrija)*.
- Destino sem rota por estrada nem por barco → a opção não aparece.

### US03: Esconder a entrega quando o frete não compensa e mostrar o mínimo

Como comprador, quero saber a partir de quanto a entrega por parceiro atende o meu CEP, para decidir se aumento o pedido.

**Rules:**
- Frete (com balsa) acima de 20% do valor dos itens da loja → a opção não aparece.
- No lugar dela: "Entrega por parceiro local a partir de N un. para o seu CEP", quando o carrinho da loja tem um produto só. N = menor quantidade, até 1000, em que o frete fica dentro do limite, recalculando a classe do veículo a cada quantidade (mesma busca do simulador).
- Carrinho da loja com mais de um produto → o aviso fala em valor: "a partir de R$ V em produtos desta loja" (decisão da dona, 28/09).
- A quantidade mínima do produto que o carrinho já exige continua valendo.

**Edge cases:**
- Nenhuma quantidade até 1000 fecha → "Entrega por parceiro local indisponível para o seu CEP", sem número.
- A troca de veículo fura a viabilidade (ex.: 6 un. de carro fecham, 20 a 40 de caminhão não) → sugere a menor quantidade que fecha.
- N maior que o estoque → mostra o aviso sem número *(premissa — confirme ou corrija)*.
- Comprador aumenta a quantidade até N → o checkout recota e a opção aparece.

### US04: Pedido pago cria a corrida para o afiliado da loja

Como afiliado logístico da loja, quero receber a corrida com o valor que o comprador pagou, para decidir se aceito sabendo quanto vou receber.

**Rules:**
- O pedido usa o valor da cotação gravada, nunca um valor recalculado ou enviado pelo navegador.
- A corrida nasce com o valor cotado; o motorista vê esse valor menos a comissão da plataforma.
- A corrida mostra km, tempo, classe do veículo, peso e se há balsa.
- A corrida vai para os afiliados logísticos aprovados na loja, como o despacho de hoje.
- Sem aceite em 60 minutos → PRD 053 US04 (devolve o frete, o pedido vira retirada).

**Edge cases:**
- Cotação expirada ao fechar o pedido → o pedido não é criado; o checkout recota e pede nova confirmação.
- Cotação de outro comprador, CEP ou carrinho → o pedido é recusado.
- Webhook de pagamento repetido → uma corrida só.
- Afiliado da loja revogado entre a cotação e o pagamento, sem outro aprovado → a corrida fica aguardando e conta os 60 minutos.

## 4. Fluxo de Negócio

```
Comprador informa CEP no checkout
   │
   ▼
Loja tem afiliado aprovado e todos os itens com avião, peso e banda da classe?
   ├── não ──▶ opção não aparece (demais opções seguem)
   └── sim ──▶ Google calcula a rota
                 ├── sem rota / erro ──▶ opção não aparece
                 └── rota ──▶ frete = maior(tarifa mínima, km × R$/km) + balsa se houver barco
                                │
                                ▼
                     frete ≤ 20% dos itens da loja?
                        ├── sim ──▶ "Entrega por parceiro local R$ X" (cotação gravada)
                        └── não ──▶ some + "a partir de N un. / R$ V para o seu CEP"
```

## 5. Critérios de Aceite

### 5a. Critérios de aceite da feature

| Critério | Razão de negócio | Como verificar (observável) |
|----------|------------------|-----------------------------|
| Para o mesmo produto, quantidade e CEP, o preço no checkout é igual ao do simulador do avião, ao centavo | O seller precisa vender o que simulou | Simular Pão Italiano para um CEP no avião e cotar o mesmo carrinho no checkout |
| Perto vale km, médio vale a tarifa mínima (ex.: carro tarifa 8, R$ 1/km: 10,4 km → R$ 10,40; 7,8 km → R$ 8,00) | Regra do vídeo da dona, 28/09 | Dois CEPs de teste |
| Rota com barco soma a balsa e mostra a separação | Evita cobrança extra na entrega | CEP do outro lado do rio |
| Carrinho com frete acima de 20% não mostra a opção e mostra "a partir de N un."; ao subir para N, a opção aparece | Pedido mínimo por distância | Carrinho pequeno para CEP longe |
| Loja sem afiliado aprovado, item sem peso ou sem banda da classe: a opção não aparece | Não vender entrega que ninguém pode fazer | Três carrinhos de teste |
| Pedido pago cria a corrida com o valor cotado, visível ao afiliado da loja | Motorista sabe quanto recebe | Pedido de teste no sandbox |
| Falha do Google não quebra o checkout | As outras opções continuam vendendo | Simular indisponibilidade |

### 5b. Métricas de sucesso

| Métrica | Baseline (fonte) | Meta | Prazo | Mín. aceitável | Responsável |
|---------|-------------------|------|-------|-----------------|-------------|
| Pedidos pagos com entrega por parceiro local | 0 (opção não existe) | A definir | 30 dias após o deploy | 1 pedido real concluído | Dona |
| Corridas de parceiro local aceitas em até 60 min | A levantar (sem corridas desse tipo) | 80% | 30 dias após o deploy | 50% | Dona |
| Divergência entre simulador e checkout | — | 0 casos | contínuo | 0 | Dev |

## 6. Milestones

### Milestone 1: Vender a entrega por parceiro local

**Por que é um marco:** o frete que o seller configura no avião passa a ser vendido no checkout e vira corrida para o afiliado da loja.

**Funcionalidades:** US01, US02, US04

**Checklist de aceite** (marcado pelo Aprovador após a implementação):
- [ ] Para o mesmo produto, quantidade e CEP, o preço no checkout é igual ao do simulador, ao centavo
- [ ] Perto vale km, médio vale a tarifa mínima
- [ ] Rota com barco soma a balsa e mostra a separação
- [ ] Loja sem afiliado aprovado, item sem peso ou sem banda da classe: a opção não aparece
- [ ] Pedido pago cria a corrida com o valor cotado, visível ao afiliado da loja
- [ ] Falha do Google não quebra o checkout

**Aprovador:** Dona (Andréia)

### Milestone 2: Pedido mínimo por distância no carrinho

**Por que é um marco:** o comprador longe sabe a partir de quanto recebe em casa, e ninguém paga frete maior que o pedido.

**Funcionalidades:** US03

**Checklist de aceite** (marcado pelo Aprovador após a implementação):
- [ ] Carrinho com frete acima de 20% não mostra a opção e mostra "a partir de N un."; ao subir para N, a opção aparece

**Aprovador:** Dona (Andréia)

## 7. Riscos e Dependências

| Risco | Impacto | Mitigação | Status |
|-------|---------|-----------|--------|
| Preço da banda abaixo do custo real do motorista: ninguém aceita | Alto | 60 min com devolução do frete (PRD 053); tarifa mínima padrão 6/8/20; custo do entregador entra na elegibilidade no PRD 054 | Monitorando |
| Poucos afiliados aprovados por loja: a opção aparece e a corrida não sai | Alto | Opção só com afiliado aprovado; métrica de aceite em 60 min | Monitorando |
| Custo do Google cresce com cotações no checkout | Médio | Cotação gravada com validade; teto diário existente | Monitorando |
| Fatores da balsa são estimados | Médio | Editáveis em `/admin/travessias`; buscar os oficiais da ANTAQ | Pendente |
| Devolução automática do frete ainda não existe | Médio | Fila manual do admin (PRD 053 US04) até o PRD 048 | Pendente |

**Dependências:**

| Dependência | Tipo | Status | Impacto se bloqueado |
|-------------|------|--------|----------------------|
| PRD 053 (cotação gravada, corrida, 60 min) | Interna | pronto; checkout não implementado | Milestone 1 |
| PRD 054 (bandas, classes, simulador) | Interna | bandas e simulador em produção | Milestones 1 e 2 |
| PRD 048 (devolução ao comprador) | Interna | PR #748 aberto | Devolução dos 60 min fica manual |

## 8. Referências

- [PRD 053](053-entrega-por-km-do-afiliado-logistico.md): cotação gravada, corrida com valor cotado, 60 minutos.
- [PRD 054](054-entregador-afiliacao-por-produto-e-tarifa-por-veiculo.md): bandas por veículo, classes e simulador; US06 e decisão 22 revistas aqui.
- [PR #818](https://github.com/Schneider-Gr/industria24hIA/pull/818): regra atual do frete no avião.
- `src/lib/logistica-parceiro/simulador-km.ts`: cálculo que o checkout deve reutilizar.

## 9. Registro de Decisões

- **2026-09-28:** Preço no checkout = banda do seller (mesma regra do simulador), e não o custo do parceiro mais barato ÷ 0,95. Motivo: o seller precisa vender o que simulou. Revisa a US06 e a decisão 22 do PRD 054 (decisão da dona).
- **2026-09-28:** Elegível interino = afiliado logístico aprovado na loja, até o PRD 054 M1. Motivo: não bloquear a venda pela afiliação por produto, que ainda não existe (decisão da dona).
- **2026-09-28:** Pedido mínimo por distância = a opção some quando o frete passa do limite e o comprador vê "a partir de N un."; as demais opções continuam (decisão da dona).
- **2026-09-28:** `depends_on: ["053", "054", "048"]`. Critério: 053 define a cotação gravada, a corrida com o valor cotado e os 60 minutos que este PRD reutiliza; 054 define as bandas, as classes por peso e o simulador cujo cálculo o checkout repete; 048 executa a devolução do frete sem aceite.
- **2026-09-28:** Dona confirmou: limite de 20%; comissão de 5%; carrinho da mesma loja = uma entrega com banda única (maior tarifa mínima e maior R$/km da classe entre os itens, exemplo numérico na US01); partida com CEPs diferentes = endereço da loja; balsa automática no checkout; aviso em R$ para vários produtos; sem carrinho dividido.
- **2026-09-28:** Pendentes: premissas ainda marcadas (banda sem tarifa mínima, travessia fora da tabela, N acima do estoque, mínimo por faixa não configurável pelo seller).
- **2026-09-30:** Com parceiro local oferecido, o "Frete padrão" (8% da faixa global de Manaus no teste: R$ 4,08 sobre R$ 51,00) some do checkout (decisão da dona após o E2E).
