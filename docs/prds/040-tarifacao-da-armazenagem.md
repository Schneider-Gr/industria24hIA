---
prd_number: "040"
status: rascunho
priority: média
created: 2026-09-16
issue: ""
depends_on: ["039", "023"]
references:
  - "docs/prds/039-custodia-e-operacao-do-cd-industria.md"
  - "docs/prds/023-sistema-repasse-asaas.md"
  - "docs/prd/centro-distribuicao-fulfillment.md"
  - "supabase/migrations/0145_transportadora_faixas_frete.sql"
  - "supabase/migrations/0175_estoque_ledger_milestone1.sql"
---

# PRD 040: Tarifação da armazenagem

## 1. Contexto

- **Produto/área**: monetização do serviço de armazenagem do Indústria 24h. É a contrapartida financeira da custódia descrita no PRD 039.
- **Estado atual**: o marketplace tem uma única fonte de receita, a comissão sobre a venda. O serviço de guardar mercadoria de fabricante pequeno foi decidido e está sendo construído, mas não existe contrato de armazenagem, não existe tabela de preço e não existe fatura: se um seller mandar mercadoria hoje, o marketplace guarda de graça e absorve o custo do espaço, do manuseio e do risco. O PRD original de fulfillment (`centro-distribuicao-fulfillment.md`, MPDD-31) já colocava a taxa de armazenagem como objetivo e ela nunca saiu do papel. O repasse de venda ao seller existe (PRD 023), é derivado e tem **zero transferências efetivadas em produção**.
- **Problema**: sem tarifação, a armazenagem é custo puro. Cada metro de galpão ocupado e cada caixa manuseada saem do resultado do marketplace, e a decisão de aceitar ou recusar mercadoria de um seller passa a ser feita por intuição, sem saber se aquele volume se paga. O objetivo declarado do serviço era receita recorrente além da comissão, e essa parte não existe.

> Contexto técnico (stack, arquitetura, padrões) vive no TRD. Aqui só o ponteiro para as migrations de tabela de preço que já servem de modelo.

## 2. Solução Proposta

### Visão de produto

- Existe um **contrato de armazenagem por loja**: sem contrato, a operação não recebe mercadoria, e o seller sabe o preço antes de despachar a primeira caixa.
- A tarifa se decompõe no que efetivamente consome recurso: **entrada** (conferir e guardar), **estadia** (ocupar espaço ao longo do tempo) e **saída** (separar e expedir).
- Existe **tabela global padrão** e o contrato da loja pode sobrepô-la, do mesmo jeito que as tabelas de frete de transportadora já funcionam.
- Tudo que é cobrado é **derivado do ledger de movimentação**, e cada item da fatura aponta para os lançamentos que o originaram. Não existe item de fatura sem evidência.
- A cobrança é **fatura mensal por loja, separada do repasse de venda**, e o seller vê a prévia antes de o mês fechar.

### Decisões de produto

1. **Fatura de armazenagem é separada do repasse de venda.** Motivo: o repasse é derivado e hoje tem zero transferências efetivadas; acoplar receita nova a um fluxo não comprovado colocaria as duas em risco e tornaria impossível auditar qualquer uma.
2. **Três componentes de tarifa: entrada, estadia e saída.** Motivo: é o que separa o seller que gira mercadoria do que usa o galpão como depósito parado. *(premissa — confirme ou corrija)*
3. **Estadia cobrada por posição ocupada, por mês.** Não por m³ nem por unidade. Decidido pela dona em 18/09/2026.
4. **Sem contrato assinado, a operação não recebe mercadoria.** Motivo: guardar primeiro e negociar preço depois é como se cria a dívida que ninguém reconhece.
5. **Preço é negociado por loja no piloto, não tabelado publicamente.** Motivo: são no máximo 2 sellers e o custo real do galpão ainda não é conhecido. *(premissa — confirme ou corrija)*
6. **Valores de tarifa a definir com a dona.** Nenhum número neste PRD é decisão tomada: a estrutura está definida, a etiqueta não.
7. **Contestação não altera lançamento.** O ledger é imutável desde a `0175`; contestação aceita gera crédito na fatura seguinte, com motivo.
8. **Sem mínimo mensal.** Loja paga só o que usou. Decidido pela dona em 18/09/2026.
9. **Fatura cobrada à parte via Asaas, nunca descontada do repasse.** Decidido pela dona em 18/09/2026; confirma a decisão 1.
10. **Avaria e extravio são responsabilidade do seller, que declara o valor da mercadoria.** O Indústria não contrata seguro da mercadoria em custódia. Decidido pela dona em 18/09/2026.
11. **Contrato versionado.** A loja aceita uma versão do contrato, e cada lançamento de fatura grava a versão vigente no momento do lançamento (snapshot, no mesmo padrão de `linha_itens.repasse_ind_pct`). Mudar o contrato cria versão nova; lançamento antigo nunca é recalculado.

