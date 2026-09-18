---
prd_number: "039"
status: rascunho
priority: alta
created: 2026-09-16
issue: ""
depends_on: ["036", "010"]
references:
  - "supabase/migrations/0175_estoque_ledger_milestone1.sql"
  - "supabase/migrations/0176_estoque_enderecos_armazenagem.sql"
  - "supabase/migrations/0177_estoque_reserva_no_pedido.sql"
  - "supabase/migrations/0178_cd_industria_manaus.sql"
  - "supabase/migrations/0181_estoque_enderecos_lote.sql"
  - "docs/prds/036-ledger-estoque-multi-local.md"
  - "docs/prds/040-tarifacao-da-armazenagem.md"
  - "docs/prd/centro-distribuicao-fulfillment.md"
  - "src/app/(seller)/seller/centros/page.tsx"
---

# PRD 039: Custódia de mercadoria no CD Indústria

## 1. Contexto

- **Produto/área**: serviço de armazenagem do marketplace Indústria 24h. Cobre a guarda de mercadoria de terceiro: receber, endereçar, separar e expedir com registro de quem fez cada etapa.
- **Estado atual (verificado em produção em 16/09/2026)**:
  - O ledger de estoque existe (`0175`): toda alteração de saldo vira lançamento imutável com tipo, origem, motivo, autor e centro. São 143 lançamentos, um por produto, todos do seed da migração. Paridade com `produtos.estoque_atual` em zero divergentes.
  - Existem 21 centros de distribuição, **todos `tipo = 'seller'`**. Nenhum é do marketplace. Só 5 têm localização preenchida e só 1 tem endereço em Manaus, e é de seller. **O piloto não tem onde acontecer.**
  - O endereço estruturado dentro do centro já foi construído (`0176`: posições com rua, prédio, nível e apartamento, bloqueio com motivo, CEP obrigatório em centro do marketplace), mas nenhum caminho de produção grava mercadoria em endereço ainda, porque não existe recebimento.
  - Os status de pedido `Em Separação` (1 pedido) e `Enviado` (2 pedidos) já existem em produção, mas são rótulos escolhidos à mão, sem operação por trás.
- **Estado medido em produção em 18/09/2026** (substitui a medição de 16/09 acima onde divergir):
  - O CD do marketplace existe: `CD Indústria Manaus`, `tipo = 'industria'`, Ativo, CEP 69088067 (`0178`).
  - Ele tem **10 posições** cadastradas, todas num único lote de 17/09 13:52 (cadastro em lote da `0181`), nenhuma bloqueada. A memória de "0 posições" é de antes da `0181`. Há mais 1 posição num CD de seller (`manaus-agro`).
  - Nenhuma posição tem saldo: `estoque_saldos_endereco` vazia e zero lançamentos com endereço. O galpão existe no cadastro, mas nada entrou nele.
  - Reservas (`0177`, em produção): 199 `confirmada` (29.258 un), 96 `liberada` (5.670 un), 2 `consumida` (2 un), nenhuma `ativa`. Das 199 confirmadas, 198 estão em pedido `Pagamento Realizado` e 1 em `Em Separação`. Em 123 dos 135 pedidos com reserva confirmada todo item já foi entregue (29.057 un): a reserva nunca resolve porque a entrega não passa pelo status `Enviado`. Correção na `0187` (ainda não aplicada).
  - Pedidos: 91 `Aguardando Pagamento` (todos sem reserva, o mais novo de 06/07/2026, legado do Bubble), 140 `Pagamento Realizado`, 1 `Em Separação`, 2 `Enviado`, 89 `Cancelado`. Os 3 em separação/enviado têm 1 reserva cada. `pedidos.status_pedido` só admite esses 5 valores: não existe `Entregue` nem `Retirado` como status de pedido; a entrega vive em `entregas.status` por item.
  - Ledger: 1.038 lançamentos, 808 de venda futura. Paridade com `produtos.estoque_atual` (sobre `venda_futura_id is null` e sobre `estoque_saldos`) em **zero divergentes**.
- **Problema**: o marketplace decidiu guardar mercadoria de fabricante pequeno e hoje não consegue registrar nenhuma etapa disso. Não sabe dizer quanto de material de um seller está sob sua guarda, o que foi conferido na entrada, o que já foi prometido a um comprador e o que saiu. Sem esse registro, guardar mercadoria de terceiro não é serviço, é passivo: quando o seller diz que enviou 500 e o sistema diz 480, a diferença sai do bolso do marketplace e não há como reconstruir quem tem razão.

