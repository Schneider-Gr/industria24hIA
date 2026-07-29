---
prd_number: "003"
status: rascunho
priority: média
created: 2026-07-28
issue: ""
depends_on: []
references:
  - "docs/prds/002-crm-funil-leads.md"
  - "supabase/migrations/0039_parceiro_logistico_schema.sql"
  - "supabase/migrations/0040_parceiro_logistico_rpcs.sql"
  - "supabase/migrations/0043_despacho_automatico_corridas.sql"
  - "supabase/migrations/0083_comissao_plataforma_corrida.sql"
  - "src/app/(parceiro)/parceiro/prototype-variants.tsx"
---

# PRD 003: Painel de Corridas do Parceiro Logístico orientado à execução em campo

## 1. Contexto

- **Produto/área**: Indústria 24h, marketplace de Manaus. Módulo de logística — a área `/parceiro`, usada por motoristas autônomos e transportadoras que aceitam fretes avulsos (corridas) e rotas de pedidos do marketplace.
- **Estado atual**: `/parceiro` mostra três seções empilhadas de cards visualmente idênticos — *Disponíveis*, *Minhas corridas*, *Rotas atribuídas a mim*. Todas as corridas em andamento aparecem com o mesmo peso visual; o próximo passo de cada uma é um botão pequeno no meio do card, misturado com o botão de check-in GPS e o link do mapa. Os dados que decidem se vale a pena aceitar um frete (distância, duração estimada, valor líquido ao parceiro após a comissão da plataforma) existem no banco desde as migrations `0043` e `0083`, mas são renderizados como texto corrido no meio de um parágrafo, sem nenhum valor derivado. A tela tem uma sidebar fixa de 200px e nenhum tratamento mobile.
- **Problema**: o usuário desta tela está na rua, geralmente no veículo, com pouco tempo e uma mão livre. A tela atual pede que ele leia três seções e localize, dentro de um card entre vários iguais, qual é a próxima ação — quando na prática ele executa uma entrega por vez. No outro extremo, a transportadora que avalia vários fretes não tem como comparar propostas: precisa fazer a conta de retorno por quilômetro de cabeça, frete a frete. As duas populações usam a mesma tela e nenhuma é bem servida. *(premissa — confirme ou corrija: o gargalo é a legibilidade da tela, não a falta de oferta de corridas)*

> **Contexto técnico** (stack, arquitetura, padrões) vive no TRD. Aqui o ponto relevante: a feature é uma reescrita da camada de apresentação de `/parceiro`. A máquina de estados da corrida (`Aceita → Coletada → EmTransito → Entregue`), as validações e as permissões continuam no banco (`atualizar_status_corrida`, `aceitar_corrida`, migration `0040`) e **não** mudam. Um protótipo navegável das duas alternativas existe em `src/app/(parceiro)/parceiro/prototype-variants.tsx`, acessível em `/parceiro?variant=B`.

## 2. Solução Proposta

### Visão de produto

- Trocar "três listas de tudo" por **uma corrida em foco**: a entrega que o parceiro está executando agora ocupa a tela, com endereços legíveis à distância de um painel de veículo e um único botão de próximo passo em largura total.
- Tornar o **progresso da entrega visível** como uma trilha (`Aceita → Coletada → Em trânsito → Entregue`), para que o parceiro saiba onde está sem precisar decodificar um badge de status.
- Dar ao parceiro os **números que decidem o aceite** já calculados na lista de disponíveis — quanto ele leva no bolso, quantos quilômetros, quanto tempo e o retorno por quilômetro — em vez de deixá-lo fazer a conta.
- Rebaixar tudo que não é a entrega atual a uma **lista compacta de uma linha**, preservando o acesso sem competir por atenção.
- Assumir o **celular como tela primária** do parceiro, com o desktop como caso secundário.

### Decisões de produto

