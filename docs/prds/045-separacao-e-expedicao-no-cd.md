---
prd_number: "045"
status: rascunho
priority: alta
created: 2026-09-21
issue: ""
depends_on: ["036", "039"]
references:
  - "docs/prds/039-custodia-e-operacao-do-cd-industria.md"
  - "docs/prds/036-ledger-estoque-multi-local.md"
  - "docs/specs/039-us04-separacao-expedicao.md"
  - "supabase/migrations/0177_estoque_reserva_no_pedido.sql"
  - "supabase/migrations/0187_reserva_consumida_na_entrega.sql"
  - "supabase/migrations/0190_cd_lojas_piloto_e_entrada_admin.sql"
  - "supabase/migrations/0191_guarda_estoque_e_repasse_em_pedido_entregue.sql"
---

# PRD 045: Separação e expedição no CD Indústria

## 1. Contexto

- **Produto/área**: fulfillment do Indústria 24h. Custódia de mercadoria de seller no CD próprio (CD Indústria Manaus), dentro do PRD 039.
- **Estado atual**: o CD existe com 10 posições cadastradas, o ledger de estoque registra entrada e saída por endereço, e o pedido já reserva estoque na criação. Uma loja piloto está admitida. O que **não** existe é o que acontece entre o pagamento e a saída da mercadoria pela porta: hoje ninguém no galpão recebe uma lista do que separar, de qual posição tirar, nem registra o que de fato saiu. O pedido vai de `Pagamento Realizado` a `Enviado` por uma decisão manual no painel, sem nada que ligue essa decisão ao físico.
- **Problema**: sem esse elo, a promessa de custódia não se sustenta na operação. O saldo do centro e a soma das posições divergem e ninguém sabe se é erro de sistema ou mercadoria fora do lugar; a falta só aparece quando o comprador reclama; e não há registro de quem separou o quê, então avaria e extravio (que por decisão da dona são do seller) não têm como ser apurados. É também o marco que a LP `/armazeneconosco` já anuncia ao seller.

> Contexto técnico (stack, schema, RPCs) vive no TRD e na spec técnica `docs/specs/039-us04-separacao-expedicao.md`.

## 2. Solução Proposta

### Visão de produto

- Todo pedido pago que tenha item em custódia gera automaticamente uma **ordem de separação**, com a lista do que tirar e de qual posição.
- O operador do CD trabalha por uma **fila**, confirmando item a item o que efetivamente pegou. Nada de digitar código de pedido ou UUID.
- **Falta é evento de primeira classe**: quando o físico não bate com o sistema, o operador registra ali, com motivo, e o sistema oferece posição alternativa quando existe saldo em outro lugar.
- A **expedição é um ato explícito**, só liberado quando a ordem está separada. É ela que move o pedido para `Enviado`.
- O seller enxerga o andamento do próprio pedido dentro do CD, sem poder alterar nada.

### Decisões de produto

1. **A posição de origem é escolhida no pedido, não na separação.** A saída do estoque já acontece na criação do pedido, e o CD exige endereço em todo lançamento. Alocar na separação exigiria um segundo livro (físico × disponível), que o desenho do ledger recusou de propósito. Consequência prática: o operador recebe a posição já definida e a separação confirma, não decide.
2. **Alocação por FIFO entre posições**, da mais antiga para a mais nova, podendo quebrar o mesmo item em duas posições. Mercadoria parada há mais tempo sai primeiro, que é o comportamento que o seller espera de um depósito e o que reduz risco de vencimento.
3. **Ordem parcial não expede sozinha.** Quando falta mercadoria, alguém decide explicitamente entre expedir o que tem ou cancelar — o sistema não escolhe. Decisão de dinheiro e de relação com o comprador não se resolve por default.
4. **Separação não gera lançamento novo no estoque.** A baixa já ocorreu na criação do pedido; a expedição apenas consome a reserva. Isso mantém um único livro e evita baixa em dobro.
5. **Cancelamento antes da expedição devolve à mesma posição de onde saiu**, não a um endereço genérico. Senão o galpão físico e o sistema divergem já no primeiro cancelamento.
6. **Operador do CD é `admin` na v1** *(premissa — confirme ou corrija)*. O papel não existe no schema, e criar um papel novo só para isso atrasaria o piloto. O registro de quem separou continua sendo feito por usuário, então a rastreabilidade não se perde.

