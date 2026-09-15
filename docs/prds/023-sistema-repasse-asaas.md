---
prd_number: "023"
title: Sistema de Repasse ao Seller e ao Afiliado
status: rascunho
priority: crítica
created: 2026-07-28
updated: 2026-09-04
version: 2.1
depends_on: ["001", "012", "018-protecao-producao-asaas"]
references:
  - "docs/prds/001-confirmacao-entrega-por-codigo-do-comprador.md"
  - "docs/prds/012-checkout-pix-fluxo-atual.md"
  - "docs/prds/018-protecao-producao-asaas.md"
  - "https://docs.asaas.com/reference/transferencias"
  - "supabase/migrations/0111_repasse_automatico_confirmacao_entrega.sql"
  - "supabase/migrations/0147_fix_repasses_dedup.sql"
  - "supabase/migrations/0158_repasse_seller_valor_derivado_e_solicitacao.sql"
---

# PRD 023: Sistema de Repasse ao Seller e ao Afiliado

> **Revisão 2.0 (04/09/2026).** A versão 1.0 (28/07/2026) descrevia um sistema que
> nunca foi construído: job T+1 agendado, transferência por dados bancários
> (banco/agência/conta), retry com backoff exponencial, comissão percentual
> configurável por seller, status `PAGO`/`EXECUTADO`/`BLOQUEADO` e carência de 15
> dias para afiliado. Nada disso existe no produto. Esta revisão reescreve o PRD
> contra o comportamento real em produção, verificado por teste E2E em 04/09/2026
> (pedido `2F6D32798E`), e separa o que **é** do que **falta**.

## 1. Contexto

- **Produto/área**: marketplace Indústria 24h — módulo financeiro, caminho do dinheiro.
- **Estado atual**: o comprador paga; a plataforma retém o valor integral na conta
  Asaas do marketplace. O dinheiro do seller só sai quando a entrega é confirmada
  pelo código de 4 dígitos que o comprador apresenta. O cálculo do quanto cabe a
  cada parte já funciona e é conferível. A transferência PIX em si é o elo frágil:
  quando falha, falha em silêncio — o motivo não é gravado em lugar nenhum que o
  admin consiga ler.
- **Problema**: o seller não tem garantia de receber, nem visibilidade de por que
  não recebeu. Do lado da plataforma, um repasse parado em `falhou` não diz o que
  aconteceu, então ninguém sabe se é chave PIX errada, saldo insuficiente na conta
  do marketplace ou indisponibilidade do Asaas. Em um marketplace novo, seller que
  não recebe e não entende o motivo não faz a segunda venda.

> Contexto técnico (stack, clientes Supabase, ambiente Asaas) vive no TRD. O ambiente
> Asaas é governado pelo PRD 018.

## 2. Solução Proposta

### Visão de produto

- **O dinheiro do seller é liberado pela entrega, não pelo pagamento.** O comprador
  paga e a plataforma segura o valor; o gatilho do repasse é o seller digitar o
  código de retirada que o comprador apresenta. Isso é o que protege o comprador.
- **O seller tem um botão para pedir o próprio dinheiro.** Depois da entrega
  confirmada, ele não depende do automatismo ter dado certo — pode solicitar.
- **Cada parte enxerga o seu.** Seller vê o repasse dele; afiliado, a comissão dele;
  admin vê tudo e trata as exceções.
- **Repasse nunca sai duas vezes.** Um pedido gera no máximo um repasse por
  destinatário, por mais que os gatilhos disparem em paralelo.
- **Quando falha, o motivo aparece.** Falha silenciosa em caminho de dinheiro é
  defeito de produto, não detalhe de implementação.

### Decisões de produto

1. **O gatilho do repasse é a confirmação de entrega, não o pagamento.** Engenharia
   reversa do Bubble (pedido MKMNDBAHAA, 04/09/2026) mostrou o mesmo desenho: com o
   pedido já pago, o botão de transferência não existe; ele só aparece depois da
   confirmação de entrega. Repassar no pagamento transferiria dinheiro de pedido que
   ainda pode não ser entregue.