1. **Uma corrida em foco por vez, escolhida pelo sistema.** A corrida em foco é a mais avançada na trilha (quem está em trânsito vem antes de quem só foi aceita); empate resolve pela janela de horário mais próxima. O parceiro não escolhe qual focar, porque na prática ele executa em ordem e uma escolha a mais é uma decisão a mais no volante.
2. **Rota de pedido só assume o foco quando não há corrida em andamento.** Corrida avulsa tem janela de horário contratada e urgência declarada; rota de pedido não. *(premissa — confirme ou corrija: rota nunca deve ter prioridade sobre corrida)*
3. **O valor exibido ao parceiro é sempre o líquido dele** (`valor_parceiro`, comissão da plataforma já descontada, migration `0083`), com o frete bruto disponível apenas como informação secundária. Exibir bruto como número principal cria expectativa de recebimento errada.
4. **R$/km é informativo, não classificatório.** A ordenação da lista de disponíveis continua por proximidade do CEP base. Ordenar por retorno faria a plataforma parecer recomendar fretes, o que muda a relação com o parceiro. *(premissa — confirme ou corrija)*
5. **A proximidade exibida continua sendo aproximação por faixa de CEP**, sem geocoding. A tela não deve apresentá-la como distância real ao parceiro.

### Fora do escopo

- **Notificação push ou WhatsApp de nova corrida disponível.** É um canal novo, com custo e cadastro próprios; esta feature muda a tela, não a forma de avisar. *(premissa — confirme ou corrija)*
- **Navegação turn-by-turn embutida.** O link de mapa continua abrindo o app externo do celular.
- **Mudança em qualquer regra de negócio da corrida** — transições de status, exigência de foto na entrega, cálculo de frete, comissão, leilão de lance. Tudo permanece como está nas migrations `0040`/`0083`.
- **Reserva ou exclusividade temporária de corrida.** A disputa continua sendo "quem aceitar primeiro leva" (ver Risco R1).
- **Tela do despachante da transportadora com visão tabular de frota.** É outra persona e outro PRD.

## 3. Funcionalidades

### US01: Executar a entrega atual sem procurar na tela

Como parceiro logístico em campo, quero ver só a entrega que estou executando agora, com o próximo passo em um botão grande, para agir sem precisar ler a tela inteira parado no trânsito.

**Rules:**
- A tela abre com exatamente uma corrida em foco: a mais avançada na trilha; havendo empate, a de janela de início mais próxima.
- O cartão em foco exibe endereço de coleta e endereço de entrega como os elementos de maior destaque tipográfico da tela, além de peso, janela de horário e valor líquido ao parceiro.
- O cartão exibe a trilha `Aceita → Coletada → Em trânsito → Entregue` com o passo atual destacado dos demais.
- Existe **um único** botão de ação primária, rotulado com o próximo passo real daquele status ("Confirmar coleta", "Iniciar trânsito", "Confirmar entrega"), ocupando a largura do cartão.
- Abrir o mapa e fazer check-in GPS são ações secundárias, visualmente subordinadas ao botão primário.
- O check-in GPS aparece apenas quando a corrida está em `Coletada` ou `EmTransito`, mantendo a regra da policy `corrida_posicoes_insert` (migration `0039`).
- A confirmação de entrega exige foto e, no celular, abre a câmera diretamente.

**Edge cases:**
- Parceiro sem nenhuma corrida em andamento e com rota de pedido atribuída → a rota assume o cartão em foco, com a trilha reduzida aos status que a rota tem (`Atribuída → Em trânsito → Entregue`).
- Parceiro sem nada em andamento → o cartão em foco é substituído por um convite explícito a pegar uma corrida da lista de disponíveis, não por um espaço vazio.
- Tentativa de avançar o status por um caminho inválido (dois toques, aba antiga, corrida já concluída em outro dispositivo) → o banco recusa a transição e a tela exibe a mensagem de erro real, sem alterar o estado local. *(premissa — confirme ou corrija: mostrar o erro cru do banco é aceitável nesta fase)*
- Envio de foto falha (rede caiu no meio do upload) → a corrida permanece em `EmTransito` e o parceiro pode repetir a ação, sem perder o passo já cumprido.