> Contexto técnico (stack, arquitetura, padrões) vive no TRD. Aqui só o ponteiro para as migrations que já existem.

## 2. Solução Proposta

### Visão de produto

- A mercadoria de terceiro entra por um **aviso de recebimento** que o seller cria antes de despachar, e não por lançamento avulso de estoque: o marketplace passa a saber o que está esperando.
- O que credita saldo ao seller é a **conferência física na entrada**, feita por um operador identificado, nunca o número que o seller declarou. Divergência vira registro visível, não ajuste silencioso.
- Mercadoria conferida só vira saldo vendável depois de **endereçada** numa posição do galpão, para que alguém consiga achá-la sem depender da memória de quem guardou.
- Pedido pago de produto em custódia gera **ordem de separação** com posição de origem, e a expedição é o momento da baixa definitiva no ledger.
- O seller acompanha tudo num **painel de custódia**, que é o que sustenta a confiança necessária para ele entregar mercadoria ao marketplace.

### Decisões de produto

1. **A mercadoria no CD continua sendo do seller.** O Indústria é depositário, não comprador: não há compra de estoque nem transferência de titularidade, e o que se cobra é serviço. Confirmado com a dona em 16/09.
2. **A conferência de entrada é a que vale.** O saldo creditado é o conferido, e a diferença contra o declarado fica registrada com motivo e foto.
3. **Pedido de produto em custódia não é expedido pelo seller.** Quem separa e expede é a operação do CD; o seller vê o andamento e não executa.
4. **Endereçamento é obrigatório no CD do Indústria e opcional no CD do seller.** Quem guarda no próprio depósito não precisa inventar rua e prédio; quem opera galpão de terceiro precisa. Já valendo no banco desde a `0176`.
5. **Nenhuma etapa aceita autor anônimo.** Conferência, endereçamento, separação e expedição registram quem fez, porque custódia sem autor não se sustenta numa disputa com o seller.
6. **Loja sem contrato de armazenagem não recebe.** A operação recusa o aviso de recebimento em vez de guardar de graça e cobrar depois.

### Fora do escopo

- **Reserva no pedido.** É o Milestone 2 do PRD 036 e pré-requisito deste PRD, não parte dele. Enquanto o pedido baixar o saldo na criação em vez de reservar, não existe "separar o que foi prometido".
- **Tarifação da armazenagem.** É o PRD 040, que depende deste.
- Lote, validade e FEFO. Entram com perecíveis (PRD 010) sobre a mesma estrutura de custódia; aqui a separação é FIFO por endereço. *(premissa — confirme ou corrija)*
- Código de barras, coletor e conferência por leitura. A v1 confere na tela, digitando quantidade.
- Cross-docking e consolidação de carga entre lojas.
- Inventário cíclico programado. A v1 tem contagem sob demanda, que já gera ajuste com motivo.
- Emissão de nota fiscal de remessa e de retorno simbólico. É bloqueio contábil externo, tratado como dependência.
- Operação de mais de um CD Indústria simultâneo.

## 3. Funcionalidades

> Os IDs de US e de Milestone são preservados do rascunho anterior deste PRD, que também cobria reserva e tarifação. A reserva voltou a viver só no PRD 036 e a tarifação virou o PRD 040, então US01, US05, Milestone 1 e Milestone 4 não existem aqui. Renumerar quebraria o único propósito de ID estável, que é sobreviver a mudança de escopo.

### US02: Endereço de armazenagem dentro do centro

Como operação do CD, quero que cada quantidade tenha posição física, para guardar e achar a mercadoria sem depender da memória de quem guardou.

**Rules:**
- O centro tem endereços de armazenagem com identificação estruturada (rua, prédio, nível, apartamento) e um código legível derivado dela, nunca digitado à parte.
- O centro do marketplace exige CEP estruturado, porque é dele que sai o prazo e o custo de entrega.
- Saldo em CD do Indústria pertence a um endereço; saldo em CD de seller pode ficar sem endereço.
- Um endereço guarda mais de um produto e um produto ocupa mais de um endereço.
- Endereço pode ser bloqueado, sempre com motivo, e endereço bloqueado não recebe mercadoria nova.

