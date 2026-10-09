---
prd_number: "062"
status: rascunho
priority: alta
created: 2026-10-09
issue: ""
depends_on: ["058", "059", "001", "056"]
references:
  - "docs/prds/060-rota-com-varias-entregas.md" – substitui o Milestone 2 deste PRD e aposenta o lote do admin (Milestone 1)
  - "docs/prds/058-rastreio-da-entrega-em-tempo-real.md" – mapa e previsão do comprador em /pedido
  - "docs/prds/059-zonas-de-servico-do-entregador.md" – área do entregador, que filtra o que ele vê e aceita
  - "docs/prds/001-confirmacao-entrega-por-codigo-do-comprador.md" – código de 4 dígitos por pedido
  - "docs/prds/056-entrega-por-parceiro-local-no-checkout.md" – origem das corridas do despacho automático
  - "supabase/migrations/0217_area_entregador_cidades.sql" – aceitar_corrida atual (sem limite de corridas simultâneas)
  - "supabase/migrations/0215_rota_lote_paradas.sql" – lote do admin, a aposentar
  - "supabase/migrations/0042" – rotas com atribuição manual pelo seller, a aposentar (a tabela segue para a Uber Direct)
---

# PRD 062: Rota do entregador

## 1. Contexto

- **Produto/área**: logística do marketplace (Manaus e interior do AM/AC), app do entregador (afiliado logístico em `/afiliado/logistica` e parceiro em `/parceiro`).
- **Estado atual** (verificado no código e no banco de produção em 09/10/2026):
  - Todo pedido pago com entrega por parceiro local vira **uma corrida**, com exclusividade de 5 min para o afiliado logístico da loja e depois o pool, filtrado pela área do entregador. Cada corrida tem o código de 4 dígitos do comprador e o repasse dela.
  - O entregador pode aceitar várias corridas ao mesmo tempo, mas o app mostra cada uma como um card solto: não há ordem, não há "próxima parada" e cada card liga o próprio GPS.
  - A única rota com várias paradas é o **lote do admin** (`/admin/lotes`): uma loja só, montado pelo admin, nunca usado com pedido pago. Ao lado dele existe a **atribuição manual pelo seller** (`/seller/rotas`), que duplica o despacho automático.
  - O comprador vê o entregador no mapa e uma previsão que ignora as entregas que vêm antes da dele.
  - Teste de 09/10: o pedido `0CD57DAC6B` gerou a corrida com exclusividade para o afiliado da loja. O webhook do Asaas não chegou; o pedido só foi confirmado pelo botão "Já paguei, verificar agora".
- **Problema**: o entregador ganha por corrida e quer encher a saída com várias, de lojas diferentes, aceitando mais no caminho. Hoje ele organiza isso de cabeça, o comprador recebe uma previsão errada e o produto tem três jeitos de "rota" que ninguém usa direito.

## 2. Solução Proposta

### Visão de produto

- A rota é **do entregador**: a fila das corridas que ele aceitou, com as coletas e as entregas na ordem em que ele vai fazer.
- O app sugere a ordem e o encaixe de cada corrida nova; o entregador ajusta arrastando.
- Ele pode aceitar corrida com a rota andando, vendo antes quanto ela atrasa quem já está na fila.
- Cada corrida continua independente no dinheiro: fecha com o código daquele comprador e libera o repasse dela.
- O comprador vê no mapa quantas entregas faltam antes da dele e uma previsão que soma as paradas.

### Decisões de produto