### US02: Decidir se vale a pena aceitar um frete

Como parceiro logístico, quero ver quanto ganho, quantos quilômetros e o retorno por quilômetro de cada corrida disponível, para aceitar sem fazer a conta de cabeça.

**Rules:**
- Cada corrida disponível exibe quatro números em destaque igual: valor líquido ao parceiro, R$/km, distância e duração estimada.
- R$/km é calculado sobre o valor líquido ao parceiro dividido pela distância em quilômetros.
- A lista continua ordenada por proximidade da origem em relação ao CEP base do parceiro, e a tela informa esse critério de ordenação.
- Corridas urgentes são marcadas visualmente.
- Corridas no modo leilão exibem o campo de lance no lugar do botão de aceite, e o valor mostrado nelas é o frete sugerido, não uma promessa de ganho.

**Edge cases:**
- Corrida sem distância calculada (publicada fora do despacho automático da migration `0043`) → distância, duração e R$/km exibem "—", e o valor líquido continua sendo exibido normalmente. A corrida **não** é escondida.
- Distância registrada menor que 100 metros → R$/km exibe "—", porque a divisão produziria um número sem significado.
- Corrida aceita por outro parceiro entre o carregamento da tela e o toque no botão → o banco recusa e a tela informa que a corrida não está mais disponível.
- Nenhuma corrida publicada no momento → estado vazio explícito, distinto de "carregando".

### US03: Manter visibilidade do que vem depois

Como parceiro logístico com mais de uma entrega em aberto, quero ver o resto da minha carga de trabalho de forma compacta, para saber o que me espera sem perder o foco da entrega atual.

**Rules:**
- Todas as corridas e rotas em andamento que não estão em foco aparecem em uma lista de uma linha cada, com trajeto e status.
- A lista informa o total de itens em andamento e o total de disponíveis no topo da tela.
- Itens dessa lista não expõem botões de ação — a ação acontece quando o item chega ao foco.

**Edge cases:**
- Apenas uma corrida em andamento → a lista "Depois" não é renderizada, em vez de aparecer vazia.
- Parceiro com muitos itens em andamento (acima de ~10) → a lista permanece rolável e de uma linha por item, sem paginação. *(premissa — confirme ou corrija: volume alto por parceiro é raro o bastante para não exigir paginação)*

## 4. Fluxo de Negócio

```
Parceiro abre /parceiro
   │
   ▼
Tem cadastro de parceiro?
   ├── não ──▶ Convite para cadastro
   └── sim ──▶ Cadastro Aprovado?
                 ├── não ──▶ Aviso "aguardando aprovação do marketplace"
                 └── sim ──▶ Tem corrida em andamento?
                               ├── sim ──▶ FOCO = corrida mais avançada na trilha
                               └── não ──▶ Tem rota atribuída?
                                             ├── sim ──▶ FOCO = primeira rota
                                             └── não ──▶ FOCO = convite a pegar corrida
                                          │
                                          ▼
                              Demais em andamento ──▶ lista "Depois" (1 linha cada)
                              Publicadas ──▶ lista "Disponíveis" com R$/km, ordenada por CEP
```

## 5. Critérios de Aceite

### 5a. Critérios de aceite da feature