### Fora do escopo

- A operação de custódia em si (recebimento, conferência, endereçamento, separação, expedição). É o PRD 039, do qual este depende.
- Cobrança de frete, que já tem motor próprio nas tabelas de transportadora.
- Cobrança de serviço de valor agregado (kitagem, embalagem presente, etiquetagem). Entra depois, se houver demanda. *(premissa — confirme ou corrija)*
- Antecipação ou financiamento sobre mercadoria em custódia.
- Reajuste automático por índice. O contrato do piloto tem prazo curto e preço fixo. *(premissa — confirme ou corrija)*
- Emissão de nota fiscal de serviço. Depende da validação contábil que já bloqueia o PRD 039.

## 3. Funcionalidades

### US01: Tabela de tarifas e contrato por loja

Como operação do marketplace, quero uma tabela padrão de tarifas e a possibilidade de contrato próprio por loja, para negociar com o seller grande sem reescrever o preço de todos.

**Rules:**
- Existe uma tabela global de tarifas com os três componentes: entrada, estadia e saída.
- O contrato de uma loja sobrepõe a tabela global, componente por componente, e o que ele não define cai no padrão.
- O contrato tem vigência com início e fim, e a fatura usa o contrato vigente na data do lançamento, não o vigente no fechamento.
- Contrato tem estado: rascunho, vigente, encerrado.
- Loja sem contrato vigente não pode ter mercadoria em custódia.

**Edge cases:**
- Contrato alterado no meio do mês → os lançamentos anteriores à mudança seguem o preço antigo, e a fatura mostra os dois trechos separados. *(premissa — confirme ou corrija)*
- Contrato encerrado com mercadoria ainda no galpão → a estadia continua sendo cobrada pelo último preço vigente, e a operação abre pendência de retirada. *(premissa — confirme ou corrija)*
- Tentativa de deixar um componente sem preço na tabela global → rejeitada, porque o padrão é o piso de todo cálculo.

### US02: Cálculo da fatura a partir do ledger

Como operação financeira, quero que a fatura seja calculada a partir das movimentações registradas, para que nada seja cobrado sem evidência.

**Rules:**
- Entrada é cobrada por recebimento conferido, sobre a quantidade conferida e não a declarada.
- Saída é cobrada por item expedido.
- Estadia é cobrada sobre o saldo em custódia ao fim de cada dia, no período do contrato.
- Todo item de fatura referencia os lançamentos que o originaram, e é possível navegar do valor até o movimento.
- Mercadoria devolvida pelo comprador e recolocada em custódia gera nova entrada e volta a contar estadia. *(premissa — confirme ou corrija)*
- Avaria registrada na conferência não é cobrada, porque nunca virou saldo vendável.

**Edge cases:**
- Mercadoria que entra e sai no mesmo dia → paga entrada e saída, não paga estadia. *(premissa — confirme ou corrija)*
- Mês sem nenhuma movimentação e com saldo parado → fatura só de estadia.
- Mês sem movimentação e sem saldo → nenhuma fatura é emitida, em vez de fatura de valor zero.
- Lançamento de ajuste manual do seller → não é cobrado como entrada nem como saída, só altera a base de estadia dos dias seguintes. *(premissa — confirme ou corrija)*
- Divergência de conferência ainda em aberto no fechamento → a quantidade em disputa não é cobrada até resolver. *(premissa — confirme ou corrija)*