**Edge cases:**
- Tentativa de excluir endereço com saldo → bloqueada, com o saldo real na mensagem e instrução de transferir antes.
- Endereço duplicado no mesmo centro → rejeitado.
- Saída de endereço bloqueado → permitida, porque é assim que se esvazia uma posição avariada.
- Produto em CD do Indústria sem endereço, herdado de uma virada → entra numa fila de "a endereçar" e não é vendido até ser endereçado.

### US03: Aviso de recebimento e conferência de entrada

Como seller, quero anunciar o que vou enviar ao CD e acompanhar a conferência, para saber exatamente quanto do meu material o marketplace assumiu.

**Rules:**
- O seller cria um aviso de recebimento com produtos e quantidades declaradas e recebe um identificador para acompanhar a carga.
- O aviso tem ciclo: rascunho, anunciado, em conferência, conferido, cancelado.
- A conferência registra a quantidade recebida por produto, sempre com operador identificado.
- Só a quantidade conferida vira lançamento de entrada no ledger, com referência ao aviso.
- Divergência entre declarado e conferido é registrada com motivo e foto, e fica visível ao seller sem ele pedir.
- Mercadoria conferida só vira saldo disponível depois de endereçada.
- Loja sem contrato de armazenagem não consegue anunciar carga.

**Edge cases:**
- Chegou produto que não estava no aviso → registrado como item não anunciado, conferido à parte, sem virar saldo até o seller confirmar.
- Chegou mais do que o anunciado → o excedente segue a regra do item não anunciado.
- Aviso anunciado cuja mercadoria nunca chega → expira em 30 dias e é cancelado, sem afetar saldo. *(premissa — confirme ou corrija)*
- Produto avariado na chegada → entra como avaria, não como saldo vendável, e conta na divergência.
- Seller cancela o aviso depois da carga ter chegado → cancelamento recusado, porque a mercadoria já está sob guarda.

### US04: Separação e expedição

Como operação do CD, quero uma lista do que separar e de onde, para expedir o pedido certo sem procurar mercadoria no galpão.

**Rules:**
- Pedido pago com item em custódia gera ordem de separação com produto, quantidade e endereço de origem.
- A separação é confirmada por operador identificado, item a item.
- A expedição converte a reserva em baixa definitiva no ledger, com referência ao pedido, e move o pedido para `Enviado`.
- Pedido sem reserva ativa não é expedido, e a tela mostra o pedido e o motivo registrado da liberação.
- Devolução gera lançamento de entrada com motivo de devolução, nunca reversão do lançamento original.

**Edge cases:**
- Endereço indicado está vazio na hora de separar → o operador registra a falta, o sistema sugere outro endereço com saldo e a diferença vira divergência de inventário.
- Separação parcial → o pedido fica em separação pendente; nada é expedido pela metade sem decisão explícita.
- Pedido cancelado depois de separado e antes de expedido → a mercadoria volta ao endereço com lançamento de entrada e motivo.
- Pedido com item em custódia e item do estoque do próprio seller → cada origem tem sua ordem, e o pedido só é expedido quando as duas fecham. *(premissa — confirme ou corrija)*

### US06: Painel de custódia para o seller

Como seller, quero ver quanto do meu material está no CD do Indústria e o que já foi prometido, para conferir contra o meu controle sem abrir chamado.

**Rules:**
- Mostra por produto: saldo em custódia, reservado, disponível e em conferência.
- Mostra os avisos de recebimento e o resultado de cada conferência, com as divergências.
- O seller vê apenas as próprias lojas.

**Edge cases:**
- Seller sem nada em custódia → estado vazio explicando como enviar mercadoria ao CD.
- Produto com saldo em CD próprio e em CD do Indústria → as duas origens aparecem separadas, nunca somadas em silêncio.
- Divergência de conferência em aberto → aparece destacada, com o que fazer para resolver.

## 4. Fluxo de Negócio

