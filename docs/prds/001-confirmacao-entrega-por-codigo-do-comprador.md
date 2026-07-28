---
prd_number: "001"
status: rascunho
priority: alta
created: 2026-07-28
issue: ""
depends_on: []
references:
  - "supabase/migrations/0071_codigo_retirada_pagos_coletiva.sql"
  - "supabase/migrations/0045_fix_atualizar_status_corrida_afiliado.sql"
  - "supabase/migrations/0040_parceiro_logistico_rpcs.sql"
  - "https://github.com/Schneider-Gr/industria24hIA/pull/143"
---

# PRD 001: Confirmação de entrega pelo código do comprador

## 1. Contexto

- **Produto/área**: Logística do marketplace Indústria 24h — fechamento da entrega pelo entregador (parceiro logístico ou afiliado logístico).
- **Estado atual**: o pedido pago recebe um código de retirada de 4 dígitos (trigger em `pedidos`, migrations 0071 e 0072). O comprador vê esse código no próprio pedido. Quem valida o código hoje é **só o dono da loja**: a RPC `pedido_confirmar_entrega` rejeita qualquer outro usuário. O entregador, ao concluir a corrida, marca `corridas.status = 'Entregue'` com foto obrigatória — mas isso não toca a tabela `entregas`, que é a fonte de fulfillment que o comprador e o lojista enxergam.
- **Problema**: existem dois conceitos paralelos de "entregue" que não conversam. O entregador entrega de fato, tira a foto, e o pedido continua aparecendo como não entregue para o comprador até que o lojista digite o código manualmente — o que, na entrega em domicílio, o lojista não tem como fazer, porque ele não está lá. Resultado: fulfillment que depende de um ator ausente, comprador sem confirmação e código de retirada sem função real na modalidade entrega.

> **Contexto técnico** (stack, arquitetura, padrões) vive no TRD. Aqui só o ponteiro: as RPCs relevantes são `pedido_confirmar_entrega` (0071) e `atualizar_status_corrida` (0040/0045).

## 2. Solução Proposta

### Visão de produto

- O entregador fecha a entrega digitando o código que o comprador lhe informa — um campo, um toque, sem foto no caminho comum.
- Confirmar a corrida com código válido passa a marcar o pedido como entregue para o comprador, unificando os dois conceitos de "entregue".
- Comprador que não está no local manda o código pelo chat da loja, e o lojista repassa ao entregador — a entrega não trava por ausência.
- O lojista mantém o fluxo atual de digitar o código na retirada em balcão; nada do que funciona hoje é retirado.

### Decisões de produto

1. **O código sozinho fecha a entrega; a foto deixa de ser obrigatória quando há código.** Um passo só na porta do cliente. A foto continua exigida apenas na corrida sem pedido vinculado, onde não existe código.
2. **O código vale como autorização do comprador, não como prova de entrega presencial.** Como o comprador ausente pode enviá-lo pelo chat, o código atesta que ele consentiu em dar o pedido por entregue — não que o entregador esteve fisicamente com ele. Em disputa, é isso que o código sustenta.
3. **Entregador não vê o código antes de pedir** *(premissa — confirme ou corrija)*. Se o app mostrasse o código ao entregador, ele deixaria de valer como autorização do comprador.
4. **Retirada em balcão continua com o lojista validando** — o entregador não participa dessa modalidade, então nada muda ali.
5. **Tentativas de código são limitadas a 5 por pedido.** O código já tem 4 dígitos em produção (0072), e a 0072 justificou esse tamanho porque só o dono da loja podia confirmar. A US01 remove essa premissa, então o limite passa a ser condição para abrir a confirmação ao entregador.

### Fora do escopo