### US03: Prévia e fechamento da fatura

Como seller, quero ver quanto vou pagar de armazenagem antes de o mês fechar, para não ser surpreendido pela cobrança e para decidir se vale retirar mercadoria parada.

**Rules:**
- A prévia da fatura do mês corrente está visível ao seller a qualquer momento, com os três componentes abertos.
- O fechamento ocorre em data fixa do mês e gera a cobrança. *(premissa — confirme ou corrija)*
- Depois do fechamento a fatura é imutável; correção se faz por crédito na seguinte.
- O seller vê apenas as faturas das próprias lojas.
- A fatura mostra o contrato e o preço aplicados, não só o valor final.

**Edge cases:**
- Seller contesta item da fatura → abre contestação com motivo, a fatura segue devida e a resolução vira crédito ou não.
- Fatura não paga → a operação recusa novo aviso de recebimento daquela loja e avisa o seller, sem confiscar nem bloquear a mercadoria que já está guardada. *(premissa — confirme ou corrija; confiscar mercadoria de terceiro por dívida de serviço tem implicação legal que precisa de parecer)*
- Loja encerra a operação com fatura em aberto → a retirada da mercadoria é liberada e a dívida segue cobrada por fora. *(premissa — confirme ou corrija)*

## 4. Fluxo de Negócio

```
Loja quer usar o CD
   │
   ▼
Tem contrato de armazenagem vigente?
   ├── não ──▶ não recebe mercadoria (PRD 039, US03)
   └── sim ──▶ opera normalmente
                  │
                  ▼
            Durante o mês, cada movimento do ledger classifica em:
              entrada conferida ─▶ tarifa de entrada
              saldo no fim do dia ─▶ tarifa de estadia
              item expedido ─▶ tarifa de saída
                  │
                  ▼
            Prévia visível ao seller a qualquer momento
                  │
                  ▼
            Fechamento do mês ──▶ Fatura (imutável) ──▶ Cobrança
                  │
                  ▼
            Seller contesta? ──┬── não ──▶ fim
                               └── sim ──▶ evidência é o extrato de custódia
                                             │
                                             ▼
                                  Procede? ──┬── sim ──▶ crédito na fatura seguinte
                                             └── não ──▶ cobrança mantida, com justificativa
```

## 5. Critérios de Aceite

### 5a. Critérios de aceite da feature

| Critério | Razão de negócio | Como verificar (observável) |
|----------|------------------|-----------------------------|
| Nenhum item de fatura existe sem lançamento de ledger correspondente | Cobrar sem evidência quebra a relação no primeiro questionamento e o seller retira a mercadoria | Reconciliação fatura × ledger, com zero itens órfãos |
| Nenhum lançamento cobrável fica fora da fatura do seu período | Receita perdida em silêncio é pior que erro visível, porque ninguém procura | Reconciliação inversa: zero lançamentos cobráveis sem item de fatura |
| A fatura usa o contrato vigente na data do lançamento, não no fechamento | Mudança de preço no meio do mês cobrando retroativo é quebra de acordo | Alterar contrato no meio de um mês de teste e conferir os dois trechos na fatura |
| Prévia do mês corrente disponível ao seller a qualquer momento | Surpresa na cobrança é a primeira razão de cancelamento de serviço recorrente | Abrir o painel do seller e conferir os três componentes abertos |
| Fatura fechada não é alterada por nenhum caminho | Fatura que muda depois de emitida inviabiliza conciliação contábil dos dois lados | Tentativa de alteração rejeitada, correção só por crédito |
| Loja sem contrato vigente não consegue ter mercadoria em custódia | Guardar antes de acertar preço é como se cria a dívida que ninguém reconhece | Tentar anunciar carga sem contrato e ser recusado |
| Seller não acessa fatura nem contrato de loja que não é dele | Preço negociado é informação comercial sensível entre concorrentes | Teste de acesso com dois sellers |
| Recálculo da prévia de um mês fechado reproduz o mesmo valor da fatura emitida | Se o cálculo não é reprodutível, não há como defender a cobrança numa contestação | Recalcular um mês já faturado e comparar item por item |