```
Seller anuncia carga (aviso de recebimento)
   │
   ▼
Loja tem contrato de armazenagem?
   ├── não ──▶ Aviso recusado
   └── sim ──▶ Mercadoria chega ao CD ──▶ Conferência por operador
                    │
                    ├── divergência ──▶ registro com motivo e foto, visível ao seller
                    ├── avaria ──────▶ entra como avaria, não vendável
                    ▼
              Entrada no ledger (só o conferido)
                    │
                    ▼
              Endereçada? ──┬── não ──▶ fila "a endereçar", não é vendida
                            └── sim ──▶ Saldo disponível
                                            │
                                            ▼
                                   Pedido pago ──▶ Ordem de separação (produto, qtd, posição)
                                            │
                                            ▼
                                   Posição tinha o saldo?
                                     ├── não ──▶ falta registrada, outra posição sugerida,
                                     │            diferença vira divergência de inventário
                                     └── sim ──▶ Separado ──▶ Expedido ──▶ baixa no ledger
                                                                  │
                                                                  ▼
                                                            Devolução? ──▶ entrada com motivo
```

## 5. Critérios de Aceite

### 5a. Critérios de aceite da feature

| Critério | Razão de negócio | Como verificar (observável) |
|----------|------------------|-----------------------------|
| Saldo em custódia de um seller é igual à soma dos lançamentos de recebimento menos expedições, devoluções e ajustes | É a conta que o seller vai fazer, e divergência aqui é dívida do marketplace com ele | Query de conferência por loja, com zero divergentes |
| Nenhum caminho de escrita produz saldo negativo por produto e endereço | Expedir o que não existe custa o pedido e a mercadoria de terceiro | Teste de concorrência com o último item disponível em separação e em compra |
| Toda quantidade creditada ao seller tem operador identificado na conferência | Custódia sem autor não se sustenta numa disputa | Query: zero conferências com operador nulo |
| Toda divergência de conferência fica visível ao seller sem ele pedir | Divergência descoberta na fatura, e não na entrada, destrói a relação | Abrir o painel do seller com uma divergência real registrada |
| Pedido com item em custódia não é expedido sem ordem de separação confirmada | Expedir sem separar é como o estoque some | Tentativa de expedição direta rejeitada, com mensagem |
| Mercadoria conferida e não endereçada não é vendida na vitrine | Vender o que ninguém acha no galpão gera atraso e disputa | Conferir carga sem endereçar e confirmar que o produto não fica disponível |
| Seller não acessa custódia nem aviso de loja que não é dele | Vazamento entre concorrentes do mesmo marketplace | Teste de acesso com dois sellers |
| Painel de custódia carrega em menos de 2 segundos com 12 meses de movimentação | Acima disso o seller para de conferir e volta a abrir chamado | Medir com o produto de maior volume do piloto |

### 5b. Métricas de sucesso

| Métrica | Baseline (fonte) | Meta | Prazo | Mín. aceitável | Responsável |
|---------|-------------------|------|-------|-----------------|-------------|
| Divergência entre conferido e declarado nos avisos de recebimento | A levantar (não existe recebimento hoje) | Menor que 2% das unidades | 60 dias após o Milestone 3 | Menor que 5% | Operação |
| Sellers com mercadoria em custódia no CD Manaus | 0 (nenhum CD do marketplace existe) | 5 | 90 dias após o Milestone 3 | 2 | Captação |
| Prazo entre pagamento e expedição de pedido em custódia | A levantar (2 pedidos `Enviado` hoje, sem processo) | Menor que 24h úteis | 60 dias após o Milestone 3 | Menor que 48h úteis | Operação |
| Pedidos expedidos sem ordem de separação | — | Zero | Desde o Milestone 3 | Zero | Operação |
| Chamados de seller sobre mercadoria em custódia | A levantar (Operação, histórico de atendimento) | Menor que 1 por seller por mês | 90 dias após o Milestone 3 | Menor que 2 | Operação |

## 6. Milestones

### Milestone 2: O CD Indústria de Manaus existe e tem posições

**Por que é um marco:** hoje o piloto não tem onde acontecer. Ao fim deste marco existe um centro operado pelo marketplace, em Manaus, com CEP e com posições cadastradas, e a captação passa a ter o que oferecer ao fabricante que não tem depósito. É o menor passo que transforma o serviço de intenção em lugar.

**Funcionalidades:** US02

**Checklist de aceite:**
- [ ] Existe um centro operado pelo marketplace em Manaus, com CEP, cadastrado em produção
- [ ] Posições de armazenagem cadastradas e visíveis na tela do centro
- [ ] Endereço com saldo não pode ser excluído
- [ ] Endereço bloqueado não recebe mercadoria nova e ainda pode ser esvaziado