| Critério | Razão de negócio | Como verificar (observável) |
|----------|------------------|-----------------------------|
| Em um celular de 390px de largura, o próximo passo da entrega atual está visível sem rolagem | o parceiro age no veículo, em segundos; se precisa rolar para achar a ação, ele não usa a tela e liga para o suporte | abrir `/parceiro` em viewport 390×844 com uma corrida em `Coletada`; o botão primário aparece na primeira dobra |
| O botão de ação primária tem no mínimo 44px de altura | uso com uma mão, em movimento; abaixo disso o toque erra | inspecionar a altura renderizada do botão |
| Cada corrida disponível com distância registrada exibe R$/km calculado | é o número que decide o aceite e hoje o parceiro calcula de cabeça | publicar corrida com distância conhecida e conferir o valor contra o cálculo manual |
| Corrida sem distância registrada aparece na lista com "—" nos campos derivados | esconder a corrida reduziria a oferta visível sem o parceiro saber | publicar corrida fora do despacho automático e conferir que ela é listada |
| O valor em destaque é o líquido ao parceiro em todas as corridas de modo `primeiro_aceita` | exibir o bruto gera expectativa de recebimento errada e disputa no repasse | comparar o número na tela com `valor_parceiro` da corrida |
| Nenhuma regra de transição de status muda: as mesmas transições aceitas e recusadas antes da feature continuam iguais | a máquina de estados é caminho de dinheiro e prova de entrega | executar o ciclo completo e tentar uma transição inválida; comportamento idêntico ao anterior |
| Parceiro sem cadastro e parceiro não aprovado continuam vendo suas telas de bloqueio, sem acesso a corridas | corrida só pode ser aceita por parceiro aprovado | acessar `/parceiro` com conta sem cadastro e com cadastro `Pendente` |

### 5b. Métricas de sucesso

| Métrica | Baseline (fonte) | Meta | Prazo | Mín. aceitável | Responsável |
|---------|-------------------|------|-------|-----------------|-------------|
| Tempo entre `Coletada` e `Entregue` na mesma corrida | A levantar (calculável de `auditoria_eventos`, ação `corrida.status`) | −15% | 60 dias após o lançamento | sem piora em relação ao baseline | Dono do produto |
| Taxa de corridas publicadas que são aceitas | A levantar (razão entre corridas `Publicada` e as que saem de `Publicada`, tabela `corridas`) | +10 p.p. | 60 dias após o lançamento | sem queda | Dono do produto |
| Corridas entregues sem foto de confirmação | 0 por construção (o banco exige) | 0 | contínuo | 0 | Dono do produto |

**Regras:**
- Os dois primeiros baselines existem no banco mas ainda não foram medidos; levantar antes do lançamento para que a comparação seja possível. *(premissa — confirme ou corrija: `auditoria_eventos` tem histórico suficiente para o baseline)*

## 6. Milestones

### Milestone 1: Entregar o painel de execução em campo

**Por que é um marco:** o parceiro passa a abrir o app e ver imediatamente o que fazer agora, com um botão só. É a mudança que se anuncia ao motorista, e sozinha ela já muda o uso da tela na rua.

**Funcionalidades:** US01, US03

**Checklist de aceite** (marcado pelo Aprovador após a implementação):
- [ ] Em viewport 390×844, o próximo passo da entrega atual está visível sem rolagem
- [ ] O botão de ação primária tem no mínimo 44px de altura
- [ ] Nenhuma regra de transição de status mudou: transições válidas e inválidas se comportam como antes
- [ ] Parceiro sem cadastro e parceiro não aprovado continuam vendo suas telas de bloqueio

**Aprovador:** Dono do produto

### Milestone 2: Entregar os números de decisão de aceite

**Por que é um marco:** o parceiro passa a comparar fretes por retorno em vez de por intuição, e a transportadora ganha a informação que hoje ela calcula em planilha. É o que torna a lista de disponíveis uma ferramenta de decisão.

**Funcionalidades:** US02

**Checklist de aceite** (marcado pelo Aprovador após a implementação):
- [ ] Cada corrida disponível com distância registrada exibe R$/km calculado corretamente
- [ ] Corrida sem distância registrada aparece na lista com "—" nos campos derivados
- [ ] O valor em destaque é o líquido ao parceiro em todas as corridas de modo `primeiro_aceita`

**Aprovador:** Dono do produto

## 7. Riscos e Dependências