### 5b. Métricas de sucesso

| Métrica | Baseline (fonte) | Meta | Prazo | Mín. aceitável | Responsável |
|---------|-------------------|------|-------|-----------------|-------------|
| Receita mensal de armazenagem | R$ 0 (serviço não cobrado hoje) | A definir com a dona | 90 dias após o Milestone 2 | Maior que zero, com 2 lojas faturadas | Dona do produto |
| Faturas contestadas | — | Menos de 10% das faturas emitidas | 90 dias após o Milestone 2 | Menos de 25% | Operação |
| Contestações que procedem | — | Menos de 2% das faturas | 90 dias após o Milestone 2 | Menos de 5% | Operação |
| Margem da armazenagem contra o custo do galpão | A levantar (custo do CD não conhecido; depende da decisão próprio × 3PL) | Positiva | 180 dias após o Milestone 2 | Empatada | Dona do produto |
| Lojas com contrato de armazenagem vigente | 0 | 5 | 90 dias após o Milestone 2 | 2 | Captação |

## 6. Milestones

### Milestone 1: Contrato e preço existem

**Por que é um marco:** a captação passa a poder vender o serviço com preço na mão, e a operação ganha o critério objetivo para aceitar ou recusar mercadoria. É o marco que transforma "a gente guarda pra você" numa oferta comercial.

**Funcionalidades:** US01

**Checklist de aceite:**
- [ ] Tabela global de tarifas com os três componentes em produção
- [ ] Contrato por loja sobrepondo a tabela global, com vigência
- [ ] Loja sem contrato vigente não consegue ter mercadoria em custódia
- [ ] Seller não acessa contrato de loja que não é dele

**Aprovador:** Dona do produto

### Milestone 2: Cobrar e ser pago

**Por que é um marco:** fecha o objetivo de negócio original do fulfillment, que era receita recorrente além da comissão de venda. Pela primeira vez o marketplace recebe por um serviço, e não por intermediar uma venda.

**Funcionalidades:** US02, US03

**Checklist de aceite:**
- [ ] Reconciliação fatura × ledger nas duas direções, com zero órfãos
- [ ] Prévia do mês corrente visível ao seller antes do fechamento
- [ ] Fatura fechada imutável, com correção por crédito
- [ ] Recálculo de um mês fechado reproduz o valor emitido
- [ ] Uma fatura real emitida e paga por um seller do piloto

**Aprovador:** Dona do produto

## 7. Riscos e Dependências

| Risco | Impacto | Mitigação | Status |
|-------|---------|-----------|--------|
| Preço definido sem conhecer o custo real do galpão, tornando o serviço deficitário | Alto | Levantar o custo do CD junto com a decisão próprio × 3PL antes de fechar a tabela; contrato do piloto com prazo curto para permitir correção | Em aberto |
| Cobrar errado no primeiro mês e perder a confiança do seller que acabou de entregar mercadoria | Alto | Rodar o cálculo em paralelo por um mês, sem cobrar, e conferir contra planilha antes da primeira fatura real | Pendente |
| Fatura de serviço sem nota fiscal correta | Alto | Depende da mesma validação contábil que bloqueia o PRD 039; sem parecer, não emite | Em aberto |
| Recusar recebimento por fatura não paga sem base contratual | Médio | Prever a hipótese no contrato de depósito; nunca retenção de mercadoria, apenas recusa de carga nova | Em aberto |
| Estadia por unidade e por dia punir produto volumoso e baratear produto pequeno de alto valor | Médio | Medir os dois modelos sobre os dados reais do piloto antes de fixar a regra | Pendente |
| Cálculo mensal pesado sobre o ledger ficando lento à medida que o histórico cresce | Médio | Fechamento consolida o período e a prévia trabalha só sobre o mês corrente | Pendente |

**Dependências:**