1. **Quem monta a rota é o entregador**, com as corridas que aceitou (dona, 09/10/2026).
2. **Pode misturar lojas** na mesma rota: várias coletas e várias entregas (dona, 09/10/2026).
3. **Pode aceitar corrida com a rota em andamento**; a rota reordena. Isso derruba a premissa "sem reordenar no caminho" do PRD 060 (dona, 09/10/2026).
4. **Sem teto** de corridas simultâneas (dona, 09/10/2026). O freio é a informação: no aceite ele vê o atraso que causa.
5. **Dinheiro e código continuam por corrida**: nenhuma regra de repasse muda (dona confirmou a inferência em 09/10/2026).
6. **Mudança de posição na fila é avisada ao comprador só no mapa**, sem WhatsApp (dona, 09/10/2026).
7. **Sai a atribuição manual pelo seller** (`/seller/rotas`); fica o despacho automático. A tabela `rotas` segue existindo só para a Uber Direct (dona, 09/10/2026).
8. **Sai o lote do admin** (`/admin/lotes`) (dona, 09/10/2026).

### Fora do escopo

- GPS com a tela apagada e app nas lojas (Milestone 3 do PRD 058). A rota funciona com o PWA, que rastreia só com a tela ligada.
- Otimização automática com janela de horário, capacidade do veículo ou trânsito previsto. A sugestão é "coletas antes das entregas, o resto pela menor distância" *(premissa, confirme ou corrija)*.
- Rota montada pelo seller ou pelo admin.
- Aviso por WhatsApp de mudança de posição na fila.
- Push para o pool quando a exclusividade de 5 min vence (lacuna antiga, segue sem dono) *(premissa, confirme ou corrija)*.
- Reescrever o caminho do repasse ou a confirmação por código.

## 3. Funcionalidades

### US01: Minha rota

Como entregador, quero ver todas as corridas que aceitei numa fila só, com a parada atual em destaque, para saber o que fazer agora sem montar a sequência de cabeça.

**Rules:**
- A rota tem as corridas do entregador em `Aceita`, `Coletada` e `EmTransito`. Cada corrida gera duas paradas: a coleta (endereço da loja) e a entrega (endereço do comprador). Corrida já coletada só tem a parada de entrega.
- A coleta de uma corrida sempre vem antes da entrega dela. O app não deixa ordenar diferente.
- A parada atual é a primeira da fila ainda não resolvida e aparece em destaque, com endereço, o que coletar ou entregar e o botão da ação (marcar coletada ou lançar o código).
- Coletas na mesma loja em sequência viram uma parada só, com a lista dos pedidos *(premissa, confirme ou corrija)*.
- Um botão abre a rota inteira no Google Maps, com as paradas na ordem da fila.
- A rota vale para o afiliado logístico e para o parceiro.

**Edge cases:**
- Entregador sem nenhuma corrida aceita → a tela mostra a lista de corridas disponíveis, como hoje.
- Mais paradas do que o Google Maps aceita num link → o link leva as próximas paradas até o limite e avisa que o resto vem depois *(premissa, confirme ou corrija)*.
- Endereço da loja ou do comprador incompleto → a parada aparece com o CEP e um aviso "endereço incompleto", sem bloquear a rota.

### US02: Ordem sugerida e ajuste manual

Como entregador, quero que o app sugira a ordem das paradas e me deixe mudar, para rodar menos sem perder o controle de quem eu conheço melhor que o mapa.

**Rules:**
- "Sugerir ordem" reorganiza as paradas não resolvidas: coletas antes das entregas, e dentro de cada grupo a menor distância a partir da posição atual do entregador *(premissa, confirme ou corrija)*.
- O entregador arrasta as paradas para mudar a ordem. A ordem dele vale até ele pedir uma nova sugestão.
- O app recusa mover uma entrega para antes da coleta da mesma corrida e explica o motivo.
- A ordem fica salva: fechar e abrir o app mantém a fila.

**Edge cases:**
- Sem GPS no momento da sugestão → a sugestão parte da primeira coleta da fila.
- Falha no serviço de rotas → a fila fica como está e o app avisa "não consegui sugerir agora".
- Parada resolvida → sai da fila e não é reordenada.

### US03: Aceitar corrida com a rota andando

Como entregador, quero ver onde uma corrida nova entraria na minha rota e quanto ela atrasa as outras antes de aceitar, para decidir se vale a pena.