### Fora do escopo

- **Recebimento e conferência de entrada no CD** (US03 do PRD 039): é o que abastece o galpão e vive em PRD próprio. Hoje a entrada é manual pelo admin.
- **Tarifação da armazenagem** (PRD 040): a ordem de separação não calcula nem cobra nada.
- **Etiqueta, romaneio e integração com transportadora**: a expedição aqui muda o estado do pedido; quem leva a mercadoria segue pelo fluxo de entrega já existente *(premissa — confirme ou corrija)*.
- **Coletor de código de barras e conferência por bipagem de EAN**: a v1 confirma por toque na tela. Bipagem entra quando houver volume que justifique *(premissa — confirme ou corrija)*.
- **Inventário cíclico do galpão**: a divergência achada na separação é registrada, mas a contagem periódica é outra feature *(premissa — confirme ou corrija)*.
- **Separação de item que está no estoque do próprio seller**: a ordem cobre só o que está em custódia.

## 3. Funcionalidades

### US01: Ordem de separação nasce com o pagamento

Como operador do CD, quero que todo pedido pago com item em custódia vire automaticamente uma ordem de separação, para não depender de alguém avisar que há trabalho a fazer.

**Rules:**
- A ordem é criada quando o pedido entra em `Pagamento Realizado`, sem ação humana.
- A ordem lista, por item: produto, quantidade e a posição de onde tirar.
- Um pedido com itens em mais de um centro gera uma ordem por centro.
- Pedido sem nenhum item em custódia não gera ordem.
- Gerar a ordem duas vezes para o mesmo pedido e centro não duplica nada.

**Edge cases:**
- Pedido pago cujo item em custódia não tem posição com saldo suficiente → a ordem é criada assinalada como pendência para o admin, e não entra na fila normal do operador *(premissa — confirme ou corrija)*.
- Pagamento confirmado depois de a reserva ter expirado → não gera ordem e registra a pendência, que é o tratamento que o sistema já dá hoje a esse caso.
- Pedido cancelado antes de qualquer item ser separado → a ordem vai para cancelada e some da fila.

### US02: Fila de separação do dia

Como operador do CD, quero ver numa lista tudo que precisa ser separado, na ordem em que foi pago, para trabalhar sem escolher e sem esquecer pedido.

**Rules:**
- A fila mostra as ordens abertas, em separação e parciais, da mais antiga para a mais recente por data de pagamento.
- Cada linha identifica o pedido, a quantidade de itens e as posições envolvidas.
- Ordem expedida ou cancelada sai da fila.

**Edge cases:**
- Fila vazia → a tela diz que não há separação pendente, sem parecer erro.
- Duas pessoas abrem a mesma ordem → ambas veem o andamento atualizado; a confirmação de um item já confirmado por outro é recusada com aviso, não gera dobra *(premissa — confirme ou corrija)*.

### US03: Confirmar o que foi separado, item a item

Como operador do CD, quero confirmar cada item conforme o retiro da posição, para que o sistema reflita o que realmente saiu da prateleira.

**Rules:**
- A confirmação é por item e exige usuário identificado; fica registrado quem confirmou e quando.
- A primeira confirmação coloca a ordem em separação.
- Quando todos os itens fecham na quantidade pedida, a ordem fica separada e o pedido passa a `Em Separação`.
- A quantidade confirmada nunca pode ser maior que a pedida.

**Edge cases:**
- Operador confirma quantidade menor que a pedida → é tratado como falta e exige motivo (US04).
- Operador confirma e depois percebe erro → pode desfazer enquanto a ordem não estiver expedida, com registro do desfazimento *(premissa — confirme ou corrija)*.
- Pedido é cancelado no meio da separação → a ordem trava para novas confirmações e exibe o motivo.

### US04: Registrar falta e buscar posição alternativa

Como operador do CD, quero registrar quando a prateleira não tem o que o sistema diz, para que a divergência vire informação em vez de sumir.