- Criação de uma persona nova de entregador (`/entregador` como cadastro próprio) — as duas personas atuais (parceiro logístico e afiliado logístico) continuam como estão.
- Unificação das telas `/parceiro` e `/afiliado/logistica` numa experiência só.
- Assinatura digital do comprador no ato da entrega — `assinatura_url` já existe na RPC mas segue sem uso *(premissa — confirme ou corrija)*.
- Troca do formato ou do tamanho do código — já são 4 dígitos numéricos em produção desde a 0072.
- Renegociação de valor de frete ou repasse ao entregador no ato da entrega.

## 3. Funcionalidades

### US01: Entregador confirma entrega com o código do comprador

Como entregador com uma corrida em trânsito, quero confirmar a entrega digitando o código que o comprador me informa, para fechar o pedido sem depender do lojista.

**Rules:**
- O campo de código só aparece na transição para `Entregue`; nas transições anteriores (Coletada, EmTransito) não é pedido.
- O código digitado é comparado ignorando qualquer caractere não-numérico, como já faz `pedido_confirmar_entrega` hoje.
- Confirmação com código correto marca todas as linhas do pedido como `Entregue` em `entregas`, além de mover a corrida para `Entregue`.
- Com código válido a foto não é exigida; ela deixa de ser obrigatória na corrida que tem pedido vinculado.
- Só o entregador responsável pela corrida (afiliado exclusivo ou parceiro vinculado) pode confirmar, mantendo a checagem que a RPC já faz.

**Edge cases:**
- Código incorreto → corrida permanece em `EmTransito`, nada é gravado, entregador vê o erro e pode tentar de novo.
- Comprador ausente no local → ele envia o código pelo chat da loja e o lojista repassa ao entregador; a corrida segue em `EmTransito` até o código chegar (ver US04).
- Pedido já marcado como entregue por outro caminho (lojista digitou antes) → confirmação é aceita como idempotente, sem erro e sem duplicar registro.
- Corrida sem pedido vinculado → campo de código não é exibido e a corrida fecha só com foto.
- Entregador quer registrar foto mesmo tendo o código → a foto continua aceita como registro opcional, sem bloquear a confirmação *(premissa — confirme ou corrija)*.

### US02: Limite de tentativas no código

Como plataforma, quero limitar as tentativas de código por pedido, para que abrir a confirmação ao entregador não transforme 4 dígitos numa superfície de força bruta.

> O código **já tem 4 dígitos em produção** desde a migration 0072 — essa parte não é trabalho desta feature. O que a 0072 registrou como justificativa de segurança foi que "a RPC só é executável pelo dono da loja, não há superfície de força bruta". A US01 remove essa premissa, e é isso que torna o limite obrigatório.

**Rules:**
- Tentativas erradas no mesmo pedido são contadas e bloqueiam novas tentativas após 5 falhas.
- Atingido o limite, o fechamento daquele pedido exige intervenção do lojista ou do admin.
- Tentativa correta zera a contagem.
- O limite vale para a confirmação feita pelo entregador; o lojista, que já confirmava antes desta feature, não passa a ser bloqueado por um limite que não existia para ele *(premissa — confirme ou corrija)*.

**Edge cases:**
- Limite atingido → entregador vê instrução de acionar o lojista, sem revelar quantas tentativas restavam antes.
- Entregador legítimo errando por digitação → 5 tentativas cobrem erro honesto sem abrir espaço para varredura.
- Varredura distribuída em vários pedidos → o limite é por pedido, então cada pedido custa 5 tentativas ao atacante; aceito, já que o atacante precisa também ser o entregador designado daquela corrida.

### US03: Comprador enxerga a entrega confirmada

Como comprador, quero ver meu pedido como entregue assim que o entregador confirmar com meu código, para não precisar cobrar o lojista.

**Rules:**
- O status visível ao comprador reflete a confirmação do entregador sem passo manual adicional do lojista.
- O código deixa de ser útil após a confirmação — não confirma um segundo pedido.

**Edge cases:**
- Entregador confirma mas o comprador ainda vê pendente → não deve ocorrer, já que ambos leem a mesma fonte (`entregas`); se ocorrer, é bug de cache de página *(premissa — confirme ou corrija)*.