| Dependência | Tipo | Status | Impacto se bloqueado |
|-------------|------|--------|----------------------|
| PRD 039 (custódia no CD) | Interna | Rascunho | Bloqueia tudo: sem recebimento, expedição e saldo em custódia registrados, não há o que cobrar |
| PRD 036, Milestone 1 (ledger) | Interna | Em produção desde 16/09/2026 | — |
| PRD 023 (repasse Asaas) | Interna | Em produção, com zero transferências efetivadas | Não bloqueia por desenho: a fatura é separada do repasse justamente para não herdar esse risco |
| Custo real do CD (próprio ou 3PL) | Externa | Em aberto | Não bloqueia a construção, bloqueia a definição do preço |
| Validação contábil e nota fiscal de serviço | Externa | Em aberto | Bloqueia o Milestone 2 |
| Contrato de depósito | Externa | Em aberto | Bloqueia o Milestone 1, que é justamente o contrato |

## 8. Referências

- [PRD 039](039-custodia-e-operacao-do-cd-industria.md) — custódia no CD, que produz os lançamentos que esta feature cobra
- [PRD 036](036-ledger-estoque-multi-local.md) — ledger de movimentação, base de cálculo de toda a fatura
- [PRD 023](023-sistema-repasse-asaas.md) — repasse de venda ao seller, do qual esta cobrança é deliberadamente separada
- `supabase/migrations/0145_transportadora_faixas_frete.sql` e `0148` — tabela global com sobreposição por loja, o modelo que o contrato de armazenagem reaproveita
- `supabase/migrations/0175_estoque_ledger_milestone1.sql` — imutabilidade do lançamento, que sustenta a evidência da fatura
- `docs/prd/centro-distribuicao-fulfillment.md` — PRD original de fulfillment (MPDD-31), onde a taxa de armazenagem aparece como objetivo pela primeira vez

## 9. Registro de Decisões

- **2026-09-16:** Tarifação separada do PRD 039 em documento próprio. Motivo: cobrar pelo serviço se explica sozinho, tem receita, contrato e fatura próprios, e depende da custódia sem fazer parte dela. Dentro do 039, arrastava a discussão de preço para antes de a operação existir.
- **2026-09-16:** Fatura mensal separada do repasse de venda. Motivo: o repasse é derivado e tem zero transferências efetivadas em produção; acoplar receita nova a ele colocaria as duas em risco e impediria auditar qualquer uma.
- **2026-09-16:** Nenhum valor de tarifa fixado neste PRD, a pedido da dona. A estrutura de três componentes está decidida; os números entram depois, junto com o custo real do galpão.
- **2026-09-16:** Tabela global com sobreposição por loja, em vez de preço único ou preço só por contrato. Motivo: é o desenho que as tabelas de frete de transportadora já usam no mesmo produto (`0145`, `0148`), e repetir o padrão conhecido evita um segundo modelo mental de precificação.
- **2026-09-16:** Fatura fechada é imutável e correção se faz por crédito. Motivo: o ledger já é imutável desde a `0175`, e fatura que muda depois de emitida inviabiliza a conciliação contábil dos dois lados.
- **2026-09-16:** Recusa de carga nova por fatura em aberto, nunca retenção da mercadoria. Motivo: a mercadoria é de terceiro, e retenção por dívida de serviço tem implicação legal que precisa de parecer antes de virar regra.
- **2026-09-16:** `depends_on` definido como 039 e 023 por dependência real: o 039 produz os lançamentos e o saldo que esta feature cobra; o 023 é o fluxo financeiro existente com o seller, do qual esta cobrança precisa ficar explicitamente separada. O 036 não entra porque a dependência dele chega por meio do 039.
- **2026-09-16:** Número 040 atribuído após conferir o maior número em todas as branches com `git log --all`, que era 039.
- **2026-09-18:** Decisões da dona sobre o contrato de fulfillment: estadia cobrada por posição ocupada por mês (não m³), sem mínimo mensal, fatura cobrada à parte via Asaas e não descontada do repasse, avaria e extravio por conta do seller, que declara o valor (o Indústria não segura). Substitui a premissa de estadia por unidade e por dia. Valores seguem sem número.
- **2026-09-18:** Contrato versionado: a loja aceita uma versão e cada lançamento de fatura grava a versão vigente, como snapshot (padrão de `linha_itens.repasse_ind_pct`). Motivo: fatura auditável sem depender de reconstruir qual contrato valia na data.