**Rules:**
- Toda falta exige motivo.
- Se houver saldo do mesmo produto em outra posição, o sistema oferece a alternativa e, ao usá-la, registra a transferência entre posições.
- Não havendo alternativa, a diferença é registrada como divergência de inventário na posição original e a ordem fica parcial.
- Saldo de posição nunca fica negativo.

**Edge cases:**
- A posição alternativa está bloqueada → não é oferecida.
- A quantidade encontrada é maior que a registrada no sistema → registra a sobra como divergência e segue com a quantidade do pedido *(premissa — confirme ou corrija)*.
- Falta em pedido de item único → a ordem vai direto a parcial e espera decisão (US05).

### US05: Decidir o destino da ordem parcial

Como administrador, quero decidir explicitamente o que fazer com um pedido que não pôde ser separado por inteiro, para que ninguém no galpão resolva sozinho uma questão comercial.

**Rules:**
- Ordem parcial não pode ser expedida sem uma decisão registrada.
- As decisões possíveis são expedir o que foi separado ou cancelar a ordem; ambas exigem motivo.
- A decisão fica registrada com autor e data.

**Edge cases:**
- Mercadoria reaparece antes da decisão → é possível voltar a separar e fechar a ordem normalmente.
- Decisão de cancelar um pedido cujo item já saiu fisicamente → recusada, porque mercadoria entregue não volta ao estoque nem estorna repasse.

### US06: Expedir

Como operador do CD, quero registrar a saída da mercadoria, para que o pedido avance e o estoque reservado seja baixado de vez.

**Rules:**
- Só ordem separada (ou parcial já decidida) pode ser expedida.
- Expedir move o pedido para `Enviado` e consome a reserva.
- A expedição não gera lançamento novo de estoque: a baixa já ocorreu na criação do pedido.
- Pedido com ordens em mais de um centro só vai a `Enviado` quando todas estiverem prontas.
- Fica registrado quem expediu e quando.

**Edge cases:**
- Tentativa de expedir ordem ainda em separação → recusada, com a lista do que falta confirmar.
- Pedido tem também item do estoque do próprio seller → a ordem do CD sozinha não leva o pedido a `Enviado` *(premissa — confirme ou corrija: o comportamento quando as duas origens coexistem precisa da decisão da dona)*.

### US07: Seller acompanha o próprio pedido dentro do CD

Como seller com mercadoria em custódia, quero ver em que pé está a separação do meu pedido, para responder ao comprador sem pedir informação ao Indústria.

**Rules:**
- O seller vê estado, itens e horários da ordem dos próprios pedidos, em modo somente leitura.
- O seller não vê ordem de pedido de outra loja.
- O seller não pode confirmar, expedir nem cancelar.

**Edge cases:**
- Seller acessa pedido sem item em custódia → a tela informa que aquele pedido não passa pelo CD.
- Ordem parcial ainda sem decisão → o seller vê que está aguardando decisão, com o motivo da falta.

## 4. Fluxo de Negócio

```
Pedido pago com item em custódia
   │
   ▼
Ordem de separação criada (itens + posição de origem)
   │
   ▼
Operador confirma item a item
   │
   ├── tudo conferido ──▶ Ordem separada ──▶ Expedir ──▶ Pedido Enviado
   │                                                        (reserva consumida)
   └── falta ──▶ Tem saldo em outra posição?
                    ├── sim ──▶ Transfere e confirma ──▶ (volta ao fluxo)
                    └── não ──▶ Divergência registrada ──▶ Ordem parcial
                                                              │
                                                    Decisão do admin
                                                     ├── expedir o que tem
                                                     └── cancelar (devolve à posição de origem)
```

## 5. Critérios de Aceite

### 5a. Critérios de aceite da feature