### US04: Comprador ausente envia o código pelo chat

Como comprador que não está no local da entrega, quero enviar meu código pelo chat da loja, para que a entrega seja concluída sem eu estar presente.

**Rules:**
- O comprador consegue enviar o código pelo chat que já existe entre ele e a loja, sem canal novo.
- O lojista repassa o código ao entregador pelo meio que já usa para falar com ele.
- O código enviado por chat vale igual ao informado presencialmente — a validação é a mesma.

**Edge cases:**
- Comprador ausente e sem acesso ao chat no momento → corrida segue em `EmTransito`; o entregador retenta ou devolve a carga conforme combinado com a loja *(premissa — confirme ou corrija)*.
- Lojista não repassa o código a tempo → corrida fica em `EmTransito`, sem prazo automático de expiração *(premissa — confirme ou corrija)*.
- Código enviado no chat fica visível no histórico da conversa depois de usado → aceito, já que o código morre após a confirmação *(premissa — confirme ou corrija)*.

## 4. Fluxo de Negócio

```
Corrida em EmTransito
   │
   ▼
Entregador chega ao endereço
   │
   ▼
Comprador está no local?
   ├── sim ──▶ Informa o código ao entregador ──┐
   │                                            │
   └── não ──▶ Envia o código no chat da loja   │
                  │                             │
                  ▼                             │
              Lojista repassa ao entregador ────┤
                                                │
                                                ▼
                                     Entregador digita o código
                                                │
                                                ▼
                                        Código confere?
   ┌────────────────────────────────────────────┴───────────┐
   │ sim                                                 não│
   ▼                                                        ▼
Corrida = Entregue                              Tentativas esgotadas?
   │                                              ├── não ──▶ Tenta de novo
   ▼                                              └── sim ──▶ Bloqueia;
Linhas do pedido = Entregue                                  fechamento só
   │                                                         via lojista/admin
   ▼
Comprador vê entregue
```

Corrida sem pedido vinculado não passa por esse fluxo: fecha com foto, sem código.

## 5. Critérios de Aceite

### 5a. Critérios de aceite da feature

| Critério | Razão de negócio | Como verificar (observável) |
|----------|------------------|-----------------------------|
| Entregador conclui corrida com código correto e o pedido aparece como entregue para o comprador | é a razão de existir da feature: hoje o comprador fica sem confirmação | logar como entregador, concluir corrida com código válido, abrir o pedido como comprador e ver status entregue |
| Código incorreto não altera nem a corrida nem o pedido | confirmação falsa de entrega gera disputa e repasse indevido | tentar código errado e verificar que corrida segue EmTransito e `entregas` não mudou |
| Confirmação repetida do mesmo pedido não duplica nem falha | lojista e entregador podem confirmar em paralelo | confirmar pelo lojista e depois pelo entregador; ambos retornam sucesso |
| Entregador que não é o responsável pela corrida não consegue confirmar | impede que qualquer autenticado feche entrega alheia | tentar a RPC com outro usuário autenticado e receber erro de autorização |
| Após 5 tentativas erradas o pedido bloqueia novas tentativas do entregador | com 4 dígitos são 10.000 combinações; abrir a RPC ao entregador sem limite torna o código varrível | errar o código 5 vezes como entregador e verificar bloqueio na 6ª |
| Entregador conclui a corrida sem enviar foto quando há código válido | a foto virou opcional; exigi-la anularia a decisão de um passo só | concluir uma corrida com código e sem foto |
| Corrida sem pedido vinculado ainda exige foto para fechar | é o único caso sem código, então a foto é a única evidência | tentar fechar sem foto uma corrida sem pedido e receber recusa |
| Comprador ausente envia o código pelo chat da loja e a entrega conclui | é o caminho de exceção que impede a corrida de travar | enviar o código pelo chat, repassar ao entregador e concluir |
| Fluxo de retirada em balcão pelo lojista continua funcionando | não pode haver regressão no caminho que já está em produção | confirmar um pedido de retirada como lojista, como hoje |