**Aprovador:** Dona do produto

### Milestone 3: Custódia de ponta a ponta

**Por que é um marco:** é o primeiro momento em que o marketplace guarda mercadoria de terceiro com registro completo, do anúncio da carga à expedição, e o seller consegue conferir sozinho. A partir daqui a armazenagem é serviço prestado, e não promessa de captação.

**Funcionalidades:** US03, US04, US06

**Checklist de aceite:**
- [ ] Um aviso de recebimento real percorrido do anúncio à conferência, com divergência registrada e visível ao seller
- [ ] Um pedido de produto em custódia separado e expedido pela operação, com baixa no ledger
- [ ] Pedido sem reserva ativa não é expedido
- [ ] Mercadoria conferida e não endereçada não aparece na vitrine
- [ ] Saldo em custódia bate com a soma dos lançamentos para 100% das lojas do piloto
- [ ] Painel de custódia abaixo de 2 segundos no produto de maior volume

**Aprovador:** Dona do produto

## 7. Riscos e Dependências

| Risco | Impacto | Mitigação | Status |
|-------|---------|-----------|--------|
| Guardar mercadoria de terceiro sem nota fiscal de remessa correta expõe o marketplace fiscalmente | Alto | Bloqueio explícito do Milestone 3: validação contábil antes do primeiro recebimento real | Em aberto |
| Perda, avaria ou furto de mercadoria sob custódia sem cobertura contratual | Alto | Contrato de depósito e seguro definidos antes do primeiro recebimento; sem contrato assinado, não recebe | Em aberto |
| O CD do Indústria em Manaus não existe fisicamente, nem próprio nem 3PL | Alto | Decisão da dona antes do Milestone 2; o software do marco já está pronto e espera o endereço | Em aberto |
| Operação sem pessoa dedicada: conferência e separação exigem alguém no galpão | Médio | Definir o operador do piloto junto com o CD; o sistema exige autor identificado e não aceita operação anônima | Em aberto |
| Seller enviar mercadoria e o piloto parar no meio | Médio | Piloto começa com no máximo 2 sellers e volume combinado, com saída documentada e devolução prevista | Pendente |
| Divergência silenciosa entre custódia e contagem física | Médio | Contagem sob demanda gerando ajuste com motivo, e conferência diária de paridade nos 30 primeiros dias | Pendente |
| Custódia dividida com estoque próprio do seller confundir o vendedor sobre o que sai de onde | Médio | Painel mostra as origens separadas e nunca soma em silêncio | Pendente |

**Dependências:**

| Dependência | Tipo | Status | Impacto se bloqueado |
|-------------|------|--------|----------------------|
| PRD 036, Milestone 1 (ledger de movimentações) | Interna | Em produção desde 16/09/2026 | — |
| PRD 036, Milestone 2 (reserva no pedido) | Interna | Em produção desde 16/09/2026 (`0177`) | — A expedição consome a reserva. Lacuna: reserva de pedido entregue sem passar por `Enviado` fica aberta; corrigida na `0187`, pendente de aplicação |
| Posições do CD Manaus | Interna | 10 posições desde 17/09/2026 (`0181`), sem saldo | Recebimento (US03) é o próximo passo, não mais cadastro |
| Definição do CD do Indústria em Manaus | Externa | Em aberto | Bloqueia o Milestone 2 na prática, ainda que o software esteja pronto |
| Validação contábil do fluxo fiscal de mercadoria de terceiro | Externa | Em aberto | Bloqueia o Milestone 3 |
| Contrato de depósito e seguro | Externa | Em aberto | Bloqueia o Milestone 3 |
| PRD 040 (tarifação da armazenagem) | Interna | Rascunho | Não bloqueia: a regra de "loja sem contrato não recebe" precisa do contrato definido lá, e até existir a operação recebe só do piloto combinado |
| PRD 010 (perecíveis) | Interna | Rascunho | Lote e validade entram depois, sobre a mesma estrutura de custódia |

## 8. Referências