2. **A taxa da plataforma é 5% por linha de item, fixa.** Não é negociável por seller
   hoje. Simplicidade de operação enquanto o marketplace não tem escala para justificar
   tabela de comissão por contrato.
3. **O frete não entra no repasse do seller.** Com transportadora por tabela e Uber
   Direct, o frete tem destinatário próprio. Incluí-lo pagaria ao seller um valor que
   é de terceiro.
4. **Seller e afiliado vencem juntos.** Os dois repasses de um pedido são elegíveis no
   mesmo momento — a confirmação de entrega. O botão do seller processa os dois; não
   faz sentido pagar um lado só.
5. **Não há carência de saque.** A única espera é de 24h sobre a *chave PIX* recém
   cadastrada, que é antifraude de troca de chave, não retenção de recebível. A carência
   de 15 dias para afiliado da v1.0 nunca foi implementada e não é retomada aqui.
6. **A solicitação do seller não antecipa dinheiro.** Ela só devolve ao seller o controle
   sobre um repasse que já está elegível e que hoje depende do disparo automático ter
   funcionado.

### Fora do escopo

- **Split nativo do Asaas** — o marketplace recebe o valor inteiro e transfere depois.
  Migrar para split muda o modelo de custódia e é decisão própria.
- **Estorno e reversão de repasse já transferido** — o dinheiro saiu; recuperar é
  cobrança, não repasse. Vive no PRD 009 (disputas).
- **Retenção fiscal e IR** — a plataforma reporta, não retém. Confirmado pelo dono do
  produto em 04/09/2026.
- **Antecipação de recebíveis** — produto financeiro próprio.
- **Saldo acumulado com saque sob demanda** — hoje o repasse é por pedido, não por
  saldo. Mudar isso é outra feature.
- **Comissão configurável por seller** — decisão 2 acima.

## 3. Funcionalidades

### US01: Cálculo do valor devido a cada parte

Como plataforma, quero que o valor de cada parte seja calculado a partir do que o
checkout gravou, para que o seller receba exatamente a diferença entre o que o
comprador pagou e o que é da plataforma e do afiliado.

**Rules:**
- A plataforma retém 5% do valor de cada linha de item (`round(valor * 0.05, 2)`),
  gravado no checkout.
- A comissão do afiliado é o percentual do produto (`porcentagem_afiliado`) sobre a
  linha, gravado no checkout quando há afiliado associado.
- O valor do seller é o que sobra: `valor da linha − taxa da plataforma − comissão do
  afiliado`, somado por pedido.
- Pedidos migrados do Bubble preservam o valor histórico gravado, mesmo quando ele
  diverge da fórmula — corrigir a história do Bubble não é escopo.
- Frete não compõe o valor do seller.
- Cupom de plataforma sai da taxa da plataforma e não reduz o valor do seller; cupom
  de loja já reduziu o valor da linha antes do cálculo.
- Repasse de valor zero ou negativo não é criado.

**Edge cases:**
- Todas as linhas do pedido têm valor menor ou igual à soma de taxa e comissão → nenhum
  repasse de seller é criado, e o pedido não fica pendurado esperando um repasse que
  nunca virá.
- Pedido tem afiliados diferentes em linhas diferentes → uma comissão por afiliado,
  cada uma com o seu valor. Um pedido pode ter mais de um afiliado.
- Cupom de loja zera o valor da linha → sem repasse para aquela linha, e a taxa da
  plataforma acompanha o valor zerado.

### US02: Liberação do repasse pela confirmação de entrega

Como comprador, quero que o dinheiro só chegue ao seller quando eu confirmar que
recebi, para não pagar por algo que não recebi.

**Rules:**
- O código de retirada tem 4 dígitos e é gerado no momento em que o pedido passa a
  `Pagamento Realizado`.