### 5b. Métricas de sucesso

| Métrica | Baseline (fonte) | Meta | Prazo | Mín. aceitável | Responsável |
|---------|-------------------|------|-------|-----------------|-------------|
| Pedidos com entrega em domicílio que chegam a `entregas.status = Entregue` | A levantar (query em `entregas` × `corridas` no Supabase de produção) | 90% | 60 dias após deploy | 70% | Dono do produto |
| Corridas concluídas sem o pedido correspondente fechar | A levantar (mesma query) | próximo de zero | 60 dias após deploy | abaixo do baseline atual | Dono do produto |
| Chamados de comprador sobre "pedido entregue mas consta pendente" | A levantar (não há canal estruturado hoje) | redução relevante | 90 dias | qualquer redução | Dono do produto |

**Regras:**
- Os três baselines dependem de query em produção ainda não executada; levantar antes de considerar o PRD `pronto`.
- Sem baseline, a meta de 90% é aspiracional e não serve de critério de aceite.

## 6. Milestones

### Milestone 1: Blindar o código antes de abri-lo

**Por que é um marco:** o código de 4 dígitos deixa de depender de "só o lojista consegue chamar" para se manter seguro. Vem primeiro porque o Milestone 2 abre a confirmação ao entregador — soltar isso antes do limite de tentativas entregaria a fraude junto com a feature.

**Funcionalidades:** US02

**Checklist de aceite** (marcado pelo Aprovador após a implementação):
- [ ] Após 5 tentativas erradas o pedido bloqueia novas tentativas do entregador

**Aprovador:** Dono do produto

### Milestone 2: Fechar a entrega pelo código

**Por que é um marco:** o entregador passa a concluir a entrega de ponta a ponta e o comprador vê a confirmação sem depender do lojista. É a conquista que se anuncia: a entrega em domicílio deixa de ter um passo manual impossível.

**Funcionalidades:** US01, US03, US04

**Checklist de aceite** (marcado pelo Aprovador após a implementação):
- [ ] Entregador conclui corrida com código correto e o pedido aparece como entregue para o comprador
- [ ] Entregador conclui a corrida sem enviar foto quando há código válido
- [ ] Corrida sem pedido vinculado ainda exige foto para fechar
- [ ] Comprador ausente envia o código pelo chat da loja e a entrega conclui
- [ ] Código incorreto não altera nem a corrida nem o pedido
- [ ] Confirmação repetida do mesmo pedido não duplica nem falha
- [ ] Entregador que não é o responsável pela corrida não consegue confirmar
- [ ] Fluxo de retirada em balcão pelo lojista continua funcionando

**Aprovador:** Dono do produto

## 7. Riscos e Dependências

| Risco | Impacto | Mitigação | Status |
|-------|---------|-----------|--------|
| Código de 4 dígitos (10.000 combinações) permite adivinhar e forjar entrega | Alto | US02 (limite de 5 tentativas por pedido); o projeto já tem `checar_rate_limit` (0087) usado em outras ações. O Milestone 1 existe justamente para fechar isso antes da confirmação pelo entregador ir ao ar | Pendente |
| Entregador combina com o comprador para confirmar antes de entregar | Médio | risco aceito: sem foto obrigatória, o código é a única evidência e ele atesta consentimento, não entrega física | Monitorando |
| Código circulando pelo chat e pelo lojista amplia quem pode fechar a entrega no lugar do comprador | Médio | o código morre após a confirmação e vale uma vez só; o caminho pelo chat é exceção, não o padrão | Monitorando |
| Comprador não sabe que tem um código nem que deve informá-lo | Médio | o código já aparece no pedido; avaliar reforço na comunicação de envio *(premissa — confirme ou corrija)* | Pendente |
| Entrega legítima travada por comprador ausente vira corrida presa em EmTransito | Médio | definir caminho de exceção pelo lojista/admin (já previsto no bloqueio da US02) | Pendente |
| Baselines de §5b não levantados invalidam a avaliação de sucesso | Baixo | rodar a query em produção antes de mover o PRD para `pronto` | Pendente |