- [PRD 036](036-ledger-estoque-multi-local.md) — ledger de estoque e reserva no pedido; este PRD pressupõe os dois
- [PRD 040](040-tarifacao-da-armazenagem.md) — cobrança pelo serviço de guardar, que depende desta custódia
- [PRD 010](010-termos-produtos-pereciveis.md) — perecíveis, lote e validade
- `supabase/migrations/0175_estoque_ledger_milestone1.sql` — ledger, saldo por centro e ajuste com motivo
- `supabase/migrations/0176_estoque_enderecos_armazenagem.sql` — posições de armazenagem, CEP do centro e as guardas de endereço (US02 já construída)
- `supabase/migrations/0177_estoque_reserva_no_pedido.sql` — reserva no pedido (M2 do 036), em produção
- `supabase/migrations/0187_reserva_consumida_na_entrega.sql` — reserva consumida na entrega confirmada (não aplicada)
- `docs/specs/039-us04-separacao-expedicao.md` — spec técnica da US04
- `docs/prd/centro-distribuicao-fulfillment.md` — PRD original de fulfillment exportado do Confluence (MPDD-31), anterior à numeração
- `src/app/(seller)/seller/centros/page.tsx` — tela do centro, onde as posições aparecem

## 9. Registro de Decisões

- **2026-09-16:** Custódia virou PRD próprio em vez de crescer dentro do 036. Motivo: o 036 declara endereçamento e recebimento explicitamente fora de escopo, e ele é sobre saldo auditável, que tem valor mesmo se o CD nunca sair do papel. Juntos, o ledger ficaria esperando decisões fiscais e contratuais que não são dele.
- **2026-09-16:** A reserva no pedido saiu deste PRD e voltou a viver só no 036, como Milestone 2 dele. Motivo: ela passa sozinha no teste de auto-suficiência e já tinha marco próprio lá; mantê-la nos dois criaria dois lugares onde a mesma regra se explica, e a primeira mudança de premissa faria os dois divergirem. A dependência fica no `depends_on` e no quadro de dependências, que é onde ela pertence.
- **2026-09-16:** A tarifação saiu deste PRD e virou o PRD 040. Motivo: cobrar pelo serviço se explica sozinho, tem receita e contrato próprios e depende da custódia sem fazer parte dela. Junto, arrastava a discussão de preço para antes de a operação existir.
- **2026-09-16:** IDs de US e Milestone preservados do rascunho anterior, o que deixa lacunas (não há US01, US05, Milestone 1 nem Milestone 4). Motivo: ID estável só serve se sobreviver a mudança de escopo; renumerar por estética quebraria a única função dele.
- **2026-09-16:** Mercadoria em custódia permanece do seller e o marketplace é depositário. Confirmado com a dona. Motivo: comprar estoque mudaria modelo de negócio, capital de giro e regime fiscal, e nada no objetivo original pede isso.
- **2026-09-16:** `depends_on` definido como 036 e 010 por dependência real: o 036 traz o ledger que registra cada etapa e a reserva que a separação consome; o 010 traz lote e validade, que esta estrutura vai receber. O 040 não entra em `depends_on` porque a dependência é na direção oposta.
- **2026-09-16:** Número 039 mantido do rascunho anterior, já que é o mesmo documento com escopo recortado.
- **2026-09-18:** §7 corrigida: o Milestone 2 do 036 (reserva no pedido) está em produção desde 16/09 (`0177`), e deixou de bloquear o Milestone 3. O bloqueio real passou a ser externo (fiscal, contrato) e o recebimento (US03).
- **2026-09-18:** Estado do CD medido no banco: 10 posições (lote da `0181`, 17/09), zero saldo por endereço. As memórias divergiam (0 contra 10) porque a de 0 é anterior à `0181`.
- **2026-09-18:** Reserva passa a ser consumida quando todo item do pedido é entregue (`entregas.status` ou a flag legada `linha_itens.entregue`), mesmo critério que libera repasse na `0158`. Motivo: o status do pedido não tem `Entregue` nem `Retirado`, e a confirmação por código mantém o pedido em `Pagamento Realizado`, então 123 pedidos entregues seguravam 29.057 un como reservadas. `Em Separação` passa a confirmar reserva ativa. Migration `0187`, testada em transação revertida, não aplicada.
- **2026-09-18:** Há dois PRDs 041 em master (`041-saude-e-vigilancia-do-estoque`, entrou primeiro via #678; `041-taxonomia-importavel-e-comissao-por-no`, via #682). Proposta: renumerar o de saúde do estoque para 042 (livre em todas as branches), porque o 041 da taxonomia já é citado em código e na `0184` aplicada, que não se edita. Não renumerado aqui.