| Critério | Razão de negócio | Como verificar (observável) |
|----------|------------------|-----------------------------|
| Pedido pago com item em custódia aparece na fila de separação sem ação humana | Se depender de alguém criar, o pedido para no galpão e o SLA de entrega estoura | Pagar um pedido no sandbox e ver a ordem surgir na fila |
| Gerar a ordem duas vezes para o mesmo pedido não duplica itens | Ordem duplicada faz a mercadoria sair duas vezes | Disparar a geração duas vezes e conferir que há uma ordem só |
| Expedir ordem não separada é recusado | É o que impede mercadoria sair sem conferência | Tentar expedir com item pendente e receber recusa nomeando o que falta |
| Após expedir: pedido `Enviado`, reserva consumida e **nenhum lançamento novo de estoque** | Lançamento na expedição baixaria o estoque duas vezes | Comparar o ledger antes e depois da expedição |
| Depois de separação e expedição, saldo do centro e soma das posições batem (paridade zero) | Divergência permanente torna o estoque do CD não confiável e inviabiliza cobrar armazenagem | Rodar a conferência de paridade após o ciclo completo |
| Saldo de qualquer posição nunca fica negativo | Saldo negativo é sintoma de baixa em dobro e destrói a apuração de avaria | Registrar falta com e sem alternativa e conferir os saldos |
| Dois pedidos disputando a última unidade da mesma posição: só um passa | Vender duas vezes a mesma unidade gera cancelamento e perda de confiança | Dois checkouts simultâneos do último item |
| Cancelar pedido separado devolve à **mesma** posição de origem | Devolver a endereço genérico desalinha físico e sistema já no primeiro cancelamento | Cancelar e conferir a posição que recebeu de volta |
| Seller não enxerga ordem de pedido de outra loja | Vazamento entre sellers concorrentes | Autenticar como seller B e tentar ler ordem do seller A |
| Toda confirmação, falta e expedição registra autor e horário | Avaria e extravio são do seller por contrato: sem autoria não há como apurar | Conferir o registro após cada ação |

### 5b. Métricas de sucesso

| Métrica | Baseline (fonte) | Meta | Prazo | Mín. aceitável | Responsável |
|---------|-------------------|------|-------|-----------------|-------------|
| Divergência entre saldo do centro e soma das posições | A levantar após o primeiro recebimento real (hoje o CD tem saldo zero, então não há baseline) | 0 unidades | 30 dias após o primeiro pedido separado | 0 em regime; qualquer divergência persistente reprova | Dona |
| Pedidos em custódia expedidos sem falta | A levantar (não há histórico) | 95% | 60 dias de piloto | 85% | Dona |
| Tempo entre pagamento e expedição | A levantar | A definir com o volume do piloto | — | — | Dona |

## 6. Milestones

### Milestone 1: Colocar o galpão na fila

**Por que é um marco:** é quando o CD deixa de ser uma tabela e passa a ter operação. Pela primeira vez alguém no galpão abre uma tela, vê o que separar e de onde tirar, e o pedido caminha por causa disso.

**Funcionalidades:** US01, US02, US03, US06

**Checklist de aceite:**
- [ ] Pedido pago com item em custódia aparece na fila sem ação humana
- [ ] Gerar a ordem duas vezes não duplica itens
- [ ] Expedir ordem não separada é recusado
- [ ] Após expedir: pedido `Enviado`, reserva consumida, nenhum lançamento novo de estoque
- [ ] Paridade zero após o ciclo completo
- [ ] Dois pedidos disputando a última unidade: só um passa
- [ ] Toda confirmação e expedição registra autor e horário

**Aprovador:** Dona

### Milestone 2: Tratar a realidade do galpão

**Por que é um marco:** o estoque passa a admitir que a prateleira erra. A divergência vira informação com motivo e autor, em vez de sumir, e a decisão sobre pedido incompleto passa a ter dono.

**Funcionalidades:** US04, US05

**Checklist de aceite:**
- [ ] Saldo de posição nunca fica negativo
- [ ] Falta com alternativa registra a transferência entre posições
- [ ] Ordem parcial não expede sem decisão registrada, com motivo e autor
- [ ] Cancelar pedido separado devolve à mesma posição de origem

**Aprovador:** Dona

### Milestone 3: Dar visibilidade ao seller

**Por que é um marco:** é a parte que o seller vê. Ele deixa de perguntar ao Indústria em que pé está o pedido, e passa a poder responder ao comprador sozinho — o que a LP `/armazeneconosco` já promete.

**Funcionalidades:** US07

**Checklist de aceite:**
- [ ] Seller vê estado, itens e horários da ordem dos próprios pedidos
- [ ] Seller não enxerga ordem de pedido de outra loja
- [ ] Seller não consegue confirmar, expedir nem cancelar

**Aprovador:** Dona