- O comprador vê o próprio código; o seller não o vê — ele o recebe do comprador na
  entrega.
- O seller digita o código no painel; acertar marca todas as linhas do pedido como
  entregues e torna o repasse elegível.
- Código errado não confirma a entrega e não zera o contador de tentativas.
- Confirmar a entrega dispara o repasse automaticamente.
- Uma falha no repasse não desfaz a confirmação de entrega — a entrega aconteceu de
  fato, e desfazê-la por causa de um erro financeiro mentiria sobre o mundo.

**Edge cases:**
- Seller tenta confirmar pedido de outra loja → recusado.
- Seller tenta confirmar pedido não pago → recusado.
- Código correto mas a transferência PIX falha → entrega fica confirmada, repasse fica
  como falho e visível ao admin.
- Comprador perde o código → o suporte reemite (US06). O seller nunca confirma a entrega
  por outro meio — se o código deixasse de ser o único caminho, ele deixaria de ser
  prova de que o comprador recebeu.

### US03: Transferência PIX ao seller e ao afiliado

Como seller, quero receber o valor na minha chave PIX assim que a entrega for
confirmada, para ter o dinheiro da venda sem depender de pedir.

**Rules:**
- A transferência é PIX por chave cadastrada (CPF, CNPJ, e-mail ou telefone) — não por
  banco, agência e conta.
- A chave PIX só é elegível 24 horas após ter sido confirmada, como proteção contra
  troca de chave por invasor.
- Beneficiário sem chave PIX cadastrada ou com chave dentro das 24h tem o repasse
  marcado como inelegível, não como falho — a distinção importa porque uma se resolve
  sozinha e a outra exige ação.
- Um pedido gera no máximo um repasse por destinatário, mesmo que os gatilhos disparem
  ao mesmo tempo.
- Repasse transferido registra a data da transferência e marca as linhas do pedido como
  transferidas.
- **Falha de transferência grava o motivo em campo legível pelo admin.** *(a implementar
  — hoje o motivo vai só para o Sentry e o admin vê apenas o estado "falhou")*

**Edge cases:**
- Asaas recusa a transferência (chave inválida, saldo insuficiente na conta do
  marketplace, indisponibilidade) → repasse fica falho, com o motivo registrado, e o
  admin trata.
- Dois gatilhos disparam ao mesmo tempo (confirmação de entrega e botão do seller) →
  apenas um efetiva a transferência; o outro não faz nada.
- Beneficiário cadastra a chave PIX depois da entrega confirmada → o repasse fica
  inelegível até o admin reprocessar (US06). Não há reprocesso automático.
- Não há janela de horário: PIX é 24×7, e o repasse é disparado a qualquer hora.

### US04: Solicitação de repasse pelo seller

Como seller, quero pedir o meu repasse depois de confirmar a entrega, para não ficar
refém de um automatismo que pode ter falhado.

**Rules:**
- O botão só aparece depois que todos os itens do pedido têm entrega confirmada.
- A solicitação revalida no servidor que o pedido é da loja do seller, está pago e está
  entregue — o botão visível é conveniência, não autorização.
- A solicitação processa todos os repasses pendentes do pedido, inclusive a comissão do
  afiliado.
- Solicitar de novo um repasse já transferido não transfere de novo.
- Erro na solicitação aparece para o seller na tela, não como erro genérico da aplicação.

**Edge cases:**
- Seller clica várias vezes seguidas → uma transferência só.
- Seller solicita repasse de pedido cujo repasse está inelegível por falta de chave PIX
  → mensagem dizendo que falta cadastrar a chave, não um erro genérico. *(a implementar —
  hoje a distinção não chega à tela do seller)*
- Seller solicita e a transferência falha → o seller vê o motivo, não apenas o silêncio.
  *(a implementar)*

### US05: Visibilidade do estado de cada repasse

Como admin, quero ver todo repasse que não se completou e por quê, para tratar antes que
o seller reclame.