| Risco | Impacto | Mitigação | Status |
|-------|---------|-----------|--------|
| **R1** — Aceite é uma disputa "quem clicar primeiro leva". Ao tornar a lista mais legível e o R$/km explícito, mais parceiros correm para as mesmas corridas boas e mais recebem o erro "não está mais disponível" | Médio | O erro já é tratado no banco e a tela o exibe. Se a frustração aparecer no suporte, avaliar reserva temporária em PRD próprio | Monitorando |
| **R2** — Distância e duração só existem em corridas criadas pelo despacho automático (`0043`); nas demais o R$/km fica em branco e o principal ganho da US02 não se materializa | Alto | Levantar antes do lançamento a proporção de corridas sem `distancia_m`. Se for alta, o Milestone 2 perde sentido sem antes preencher a distância na publicação | Pendente |
| **R3** — A proximidade por faixa de CEP não é distância real; um parceiro pode aceitar um frete "próximo" que está longe | Médio | A tela nomeia o critério como proximidade de CEP e não o apresenta como distância | Monitorando |
| **R4** — Base de parceiros aprovados pode ser pequena demais para as métricas de §5b terem significância | Médio | Levantar o número de parceiros ativos junto com os baselines; se for baixo, tratar as metas como direcionais | Pendente |

**Dependências:**

| Dependência | Tipo | Status | Impacto se bloqueado |
|-------------|------|--------|----------------------|
| Levantamento dos baselines de §5b | Interna | Pendente | Não bloqueia a entrega; bloqueia a avaliação de sucesso dos dois milestones |
| Proporção de corridas com `distancia_m` preenchida | Interna | Pendente | Bloqueia a decisão sobre o Milestone 2 |
| Escolha final da variante do protótipo | Interna | Resolvida — variante B com as métricas derivadas | — |

## 8. Referências

- [`src/app/(parceiro)/parceiro/prototype-variants.tsx`](../../src/app/(parceiro)/parceiro/prototype-variants.tsx) — protótipo navegável das duas alternativas; `/parceiro?variant=B` é a proposta deste PRD
- [`supabase/migrations/0039_parceiro_logistico_schema.sql`](../../supabase/migrations/0039_parceiro_logistico_schema.sql) — tabelas `corridas`, `rotas`, `corrida_posicoes` e as policies de leitura do parceiro
- [`supabase/migrations/0040_parceiro_logistico_rpcs.sql`](../../supabase/migrations/0040_parceiro_logistico_rpcs.sql) — máquina de estados da corrida e regras de aceite; nada aqui muda
- [`supabase/migrations/0043_despacho_automatico_corridas.sql`](../../supabase/migrations/0043_despacho_automatico_corridas.sql) — origem de `distancia_m`, `duracao_s` e `link_mapa`, os campos que alimentam a US02
- [`supabase/migrations/0083_comissao_plataforma_corrida.sql`](../../supabase/migrations/0083_comissao_plataforma_corrida.sql) — origem de `valor_parceiro`, o valor líquido exibido ao parceiro
- `PRDs/02-afiliado-logistica.pdf` e `PRDs/04-roteirizacao.pdf` — especificação funcional autoritativa do módulo logístico; conferir antes da implementação, o PRD em PDF vence em caso de divergência

## 9. Registro de Decisões

- **2026-07-28:** A corrida em foco é escolhida pelo sistema (mais avançada na trilha), não pelo parceiro. Motivo: uma decisão a menos para quem está dirigindo; na prática as entregas são executadas em sequência.
- **2026-07-28:** O valor em destaque é o líquido ao parceiro, não o frete bruto. Motivo: o bruto cria expectativa de recebimento diferente do repasse e vira atrito no financeiro.
- **2026-07-28:** R$/km é exibido mas não ordena a lista. Motivo: ordenar por retorno faria a plataforma parecer recomendar fretes, alterando a relação com o parceiro; a ordenação segue por proximidade.
- **2026-07-28:** Nenhuma regra de negócio da corrida entra no escopo. Motivo: a máquina de estados é caminho de dinheiro e prova de entrega; mudar apresentação e regra na mesma entrega impede saber a que atribuir qualquer efeito.
- **2026-07-28:** `depends_on` vazio. Motivo: o módulo logístico não pressupõe comportamento do bot de atendimento (PRD 001) nem do funil de leads (PRD 002); a relação com eles é apenas de mesmo produto.