**Rules:**
- Na lista de disponíveis, cada corrida mostra o encaixe sugerido na rota atual (por exemplo, "coleta depois da parada 2, entrega no fim") e o acréscimo de tempo na rota *(premissa, confirme ou corrija)*.
- Antes de confirmar o aceite, o app mostra o atraso que a corrida causa em cada entrega já na fila, em minutos.
- Ao aceitar, a corrida entra na fila na posição sugerida. O entregador pode mudar depois.
- As regras de aceite de hoje continuam: área de atuação, exclusividade, modo `primeiro_aceita` ou leilão.

**Edge cases:**
- Outra pessoa aceita a corrida enquanto ele lê o atraso → o aceite falha com "corrida não está mais disponível", e a fila não muda.
- Entregador sem rota em andamento → a corrida mostra só a distância e o tempo dela, como hoje.
- Cálculo de atraso indisponível → o aceite segue liberado, com o aviso "atraso não calculado".

### US04: Cada corrida fecha e falha sozinha

Como entregador, quero resolver cada parada com o código do comprador ou registrar que não deu certo, sem travar o resto da rota.

**Rules:**
- A entrega fecha com o código de 4 dígitos daquele pedido (PRD 001) e libera o repasse daquela corrida, como hoje.
- O entregador pode **devolver** uma corrida ainda não coletada: ela volta ao pool como `Publicada` e sai da rota dele *(premissa, confirme ou corrija; hoje essa ação não existe)*.
- Coleta que não deu certo (loja fechada, produto indisponível) → o entregador registra a falha com um motivo; a corrida sai da rota e o admin e o seller são avisados *(premissa, confirme ou corrija)*.
- Entrega que não deu certo (comprador ausente, endereço errado) → o entregador registra a falha com um motivo, a corrida sai da rota e o pedido vai para tratamento do admin. A mercadoria fica com o entregador até o admin decidir *(premissa, confirme ou corrija)*.
- A falha de uma corrida não muda o status nem o repasse das outras.

**Edge cases:**
- Código errado três vezes → vale a regra atual de tentativas do PRD 001.
- Devolução de corrida já coletada → bloqueada: o caminho é registrar a falha de entrega.
- Comprador cancela o pedido com a corrida na rota → a corrida sai da rota e o entregador é avisado na tela.

### US05: Um GPS por entregador

Como comprador, quero que o ponto no mapa seja o entregador de verdade e chegue sem falhas, mesmo quando ele leva vários pedidos.

**Rules:**
- O app do entregador liga um rastreio só, não um por corrida.
- Cada posição vale para todas as corridas dele em `Coletada` ou `EmTransito`. Quem pode ver continua sendo a RLS de hoje (PRD 058).
- As regras de frequência ficam como estão: no máximo uma posição a cada 20 s ou 50 m, e "ao vivo" até 3 min.

**Edge cases:**
- Entregador nega o GPS → a rota funciona, e os compradores veem "localização indisponível", como hoje.
- Corrida coletada fora da rota (rota vazia) → o rastreio funciona como hoje.

### US06: Comprador vê a fila no mapa

Como comprador, quero ver quantas entregas faltam antes da minha e uma previsão que considere essas paradas, para não ficar esperando sem saber.

**Rules:**
- Em `/pedido/[id]`, com a corrida em `Coletada` ou `EmTransito`, aparece "faltam N entregas antes da sua" e a previsão somando as paradas anteriores.
- Coletas pendentes de outros pedidos antes da entrega dele contam como paradas *(premissa, confirme ou corrija)*.
- Quando a fila muda e a posição dele piora, o mapa mostra "sua entrega foi reorganizada, nova previsão: X" até a próxima atualização. Não há WhatsApp.
- O comprador não vê endereço, nome nem produto dos outros pedidos.