**Rules:**
- Cada repasse tem um estado explícito: pendente, processando, transferido, falho ou
  inelegível.
- O admin vê todos os repasses, com filtro por estado, e o valor e a data de
  transferência quando houver.
- Seller vê os repasses da própria loja; afiliado vê as próprias comissões. Nenhum dos
  dois vê o do outro.
- O painel do seller mostra o valor a receber e o já recebido, separados.
- **Repasse falho exibe o motivo da falha.** *(a implementar)*

**Edge cases:**
- Repasse fica em "processando" porque o processo morreu no meio → depois de 15 minutos
  nesse estado ele aparece ao admin como travado, não como em andamento (tratamento em US06).
- Pedido cancelado depois do repasse transferido → o repasse permanece; recuperar é
  assunto de disputas (PRD 009).
- Beneficiário sem nenhum repasse ainda → painel mostra estado vazio explícito, não uma
  tabela em branco que se confunde com erro de carregamento.

### US06: Destravar exceções sem depender de engenharia

Como suporte ou admin, quero resolver os casos que emperraram — código perdido, repasse
inelegível, repasse travado, pagamento feito por fora — para que nenhum pedido dependa de
alguém abrir o banco de dados.

**Rules:**
- O suporte reemite o código de retirada de um pedido pago. A reemissão invalida o código
  anterior, para que só um código valha por vez.
- Toda reemissão registra quem reemitiu, quando e para qual pedido.
- O admin reprocessa um repasse inelegível depois que o beneficiário cadastra a chave PIX;
  o reprocesso passa pelas mesmas validações do disparo normal, sem atalho.
- Repasse parado em "processando" por mais de 15 minutos pode ser destravado pelo admin e
  volta a ser elegível — abaixo desse tempo, assume-se que ainda está em andamento e o
  destravamento é recusado, para não gerar transferência em duplicidade.
- O admin dá baixa manual em um repasse pago por fora do sistema. A baixa exige um motivo
  escrito e o identificador do comprovante, e registra quem deu baixa e quando.
- Repasse com baixa manual é distinguível de repasse transferido pelo sistema — os dois
  significam "o seller recebeu", mas só um tem comprovante do Asaas.
- Nenhuma dessas ações apaga o histórico: o estado anterior e o motivo ficam registrados.

**Edge cases:**
- Suporte reemite o código de um pedido já entregue → recusado; não há o que confirmar.
- Admin destrava um repasse que na verdade estava em andamento e a transferência original
  se completa → a proteção contra repasse em dobro impede a segunda transferência.
- Admin dá baixa manual sem preencher o motivo → recusado.
- Admin dá baixa manual em repasse que depois é transferido pelo sistema → impossível: a
  baixa encerra o repasse, e repasse encerrado não é reprocessado.
- Suporte tenta reemitir código de pedido não pago → recusado; o código só existe a partir
  do pagamento.

## 4. Fluxo de Negócio

```
Comprador paga o pedido
   │
   ▼
Pedido = Pagamento Realizado ──▶ gera código de retirada (4 dígitos, visível só ao comprador)
   │
   ▼
Comprador apresenta o código na entrega
   │
   ▼
Seller digita o código ──┬── errado ──▶ entrega NÃO confirmada (conta a tentativa)
                         │
                         └── certo ──▶ entrega confirmada (irreversível por erro financeiro)
                                          │
                                          ▼
                                  calcula o devido a cada parte
                                  (valor − 5% plataforma − % afiliado)
                                          │
                                          ▼
                                  chave PIX cadastrada há mais de 24h?
                                    ├── não ──▶ INELEGÍVEL (aguarda cadastro/carência)
                                    └── sim ──▶ reserva o repasse (só um vence)
                                                   │
                                                   ▼
                                            transferência PIX
                                              ├── ok ──▶ TRANSFERIDO
                                              └── erro ──▶ FALHO + motivo ──▶ admin trata
                                                             ▲
                                                             │
   Seller clica "Solicitar repasse" ─────────────────────────┘
   (só após entrega confirmada; mesmo caminho, mesmo travamento)
```