## 7. Riscos e Dependências

| Risco | Impacto | Mitigação | Status |
|-------|---------|-----------|--------|
| Não há mercadoria em custódia: o CD tem saldo zero e produto ainda não pode ser apontado para ele | Alto | Sem recebimento (US03 do 039) não há o que separar em produção; validar por pedido de teste no sandbox com entrada manual | Pendente |
| Alteração no caminho do dinheiro: a alocação de posição mexe na criação do pedido | Alto | Migration própria, testada com begin/rollback contra produção, como foi feito na 0191 | Pendente |
| Papel de operador do CD não existe; usar admin dá a uma pessoa de galpão acesso ao painel inteiro | Médio | Aceito na v1 pelo tamanho do piloto; revisar antes de abrir para mais lojas | Monitorando |
| Pedido misto (custódia + estoque do seller) sem regra fechada | Médio | Decidir com a dona antes do Milestone 1; hoje é premissa | Pendente |
| Operação em papel na prática: o galpão separa e registra depois, em lote | Médio | Registro exige autor e horário por item; acompanhar o intervalo entre confirmações no piloto | Monitorando |

**Dependências:**

| Dependência | Tipo | Status | Impacto se bloqueado |
|-------------|------|--------|----------------------|
| PRD 039, custódia e operação do CD | Interna | Rascunho, com M1 e M2 em produção | Esta feature é a US04 dele; sem o CD e as posições não há separação |
| PRD 036, ledger de estoque multi-local | Interna | Em produção | A regra de baixa única e a reserva vêm de lá; mudança nele reabre o desenho |
| Recebimento no CD (US03 do 039) | Interna | Não especificado | Sem entrada de mercadoria, nenhum milestone pode ser validado com dado real |
| Decisão da dona sobre operador do CD e pedido misto | Interna | Pendente | Milestone 1 |
| Contrato de depósito | Externa | Pendente | Bloqueia a operação real com seller, não a construção |

## 8. Referências

- [PRD 039, custódia e operação do CD](039-custodia-e-operacao-do-cd-industria.md) — esta feature é a US04 dele
- [PRD 036, ledger de estoque multi-local](036-ledger-estoque-multi-local.md) — origem da regra de baixa única e da reserva
- [PRD 040, tarifação da armazenagem](040-tarifacao-da-armazenagem.md) — cobra pelo que está guardado; a separação é o que faz a mercadoria sair
- [Spec técnica da US04](../specs/039-us04-separacao-expedicao.md) — desenho de tabelas, estados e RPCs
- `supabase/migrations/0177_estoque_reserva_no_pedido.sql` — reserva criada no pedido
- `supabase/migrations/0187_reserva_consumida_na_entrega.sql` — consumo da reserva na entrega
- `supabase/migrations/0191_guarda_estoque_e_repasse_em_pedido_entregue.sql` — guarda que impede devolver ao estoque item entregue

## 9. Registro de Decisões

- **2026-09-21:** A posição de origem é escolhida no pedido, não na separação. Motivo: a baixa do estoque acontece na criação do pedido e o CD exige endereço em todo lançamento; alocar na separação exigiria um segundo livro que o ledger recusou de propósito.
- **2026-09-21:** Alocação FIFO entre posições, podendo quebrar o item em duas. Motivo: mercadoria mais antiga sai primeiro, reduzindo risco de vencimento e correspondendo ao que o seller espera de um depósito.
- **2026-09-21:** Ordem parcial não expede sem decisão explícita. Motivo: escolher entre entregar incompleto e cancelar é decisão comercial, não de galpão.
- **2026-09-21:** Cancelamento devolve à mesma posição de origem. Motivo: devolver a endereço genérico desalinharia físico e sistema no primeiro cancelamento.
- **2026-09-21:** `depends_on` = 039 e 036. Motivo: o 039 define o CD, as posições e a custódia que esta feature opera; o 036 define a reserva e a regra de baixa única, que ela pressupõe. O 040 é referência, não dependência: tarifação não condiciona a separação.
- **2026-09-21:** Operador do CD = admin na v1 *(premissa)*. Motivo: o papel não existe no schema e criá-lo atrasaria o piloto; a rastreabilidade se mantém porque o registro é por usuário.