**Edge cases:**
- Corrida ainda `Aceita` (não coletada) → mostra "o entregador ainda vai coletar seu pedido" e a posição da coleta na fila *(premissa, confirme ou corrija)*.
- Previsão indisponível → mostra só "faltam N entregas antes da sua".
- Ele é a parada atual → "você é a próxima entrega".

### US07: Aposentar a rota do seller e o lote do admin

Como dona da plataforma, quero um jeito só de entregar com parceiro local, para não manter três fluxos que confundem seller, admin e entregador.

**Rules:**
- `/seller/rotas` sai do menu e da navegação do seller. O acompanhamento continua em `/seller/entregas`.
- `/admin/lotes` sai do menu do admin.
- A tabela `rotas` segue gravando e lendo as entregas da Uber Direct; só a atribuição manual sai.
- A opção "Frete consolidado (30% de desconto)" sai do checkout, porque dependia do lote do admin *(premissa, confirme ou corrija: alternativa é manter o desconto e despachar o pedido como corrida comum)*.
- Os registros antigos de `rotas` e `lotes_consolidacao` ficam no banco, só leitura.

**Edge cases:**
- Rota manual com status `Atribuida` no momento da troca → continua visível para o entregador até ser entregue *(premissa, confirme ou corrija)*.
- Link antigo para `/seller/rotas` ou `/admin/lotes` → redireciona para `/seller/entregas` ou `/admin`.

## 4. Fluxo de Negócio

```
Pedido pago com entrega por parceiro local
   │
   ▼
Corrida publicada (exclusividade 5 min → pool, filtrado por área)
   │
   ▼
Entregador vê a corrida + encaixe sugerido + atraso nas outras
   │
   ├── não aceita ──▶ corrida segue disponível
   └── aceita ──▶ entra na fila da rota dele
                     │
                     ▼
              Parada atual = coleta? ──┬── sim ──▶ coletou? ──┬── sim ──▶ corrida Coletada, comprador vê "faltam N"
                                       │                      └── não ──▶ falha de coleta, corrida sai da rota
                                       └── não (entrega) ──▶ código certo? ──┬── sim ──▶ Entregue, repasse daquela corrida
                                                                             └── não ──▶ falha de entrega, corrida sai da rota, admin trata
   (a qualquer momento: aceitar nova corrida → reordena a fila → previsões dos compradores mudam no mapa)
```

## 5. Critérios de Aceite

### 5a. Critérios de aceite da feature

| Critério | Razão de negócio | Como verificar (observável) |
|----------|------------------|-----------------------------|
| Entregador com 3 corridas de 2 lojas vê uma fila com 2 coletas e 3 entregas, coletas antes das entregas correspondentes | Rota com lojas misturadas é o caso que motivou o PRD | Aceitar 3 corridas de 2 lojas com a conta de teste e abrir "Minha rota" |
| O app recusa mover a entrega para antes da coleta da mesma corrida | Entregar o que não foi coletado é impossível | Tentar arrastar e ver a recusa com explicação |
| A ordem sobrevive a fechar e abrir o app | Ele perde o plano se o celular reiniciar | Fechar o PWA, abrir e comparar |
| Antes de aceitar, o app mostra o atraso em minutos para cada entrega já na fila | Sem teto, a informação é o único freio contra comprador esperando horas | Com 2 corridas na fila, abrir uma terceira disponível |
| Entregar uma corrida da rota libera só o repasse dela | Dinheiro continua por corrida; erro aqui paga errado | Fechar uma parada e conferir `repasses` das outras corridas |
| Devolver corrida não coletada a deixa `Publicada` no pool em até 1 min | Outro entregador precisa poder pegar | Devolver e ver a corrida na lista de outro parceiro |
| Com 3 corridas em trânsito, o celular grava 1 posição por ciclo, visível para os 3 compradores | Hoje grava N vezes e gasta bateria e dados | Contar linhas em `corrida_posicoes` por ciclo |
| Comprador vê "faltam N entregas antes da sua" correto e sem dado de outros pedidos | Previsão errada é a principal reclamação ("cadê meu pedido") | Abrir `/pedido` de cada comprador da rota de teste |
| Reordenar a fila muda o "faltam N" e a previsão no mapa em até 2 min, sem WhatsApp | Decisão da dona: aviso só no mapa | Reordenar e acompanhar o `/pedido` |
| `/seller/rotas` e `/admin/lotes` somem dos menus e o link antigo redireciona; a Uber Direct segue gravando em `rotas` | Um fluxo só de parceiro local | Navegar como seller e admin; conferir uma entrega Uber Direct |