## 5. Critérios de Aceite

### 5a. Critérios de aceite da feature

| Critério | Razão de negócio | Como verificar (observável) |
|---|---|---|
| O valor do seller é `valor − 5% − comissão do afiliado`, com frete fora | É o contrato com o seller; errar aqui é pagar a menos ou a mais em todo pedido | Pedido de R$ 5,10 sem afiliado gera repasse de R$ 4,84 |
| Nenhum repasse é criado antes da entrega confirmada | Repassar antes transfere dinheiro de pedido que pode não ser entregue | Pedido pago e não entregue não tem repasse elegível nem botão de solicitação |
| Um pedido nunca gera dois repasses ao mesmo destinatário | Repasse em dobro é perda direta e irrecuperável | Disparar confirmação de entrega e botão do seller em paralelo resulta em uma transferência |
| Falha de transferência mostra o motivo ao admin | Sem o motivo, ninguém sabe se é chave errada, saldo ou indisponibilidade — o repasse trava indefinidamente | Forçar falha e ler o motivo no painel admin, sem abrir o Sentry |
| Falta de chave PIX aparece como inelegível, não como falha | Uma se resolve sozinha quando o seller cadastra; a outra exige intervenção | Loja sem chave PIX gera repasse inelegível |
| Seller e afiliado não veem o repasse um do outro | Dado financeiro de terceiro | Autenticar como seller e tentar ler repasse de outra loja |
| Erro de negócio na solicitação chega ao seller como texto legível | Erro genérico em botão de dinheiro faz o seller abrir chamado | Solicitar repasse inelegível e ler a mensagem na tela |
| Suporte reemite o código e o anterior deixa de valer | Dois códigos válidos ao mesmo tempo destroem a prova de que o comprador recebeu | Reemitir e tentar confirmar com o código antigo — deve ser recusado |
| Repasse parado em "processando" há mais de 15 min pode ser destravado; abaixo disso, não | 15 min é folga larga sobre uma transferência que leva segundos; destravar antes arriscaria pagar duas vezes | Deixar um repasse travado e tentar destravar antes e depois dos 15 min |
| Baixa manual exige motivo e comprovante e registra quem deu | Baixa manual é a única forma de declarar "pago" sem prova do Asaas; sem autoria e motivo, vira buraco de auditoria no caminho do dinheiro | Tentar dar baixa sem motivo (recusado) e conferir autoria na baixa concluída |
| Admin reprocessa repasse inelegível após o cadastro da chave PIX | Sem isso, o seller cadastra a chave e o dinheiro nunca anda | Deixar repasse inelegível, cadastrar chave, reprocessar e ver a transferência sair |

### 5b. Métricas de sucesso

| Métrica | Baseline (fonte) | Meta | Prazo | Mín. aceitável | Responsável |
|---|---|---|---|---|---|
| Repasses que chegam a `transferido` sem ação humana | 0% — nenhum repasse já foi transferido em produção (tabela `repasses`, 04/09/2026) | 95% | 30 dias após a correção do motivo de falha | 80% | Dono do produto |
| Repasses parados em `falhou` com motivo registrado | 0% (campo não existe) | 100% | Junto com a entrega do Milestone 2 | 100% | Dono do produto |
| Tempo entre entrega confirmada e PIX transferido | A levantar — não há repasse transferido para medir | < 1 min (p95) | 30 dias após a correção | < 5 min | Dono do produto |
| Chamados de seller sobre repasse não recebido | A levantar (suporte) | Queda de 80% | 60 dias | Queda de 50% | Suporte |

## 6. Milestones

### Milestone 1: Liberar o repasse pela entrega

**Por que é um marco:** é o contrato central do marketplace — o comprador ganha a
garantia de que o dinheiro só anda quando ele confirma o recebimento, e o seller ganha
um gatilho que ele mesmo aciona. **Entregue e verificado em produção em 04/09/2026.**