**Dependências:**

| Dependência | Tipo | Status | Impacto se bloqueado |
|-------------|------|--------|----------------------|
| Código de retirada gerado no pagamento (migration 0071, em produção) | Interna | Pronto | sem ele não há o que validar; bloqueia ambos os milestones |
| Tipos das RPCs de corrida destravados (PR #143) | Interna | PR aberto | mexer em `atualizar_status_corrida` sem os tipos volta a exigir `any`; atrasa o Milestone 1 |
| Chat comprador↔loja (migration 0075, em produção) | Interna | Pronto | é o canal por onde o comprador ausente envia o código; sem ele a US04 não tem meio |

## 8. Referências

- `supabase/migrations/0071_codigo_retirada_pagos_coletiva.sql` — origem do código de retirada e da RPC `pedido_confirmar_entrega`, que hoje restringe a confirmação ao dono da loja
- `supabase/migrations/0040_parceiro_logistico_rpcs.sql` e `0045_fix_atualizar_status_corrida_afiliado.sql` — RPC `atualizar_status_corrida`, onde a exigência de foto na entrega já vive
- [PR #143](https://github.com/Schneider-Gr/industria24hIA/pull/143) — destrava os tipos das RPCs de corrida, pré-requisito prático para mexer nesse fluxo sem `any`

## 9. Registro de Decisões

- **2026-07-28:** Escopo definido como o fluxo de confirmação por código, não como persona nova de entregador. Motivo: já existem duas personas de entrega em produção (parceiro logístico e afiliado logístico); a lacuna real é o fechamento do pedido, não o cadastro.
- **2026-07-28:** `depends_on` fica vazio. Motivo: é o primeiro PRD do repositório; as dependências reais desta feature são migrations já em produção, registradas em §7 como dependência interna, não como PRD.
- **2026-07-28:** Limite de tentativas virou US própria com milestone próprio em vez de detalhe da US01. Motivo: sem ele o código não vale como prova, então é conquista de produto separada, não refinamento técnico.
- **2026-07-28:** Limite de tentativas vem antes de liberar a confirmação pelo entregador. Motivo: publicar a confirmação sobre um código de 4 dígitos desprotegido entregaria a fraude junto com a feature.
- **2026-07-28:** Corrida sem pedido vinculado fecha só com foto, sem pedir código. Motivo: não há comprador com código nesse caso; exigir o código travaria a corrida.
- **2026-07-28:** Foto deixou de ser obrigatória; o código sozinho fecha a entrega. Motivo: um passo só na porta do cliente. Contrapartida aceita: o código passa a ser a única evidência, e ele atesta consentimento do comprador, não entrega física.
- **2026-07-28:** Comprador ausente envia o código pelo chat da loja, e o lojista repassa ao entregador. Motivo: aproveita o canal que já existe (0075) sem mexer no schema de `conversas`, que hoje só admite comprador e loja. O lojista volta ao fluxo apenas nesse caso de exceção — no caminho comum ele continua fora.
- **2026-07-28:** Canal direto comprador↔entregador ficou fora deste PRD. Motivo: exigiria novo participante em `conversas` com RLS própria; se virar necessidade, abre PRD à parte.
- **2026-07-28:** Mudança de 6 para 4 dígitos saiu do escopo ao consultar produção: a migration 0072 já fez isso em 23/07 e os 135 códigos vivos têm 4 dígitos. O PRD assumia 6 porque só a 0071 tinha sido lida. Consequência que ficou: a 0072 justificou 4 dígitos com "só o dono da loja executa a RPC", premissa que a US01 derruba — por isso o limite de tentativas virou obrigatório.