### 5b. Métricas de sucesso

| Métrica | Baseline (fonte) | Meta | Prazo | Mín. aceitável | Responsável |
|---------|-------------------|------|-------|-----------------|-------------|
| Corridas por saída do entregador (corridas na mesma rota) | A levantar: hoje 1, por construção | 3 | 60 dias após o Milestone 2 | 2 | Dona |
| Tempo entre pagamento e entrega das corridas de parceiro local | A levantar no banco (só 1 corrida de pedido em 2026) | A definir após 30 dias de uso real | 90 dias | A definir | Dona |
| Contatos "cadê meu pedido" por entrega de parceiro local | A levantar: contagem manual até 31/10 (PRD 058) | −50% | 60 dias após o Milestone 2 | −25% | Dona |

## 6. Milestones

### Milestone 1: Rota do entregador no app

**Por que é um marco:** o entregador passa a fazer várias corridas de várias lojas numa saída só, com a ordem pronta, e o comprador recebe uma posição ao vivo que não se repete por pedido.

**Funcionalidades:** US01, US02, US04, US05

**Checklist de aceite** (marcado pelo Aprovador após a implementação):
- [ ] Fila com 2 coletas e 3 entregas de 2 lojas, coletas antes das entregas correspondentes
- [ ] Recusa de entrega antes da coleta da mesma corrida
- [ ] Ordem mantida depois de fechar e abrir o app
- [ ] Entregar uma corrida libera só o repasse dela
- [ ] Devolver corrida não coletada a devolve ao pool em até 1 min
- [ ] Uma posição por ciclo para todas as corridas em trânsito

**Aprovador:** Dona (Andreia)

### Milestone 2: Aceite no caminho com o comprador informado

**Por que é um marco:** o entregador enche a rota sem parar, sabendo o custo de cada aceite, e o comprador deixa de receber uma previsão que ignora as outras entregas.

**Funcionalidades:** US03, US06

**Checklist de aceite** (marcado pelo Aprovador após a implementação):
- [ ] Atraso em minutos por entrega já na fila, mostrado antes do aceite
- [ ] "Faltam N entregas antes da sua" correto e sem dado de outros pedidos
- [ ] Reordenar muda o "faltam N" e a previsão no mapa em até 2 min, sem WhatsApp

**Aprovador:** Dona (Andreia)

### Milestone 3: Um fluxo só de parceiro local

**Por que é um marco:** seller, admin e entregador passam a ter um caminho único para entrega local, sem telas que ninguém usa.

**Funcionalidades:** US07

**Checklist de aceite** (marcado pelo Aprovador após a implementação):
- [ ] `/seller/rotas` e `/admin/lotes` fora dos menus, links antigos redirecionam
- [ ] Uber Direct segue gravando em `rotas`
- [ ] Opção de frete consolidado tratada conforme a decisão da US07

**Aprovador:** Dona (Andreia)

## 7. Riscos e Dependências