**Funcionalidades:** US01, US02, US04

**Checklist de aceite:**
- [x] O valor do seller é `valor − 5% − comissão do afiliado`, com frete fora
- [x] Nenhum repasse é criado antes da entrega confirmada
- [x] Um pedido nunca gera dois repasses ao mesmo destinatário
- [ ] Erro de negócio na solicitação chega ao seller como texto legível

**Aprovador:** dono do produto

### Milestone 2: Fazer o dinheiro chegar, e dizer quando não chega

**Por que é um marco:** hoje nenhum repasse foi transferido em produção. Este é o marco
em que o seller efetivamente recebe — e em que a plataforma para de errar em silêncio
quando não consegue pagar.

**Funcionalidades:** US03, US05

**Checklist de aceite:**
- [ ] Falha de transferência mostra o motivo ao admin
- [ ] Falta de chave PIX aparece como inelegível, não como falha
- [ ] Seller e afiliado não veem o repasse um do outro
- [ ] Um repasse real chega à chave PIX de um seller em produção

**Aprovador:** dono do produto

### Milestone 3: Operar as exceções sem engenharia

**Por que é um marco:** é quando o financeiro passa a ser operável pelo time de suporte e
admin. Enquanto reemitir um código, reprocessar um repasse ou dar baixa em um pagamento
feito por fora exigir alguém abrindo o banco, o marketplace não escala além do volume que
uma pessoa técnica consegue atender à mão.

**Funcionalidades:** US06

**Checklist de aceite:**
- [ ] Suporte reemite o código e o anterior deixa de valer
- [ ] Repasse parado em "processando" há mais de 15 min pode ser destravado; abaixo disso, não
- [ ] Baixa manual exige motivo e comprovante e registra quem deu
- [ ] Admin reprocessa repasse inelegível após o cadastro da chave PIX

**Aprovador:** dono do produto

## 7. Riscos e Dependências

| Risco | Impacto | Mitigação | Status |
|---|---|---|---|
| Nenhum repasse jamais foi transferido em produção; a integração de transferência nunca funcionou fim a fim | Alto — o marketplace não paga seller nenhum | Registrar o motivo da falha (Milestone 2) antes de qualquer outra hipótese | Monitorando |
| Conta Asaas do marketplace sem saldo no momento da transferência | Alto — todo repasse falha por um motivo que não é bug | Alerta de saldo mínimo e o motivo visível no painel | Pendente |
| Chave PIX do seller apontando para titular diferente do CNPJ da loja | Médio — risco fiscal e de fraude | O Asaas não devolve o titular da chave, então não há validação automática possível. Sobra conferência no cadastro da loja e a carência de 24h sobre a chave nova | Aceito |
| Repasse preso em "processando" após queda do processo no meio | Médio — dinheiro que não anda e não avisa | Destravamento pelo admin após 15 min parado (US06) | Pendente |
| Baixa manual usada para declarar "pago" um repasse que não foi pago | Alto — some dinheiro do seller sem rastro e o painel mente | Motivo escrito, identificador do comprovante e autoria obrigatórios; baixa manual visualmente distinta de transferência do sistema | Pendente |
| Ambiente Asaas trocado sem querer entre sandbox e produção | Alto — repasse real disparado em sandbox, ou teste disparado com dinheiro real | Ambiente declarado explicitamente por variável (feito em 04/09/2026); governado pelo PRD 018 | Mitigado |

**Dependências:**

| Dependência | Tipo | Status | Impacto se bloqueado |
|---|---|---|---|
| PRD 001 — confirmação de entrega por código | Interna | Em produção | Sem ele não há gatilho de repasse; Milestone 1 inteiro |
| PRD 012 — checkout | Interna | Em produção | Sem pedido pago não há o que repassar |
| PRD 018 — proteção de produção Asaas | Interna | Parcial | Milestone 2 — risco de disparar transferência no ambiente errado |
| Conta Asaas do marketplace com saldo e transferência PIX habilitada | Externa | A confirmar | Milestone 2 não se completa |
| Chave PIX cadastrada e confirmada pelo seller | Externa | Por seller | Repasse fica inelegível até o seller cadastrar |

## 8. Referências

- [PRD 001 — confirmação de entrega por código](001-confirmacao-entrega-por-codigo-do-comprador.md) — define o gatilho do repasse
- [PRD 012 — checkout PIX fluxo atual](012-checkout-pix-fluxo-atual.md) — grava a taxa da plataforma e a comissão do afiliado por linha
- [PRD 018 — proteção de produção Asaas](018-protecao-producao-asaas.md) — governa o ambiente em que a transferência é disparada
- [PRD 009 — pós-venda e disputas](009-pos-venda-disputas.md) — trata reembolso de pedido já repassado
- [Asaas — transferências](https://docs.asaas.com/reference/transferencias) — API usada para o PIX ao beneficiário
- Migrations `0111` (repasse na confirmação de entrega), `0147` (índices de deduplicação) e `0158` (valor derivado e solicitação pelo seller) — comportamento vigente

## 9. Registro de Decisões

| Decisão | Reasoning | Alternativa rejeitada |
|---|---|---|
| Repasse liberado pela entrega, não pelo pagamento | Protege o comprador e espelha o desenho do Bubble, verificado por engenharia reversa em 04/09/2026 | Repasse no pagamento (v1.0) — transfere dinheiro de pedido que pode não ser entregue |
| Taxa da plataforma fixa em 5% | O marketplace não tem escala para justificar comissão por contrato | Percentual configurável por seller (v1.0) — nunca foi construído e adiciona superfície de erro no caminho do dinheiro |
| Frete fora do repasse do seller | Com transportadora por tabela e Uber Direct, o frete tem destinatário próprio | Incluir frete — pagaria ao seller valor de terceiro |
| Sem carência de saque | A carência de 15 dias da v1.0 nunca existiu no produto; a única espera é antifraude de troca de chave PIX | Manter a carência no papel — documentaria uma regra que o sistema não aplica |
| Botão de solicitação não antecipa dinheiro | Ele devolve controle sobre um repasse já elegível, não cria elegibilidade | Botão que antecipa — viraria crédito, outro produto |
| Motivo da falha precisa ser visível ao admin | Repasse parado sem motivo é indistinguível de bug, e trava o dinheiro indefinidamente | Manter o motivo só no Sentry — obriga acesso de engenharia para operar o financeiro |
| Código perdido é reemitido pelo suporte, nunca contornado pelo seller | O código é a prova de que o comprador recebeu; permitir ao seller confirmar por outro meio destruiria a garantia que sustenta o modelo de custódia | Seller confirma sem código — devolveria ao seller o poder de liberar o próprio dinheiro |
| Destravar "processando" só após 15 minutos | Uma transferência PIX leva segundos; 15 min é folga larga o bastante para não confundir lentidão com travamento, e curto o bastante para o seller não esperar um dia | Destravar imediatamente (arrisca pagar duas vezes) ou esperar horas (dinheiro parado sem motivo) |
| Baixa manual existe, mas exige motivo, comprovante e autoria | O dono do produto confirmou que pagamentos fora do sistema acontecem; negar a baixa empurraria a operação para o banco de dados, que é pior. O que a torna aceitável é o rastro | Baixa manual livre (buraco de auditoria) ou proibida (empurra a operação para fora do sistema) |
| Não há validação automática de titularidade da chave PIX | O Asaas não devolve o titular da chave; construir a validação exigiria outra fonte | Bloquear repasse até validar titularidade — travaria todo repasse por uma verificação que não existe |
| `depends_on` limitado a 001, 012 e 018 | São pré-condições reais de execução: gatilho, origem do valor e ambiente de disparo. O PRD 009 é consequência (estorno), não pré-condição | Listar todo PRD do domínio financeiro |