| Risco | Impacto | Mitigação | Status |
|-------|---------|-----------|--------|
| A base (rastreio, push, área) nunca rodou de ponta a ponta com entregador real | Alto | Fazer o E2E com o pedido `0CD57DAC6B` antes de começar o Milestone 1 | Pendente |
| Webhook do Asaas não confirmou o pedido de teste em 09/10; sem ele a corrida não nasce sozinha | Alto | Investigar a fila de webhooks do Asaas sandbox antes do E2E | Pendente |
| Sem teto, o entregador acumula corridas e o último comprador espera horas | Médio | Atraso visível no aceite (US03) e métrica de tempo até a entrega | Monitorando |
| PWA só rastreia com a tela ligada; rota longa sofre mais | Médio | Wake Lock já ativo; app nas lojas (PRD 058, Milestone 3) se o uso real pedir | Monitorando |
| Tirar o frete consolidado do checkout remove um desconto que o comprador via | Baixo | Decidir na US07; nenhum pedido pago usou a opção até hoje | Pendente |
| Custo da Routes API com reordenação frequente | Baixo | Sugestão só sob demanda e no aceite; 5.000 chamadas grátis por mês | Monitorando |

**Dependências:**

| Dependência | Tipo | Status | Impacto se bloqueado |
|-------------|------|--------|----------------------|
| PRD 058, rastreio | Interna | Milestone 1 em produção, sem E2E | US05, US06 |
| PRD 059, área do entregador | Interna | Em produção | US03 |
| PRD 001, código por pedido | Interna | Em produção | US04 |
| PRD 056, entrega por parceiro local no checkout | Interna | Em produção | Todas (origem das corridas) |
| Conta de entregador de teste com senha conhecida | Interna | Pendente (`parceiro1-teste` sem senha) | Aceite de todos os milestones |

## 8. Referências

- [PRD 060, rota com várias entregas](060-rota-com-varias-entregas.md): este PRD substitui o Milestone 2 dele e aposenta o lote do Milestone 1
- [PRD 058, rastreio](058-rastreio-da-entrega-em-tempo-real.md): mapa e previsão do comprador
- [PRD 059, zonas](059-zonas-de-servico-do-entregador.md): área que filtra o aceite
- [PRD 001, código de entrega](001-confirmacao-entrega-por-codigo-do-comprador.md): fecha cada corrida
- [PRD 056, parceiro local no checkout](056-entrega-por-parceiro-local-no-checkout.md): origem das corridas
- `supabase/migrations/0217_area_entregador_cidades.sql`: `aceitar_corrida` atual
- `supabase/migrations/0215_rota_lote_paradas.sql` e `0074_consolidacao_carga_rota.sql`: lote do admin, a aposentar
- `src/app/(seller)/seller/rotas/`: atribuição manual, a aposentar
- `src/components/entregador/RastreioEntregador.tsx`: hoje um GPS por card de corrida

## 9. Registro de Decisões

- **2026-10-09:** A rota é montada pelo entregador com as corridas que aceitou. Motivo: decisão da dona; o entregador conhece a cidade e ganha por corrida.
- **2026-10-09:** Pode misturar lojas e aceitar corrida com a rota andando, sem teto. Motivo: decisão da dona; derruba as premissas P3 (uma loja por lote) e "sem reordenar" do PRD 060.
- **2026-10-09:** Dinheiro e código continuam por corrida. Motivo: cada corrida já tem código e repasse próprios; manter evita mexer no caminho do dinheiro, que era o risco principal do Milestone 2 do PRD 060.
- **2026-10-09:** Aviso de mudança na fila só no mapa do `/pedido`. Motivo: decisão da dona.
- **2026-10-09:** Saem `/seller/rotas` (atribuição manual) e `/admin/lotes`. Motivo: decisão da dona; duplicavam o despacho automático, e o lote nunca foi usado com pedido pago (banco de produção em 09/10: 1 lote de teste, 5 rotas manuais, a última em 24/08).
- **2026-10-09:** Dependências: 058 (posição e mapa que a US05 e a US06 estendem), 059 (área que o aceite da US03 respeita), 001 (código que fecha cada corrida), 056 (cria as corridas). O 060 não entra em `depends_on` porque este PRD o substitui em parte, não depende do comportamento dele.
