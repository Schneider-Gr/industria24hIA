---
prd_number: "054"
status: rascunho
priority: alta
created: 2026-09-25
issue: "#782"
depends_on: ["053", "048"]
references:
  - "docs/prds/053-entrega-por-km-do-afiliado-logistico.md" – este PRD substitui as partes listadas em §2 "O que muda no PRD 053"
  - "supabase/migrations/0049_parceiro_logistica_credito_seller.sql" – parcerias_representante: pedido de parceria por produto, aprovado pelo seller
  - "supabase/migrations/0102_corrida_revisao_afiliado.sql" – despacho e aceite atuais (exclusividade de 5 min + pool de parceiros aprovados pelo admin)
  - "supabase/migrations/0193_valor_km_afiliado_e_piso_loja.sql" – R$/km por produto e piso por loja (substituídos aqui)
  - "supabase/migrations/0196_parceiro_logistico_endereco_veiculo.sql" – cadastro do entregador (veículo hoje em texto livre)
  - "src/lib/logistica-parceiro/preco-km.ts" – fórmula atual do preço por km
  - "https://github.com/Schneider-Gr/industria24hIA/pull/748" – PRD 048, devolução ao comprador (aberto)
---

# PRD 054: Entregador com afiliação por produto e tarifa por veículo

## 1. Contexto

- **Produto/área**: logística do marketplace (Manaus). Entregador = motorista que leva o pedido da loja ao comprador.
- **Estado atual** (verificado em 25/09/2026):
  - Três portas com três aprovações para o mesmo papel: **parceiro logístico** (cadastro em `/parceiro/cadastro`, aprovado pelo admin, pega corridas do pool), **afiliado logístico** (afiliação **por loja** em `/afiliado/solicitar`, aprovada pelo seller, tem 5 min de exclusividade) e **parceria por produto** (`parcerias_representante`, aprovada pelo seller, que aparece em `/seller/parceiro-logistica` mas a corrida não consulta).
  - Em produção: 4 parceiros aprovados (todos motoristas), 3 afiliações logísticas por loja, 1 parceria por produto aprovada. Só 1 pessoa é ao mesmo tempo afiliado e parceiro.
  - O preço da entrega por km (PRD 053) usa um R$/km **por produto** e um piso de R$ 6,00/km **por loja**, sem considerar o veículo. Uma entrega de 10 maços de alface e uma de 100 tijolos custam o mesmo por km.
  - O cadastro do entregador tem veículo em **texto livre**, peso suportado e valor mínimo para entrega.
- **Problema**: o seller não controla quem leva cada produto, o preço por km ignora o veículo que a carga exige (moto não leva tijolo; caminhão cobra mais que moto) e o seller não tem como saber se a entrega é viável para o tamanho do pedido.

> **Contexto técnico** no TRD. Este PRD reaproveita a tabela `parcerias_representante` e a cotação gravada do PRD 053.

## 2. Solução Proposta

### Visão de produto

- **Uma porta só**: o entregador se cadastra livremente e pede afiliação produto a produto; o seller aprova um a um. Nenhuma entrega sai sem essa aprovação.
- **Preço pelo veículo**: o peso do carrinho define a classe (moto, carro, caminhão) e o preço segue a tarifa que o seller definiu para aquela classe.
- **Simulador no avião** mostra ao seller qual veículo o pedido exige, quanto custa, quanto o frete pesa no pedido e a partir de quantas unidades a entrega é viável.
- **Quem aceitar primeiro** entre os entregadores aprovados e compatíveis leva a corrida.

### Decisões de produto

1. Cadastro do entregador **livre, sem aprovação** (decisão da dona, 25/09).
2. Afiliação **por produto**, aprovada pelo **seller um a um** (decisão da dona, 25/09).
3. **Nenhuma entrega** de produto sem aprovação (decisão da dona, 25/09).
4. A corrida vai para **quem aceitar primeiro** entre os elegíveis; sem prioridade para ninguém (decisão da dona, 25/09).
5. Entregadores existentes **são convertidos**; novos pedem afiliação produto a produto (decisão da dona, 25/09).
6. Conversão: cada afiliação logística **por loja** vira aprovação em **todos os produtos com entrega daquela loja**; parceiros aprovados pelo admin **sem vínculo com loja** continuam cadastrados e pedem afiliação (confirmado pela dona, 25/09).
7. Preço da entrega com um parceiro = **o maior entre a tarifa mínima e km (só ida) × R$/km** dele, **+ portos da rota + ajudantes** quando o pedido precisar; a tarifa mínima é absorvida quando os km valem mais (decisão da dona, 25/09).
8. **Revisto em 25/09 (dona, desenho final, #804): o seller define, por produto, as bandas de frete por veículo** (moto até 20 kg, carro até 300 kg, caminhão acima; tarifa mínima + R$/km, piso R$ 6 / 8 / 20 por check da 0201) e a quantidade mínima por pedido, ajudado pelo simulador do avião (US05). Frete = maior entre tarifa mínima e km de estrada (só ida) × R$/km da banda + balsa só de ida (tabela `travessias`, 0202). Sem ajudante. Versões anteriores (custo declarado pelo parceiro; R$/km único sem veículo) descartadas. Change OpenSpec `simulador-aviao-bandas-regioes-travessia`.
9. Classes: **moto até 20 kg**, **carro até 300 kg**, **caminhão acima de 300 kg**. Na fronteira vale a classe menor (decisão da dona, 25/09).
10. Classe no checkout = a **menor que aguenta o peso total** do carrinho (confirmado pela dona, 25/09).
11. O simulador parte da **quantidade mínima por pedido do produto** (`quantidade_minima`, que o carrinho já exige) e mostra se ela precisa subir para o frete valer a pena; limite padrão: frete acima de **20% do pedido** é inviável. Só sugere, não altera o produto (decisão da dona, 25/09).
12. Veículo no cadastro vira **lista fixa** (moto, carro, caminhão) (confirmado pela dona, 25/09).
13. **Piso por km por classe**, definido pela plataforma: **moto R$ 6,00**, **carro R$ 8,00**, **caminhão R$ 20,00** (decisão da dona, 25/09).
14. Produto **sem peso** não oferece entrega por parceiro até o seller cadastrar o peso (confirmado pela dona, 25/09).
15. Admin **não aprova** entregador; pode **suspender** (confirmado pela dona, 25/09).
16. Entregador de classe maior também vê corridas de classe menor, desde que a soma dele caiba no valor da corrida (confirmado pela dona, 25/09).
17. Só o peso define a classe; altura e largura geram alerta no simulador, sem mudar a classe (confirmado pela dona, 25/09).
18. **Telefone de WhatsApp obrigatório** no cadastro do seller e no do entregador, porque os avisos da corrida (US09) saem por WhatsApp (decisão da dona, 25/09).
19. Carrinho com itens com e sem entregador aprovado **se divide**: A vai por parceiro local, B escolhe outra forma (decisão da dona, 25/09).
20. Opções para B: **retirada na loja** e **a combinar**, conforme a loja permitir, mais **transportadora** e **Uber** quando existirem (decisão da dona, 25/09).
21. Pedido dividido dispara mensagem **orientando o entregador a se afiliar a todos os produtos da loja** e aviso ao seller (decisão da dona, 25/09). Gatilho = pedido pago dividido; destinatários = aprovados em algum produto da loja mas não em todos; limite = 1 por entregador, por loja, por semana (confirmado pela dona, 25/09).
22. O consumidor paga a soma do **parceiro elegível mais barato ÷ 0,95**, para que o motorista receba exatamente a soma dele e a plataforma fique com os 5% (confirmado pela dona, 25/09).
23. A corrida aparece para os parceiros elegíveis **cuja soma cabe no valor que o motorista vai receber** (`valor_parceiro`); o primeiro que aceitar leva (confirmado pela dona, 25/09).
24. Porto no simulador e no checkout: o seller ou o consumidor escolhe a travessia na lista dos parceiros; reconhecer a travessia pela rota do Google fica para uma segunda fase (confirmado pela dona, 25/09).
25. Km sempre **só de ida** (decisão da dona, 25/09, reafirmada depois do áudio do transportador).

### O que muda no PRD 053

| PRD 053 | Passa a ser |
|---|---|
| Decisões 2–3: R$/km por produto no popup do avião | Avião = liga/desliga a entrega por parceiro + simulador; R$/km vem da tarifa da classe (US04) |
| Decisão 9: maior R$/km do carrinho | Tarifa da classe exigida pelo peso total (US06) |
| Decisão 12: basta a loja ter afiliado aprovado | Itens com entregador aprovado e compatível vão por parceiro; os demais formam um envio à parte (US06, US10) |
| Decisão 13 e US05: piso por km por loja (R$ 6,00) | Piso por km por classe (decisão 13) |
| US03: 5 min de exclusividade, depois pool | Quem aceitar primeiro entre os elegíveis; sem pool aberto (US07) |

Continuam valendo do PRD 053: consumidor paga no checkout, sem ida e volta, opção paralela às demais, cotação gravada com validade, `preco_final` = valor cotado e `valor_parceiro` com a comissão atual, devolução do frete sem aceite em 60 minutos.

### Fora do escopo

- Pagamento ao entregador pelo Asaas: PRD próprio. A dona quer usar o Asaas; o split nativo executa no recebimento, antes de se saber quem entrega, então o mecanismo está em decisão (hoje nenhum código paga o entregador).
- Cubagem (volume) na escolha da classe *(premissa — confirme ou corrija)*.
- Preço por bairro ou zona (fica com o PRD 049) *(premissa — confirme ou corrija)*.
- Região de atuação escolhida ao pedir afiliação (estado/cidade, como no Bubble) *(premissa — confirme ou corrija)*.
- Verificação de documentos do entregador (CNH, placa) como condição de entrega *(premissa — confirme ou corrija)*.

## 3. Funcionalidades

### US01: Cadastro livre do entregador

Como entregador, quero me cadastrar sem esperar aprovação, para pedir afiliação aos produtos que quero entregar.

**Rules:**
- Campos: nome, CEP, cidade, bairro, número, telefone de WhatsApp (obrigatório), veículo (moto, carro ou caminhão), peso suportado em kg, valor mínimo para entrega.
- O cadastro fica ativo ao salvar; nenhuma aprovação do admin.
- Sem afiliação aprovada, o entregador não vê nenhuma corrida.
- O admin pode suspender um entregador; suspenso não vê nem aceita corridas.

**Edge cases:**
- Peso suportado acima do limite da classe (moto com 50 kg) → aceita e mostra aviso *(premissa — confirme ou corrija)*.
- Entregador muda o veículo depois de aprovado → as aprovações continuam; a elegibilidade às corridas passa a usar o veículo novo *(premissa — confirme ou corrija)*.
- Veículo em texto livre de cadastros antigos (#780) → aparece vazio até o entregador escolher da lista *(premissa — confirme ou corrija)*.

### US02: Pedir afiliação a produtos

Como entregador, quero ver os produtos disponíveis para entrega e pedir afiliação a cada um, para receber as corridas desses produtos.

**Rules:**
- Lista os produtos com entrega por parceiro ligada, com loja, local de coleta e peso por unidade.
- Pedido nasce "Em análise" e o seller é avisado no painel.
- O entregador vê o status de cada pedido: Em análise, Aprovada, Recusada.
- Pode cancelar um pedido ou uma afiliação aprovada.

**Edge cases:**
- Produto cujo peso por unidade passa do limite do seu veículo → pedido permitido, com aviso *(premissa — confirme ou corrija)*.
- Pedido repetido para o mesmo produto → bloqueado enquanto houver um em análise ou aprovado.
- Seller desliga a entrega por parceiro do produto → pedidos em análise ficam parados; aprovações continuam guardadas para quando religar *(premissa — confirme ou corrija)*.

### US03: Seller aprova afiliação um a um

Como seller, quero aprovar ou recusar cada pedido de afiliação por produto, para decidir quem leva cada produto meu.

**Rules:**
- Fila em `/seller/parceiro-logistica`: entregador, produto, veículo, peso suportado, valor mínimo, data, status, ações Aprovar e Recusar.
- O seller pode revogar uma aprovação a qualquer momento.
- Aprovação vale só para aquele produto.

**Edge cases:**
- Revogação com corrida já aceita por esse entregador → a corrida em andamento continua *(premissa — confirme ou corrija)*.
- Entregador suspenso pelo admin → aparece como suspenso na fila; aprovar não libera corridas.

### US04: Custos declarados pelo parceiro

Como entregador, quero informar no meu cadastro quanto cobro, para só receber corridas que pagam o meu custo.

**Rules:**
- Campos: tarifa mínima (por entrega, para o veículo dele), R$/km, portos e balsas (nome e valor), ajudante (tem? quantos? valor por ajudante).
- R$/km não pode ficar abaixo do piso da classe do veículo (decisão 13).
- Portos: digitados um a um ou enviados em planilha (nome da travessia; valor).
- Sem tarifa mínima e R$/km preenchidos, o parceiro não recebe corridas.

**Edge cases:**
- R$/km abaixo do piso → não salva; mostra o piso.
- Planilha de portos com linha inválida → mostra as linhas com erro antes de gravar; grava só as válidas após confirmação *(premissa — confirme ou corrija)*.
- Plataforma sobe o piso → parceiros abaixo dele deixam de receber corridas até corrigir; são avisados.

### US05: Simulador do avião

Como seller, quero ver o custo total de entregar o produto por parceiro em cada região para decidir o R$/km de cada veículo e o pedido mínimo que torna a entrega viável.

**Rules (dona, 25/09, desenho final; change `simulador-aviao-bandas-regioes-travessia`, #804):**
- O avião mostra as bandas do produto (moto, carro, caminhão: tarifa mínima e R$/km) e a quantidade mínima por pedido; Salvar grava os dois e liga a entrega por parceiro.
- Para três regiões de referência (perto, médio, longe; destinos editáveis) o simulador calcula o custo total = maior entre tarifa mínima e km de estrada × R$/km da banda do veículo que o peso da quantidade exige, + balsa só de ida; e o % sobre o pedido: até 10% ótimo, até 20% viável.
- Quantidade viável e ideal por região, recalculando o frete a cada quantidade; quando a troca de veículo "fura" a viabilidade, mostra as duas faixas ("6 un. (carro) ou a partir de 20 un.").
- Grade quantidade × R$/km por região; clicar numa célula preenche o R$/km da banda e a quantidade.
- Pedido mínimo sugerido: menor quantidade que fecha perto, perto e médio, e todas as regiões.
- Travessia: a Routes API marca trecho de barco (manobra FERRY); o km de barco sai do km cobrado e soma a balsa da tabela `travessias` (valor por veículo equivalente × fator do veículo), editável, com fonte e data. "Sem rota" por estrada → aviso "pode exigir barco" e opções informar travessia ou entrega a combinar (PRD 050).

**Edge cases:**
- Produto sem peso ou sem preço → não simula e pede o cadastro.
- R$/km abaixo do piso → recusado no navegador, no servidor e no banco (check da 0201).
- Fator de equivalência não oficial → "estimativa, confirme com o operador".
- Nenhuma quantidade até 1000 fecha → "inviável nessa distância".
- Fora do escopo (fase 2, PRD próprio): pedido mínimo por faixa de distância aplicado no carrinho e no checkout.

### US06: Checkout com o preço do parceiro mais barato

Como consumidor, quero ver o preço da entrega por parceiro local calculado com o custo real de quem entrega, para pagar o valor justo.

**Rules:**
- Peso total dos itens com entrega da loja define a classe (decisão 10).
- Para cada parceiro elegível: o maior entre a tarifa mínima e km × R$/km dele + porto escolhido + ajudantes; o consumidor paga a menor soma ÷ 0,95 (decisão 22); cotação gravada com validade (PRD 053).
- A opção cobre os itens que têm ao menos um entregador aprovado, ativo e compatível (classe, peso suportado, valor mínimo); os demais itens seguem a US10.
- A classe e o preço usam só o peso dos itens que vão por parceiro.

**Edge cases:**
- Item sem peso → não vai por parceiro; entra no envio B (US10).
- Carga acima de 300 kg sem nenhum caminhão compatível aprovado → a opção não aparece.
- Parceiro altera os custos entre a cotação e o pagamento → vale a cotação gravada até expirar.

### US07: Corrida para quem aceitar primeiro

Como entregador aprovado, quero receber as corridas dos produtos em que fui aprovado e que meu veículo aguenta, para aceitar as que me interessam.

**Rules:**
- Elegível = aprovado em **todos** os itens da corrida + veículo da classe da corrida ou maior + peso suportado ≥ peso da carga + soma dele (tarifa mínima ou km + porto + ajudante) ≤ `valor_parceiro` da corrida (decisão 23) + não suspenso.
- Todos os elegíveis veem a corrida ao mesmo tempo; o primeiro que aceitar leva.
- Não há exclusividade nem pool aberto a quem não é aprovado.
- Sem aceite em 60 minutos → regra do PRD 053 (devolução do frete, pedido vira retirada).

**Edge cases:**
- Dois aceites ao mesmo tempo → só o primeiro vale; o segundo recebe "corrida já aceita".
- Nenhum elegível no momento do pagamento → a corrida fica aguardando e conta o prazo de 60 minutos.
- Entregador revogado ou suspenso depois de ver a corrida → não consegue aceitar.

### US09: Três avisos da corrida

Como entregador, cliente e seller, quero ser avisado nos momentos certos da corrida, para agir sem precisar abrir o painel.

**Rules:**
- **Aviso 1, ao entregador:** quando a corrida é criada, todos os elegíveis (US07) recebem um chamado para aceitar, com coleta, destino, km, peso, veículo e quanto vão receber (decisão da dona, 25/09).
- **Aviso 2, ao cliente:** quando o entregador confirma a coleta, o cliente recebe "sua mercadoria saiu", com o código de entrega (decisão da dona, 25/09; momento = coleta confirmada, premissa aceita pela dona em 25/09).
- **Aviso 3, ao seller:** quando a corrida é aceita, o seller recebe o nome e o telefone do entregador e o link para acompanhar a corrida (decisão da dona, 25/09; momento = aceite, premissa aceita pela dona em 25/09).
- Canal: WhatsApp; o cliente recebe também por e-mail *(premissa — confirme ou corrija)*.
- Cada aviso sai uma vez por corrida; falha de envio nunca trava a corrida.

**Edge cases:**
- Loja antiga sem WhatsApp (14 de 22 em 25/09) → o aviso ao seller fica só no painel até ele salvar o cadastro com o WhatsApp, que passa a ser exigido; cliente sem telefone → só e-mail.
- Nenhum elegível no momento da criação → nenhum chamado; se alguém ficar elegível depois (nova aprovação), não é chamado retroativamente *(premissa — confirme ou corrija)*.
- WhatsApp oficial exige modelo de mensagem aprovado pela Meta para iniciar conversa → os três textos precisam ser aprovados antes do deploy.

### US10: Carrinho dividido quando falta entregador para algum item

Como consumidor, quero receber por parceiro local os itens que têm entregador e escolher outra forma para os demais, para não perder a entrega rápida por causa de um item.

**Rules:**
- Itens com entregador aprovado e compatível formam o envio A (parceiro local); os demais formam o envio B.
- Opções para B: retirada na loja e a combinar, conforme a loja permitir, mais transportadora e Uber Direct quando atenderem.
- A tela explica a divisão: "O parceiro local ainda não entrega [produto]. Escolha como receber esse item."
- Quando uma mesma forma (transportadora, Uber ou retirada) cobre todos os itens, ela também aparece como opção de envio único.
- Um pagamento só: produtos + frete de A + frete de B.
- B "a combinar" → o carrinho inteiro espera a cotação do vendedor antes de pagar (PRD 050).
- O seller vê as duas partes do pedido separadas (corrida de A e a forma escolhida para B).

**Edge cases:**
- Nenhuma opção disponível para B (loja sem retirada, sem a combinar, sem transportadora e fora do Uber) → B não pode ser comprado com entrega; o consumidor remove o item ou escolhe envio único se houver *(premissa — confirme ou corrija)*.
- Ninguém aceita a corrida de A em 60 minutos → devolve só o frete de A e A vira retirada (PRD 053); B segue a forma escolhida *(premissa — confirme ou corrija)*.
- Todos os itens sem entregador → não há envio A; o checkout mostra as opções normais.

### US11: Mensagem para completar a afiliação na loja

Como plataforma, quero orientar o entregador a se afiliar a todos os produtos da loja quando um pedido sai dividido, para que os próximos pedidos saiam inteiros por parceiro.

**Rules:**
- Gatilho: pedido **pago** dividido por falta de entregador em algum item (não dispara por carrinho aberto).
- Destinatários: entregadores aprovados em pelo menos um produto daquela loja e não em todos.
- Mensagem por WhatsApp: produtos que ele já entrega, produtos que faltaram no pedido e link para a lista de produtos da loja no painel dele.
- Aviso ao seller: produto sem entregador aprovado e quantos pedidos ele dividiu.
- Limite: 1 mensagem por entregador, por loja, por semana; o mesmo para o aviso ao seller.

**Edge cases:**
- Nenhum entregador aprovado em produto algum da loja → só o seller é avisado.
- Entregador com pedido de afiliação em análise para os produtos que faltaram → não recebe a mensagem sobre esses produtos *(premissa — confirme ou corrija)*.
- Falha de envio → não reenvia na mesma semana; não afeta o pedido.

### US08: Conversão dos entregadores atuais

Como plataforma, quero converter as aprovações atuais para o modelo por produto, para ninguém perder corridas na troca.

**Rules:**
- Cada afiliação logística aprovada por loja vira aprovação em todos os produtos com entrega daquela loja (decisão 6).
- Parceiros aprovados pelo admin sem loja ficam cadastrados, sem aprovações; pedem afiliação.
- A conversão roda uma vez, no deploy.

**Edge cases:**
- Afiliado de loja que também é parceiro → recebe as aprovações da loja; o cadastro de parceiro vira o cadastro único.
- Produto criado na loja depois da conversão → não entra automaticamente; o entregador pede *(premissa — confirme ou corrija)*.

## 4. Fluxo de Negócio

```
Entregador se cadastra (livre) ──▶ pede afiliação ao produto ──▶ Seller aprova?
                                                                   ├── não ──▶ Recusada
                                                                   └── sim ──▶ Aprovada

Consumidor fecha o carrinho
   │
   ▼
Peso total ──▶ classe (≤20 moto · ≤300 carro · >300 caminhão)
   │
Todos os itens têm entregador aprovado e compatível? E tarifa da classe definida?
   ├── não ──▶ opção não aparece
   └── sim ──▶ preço = máx(tarifa mínima, km × R$/km da classe) ──▶ paga
                                   │
                    Corrida para todos os elegíveis ──▶ 1º que aceitar leva
                                   │
                    Ninguém em 60 min ──▶ devolve frete, vira retirada (PRD 053)
```

## 5. Critérios de Aceite

### 5a. Critérios de aceite da feature

| Critério | Razão de negócio | Como verificar (observável) |
|----------|------------------|-----------------------------|
| Entregador novo salva o cadastro e não vê corridas até ter um produto aprovado | Nenhuma entrega sem aprovação | Cadastro novo; abrir painel de corridas |
| Seller aprova um pedido e o entregador passa a ver corridas só daquele produto | Controle do seller por produto | Aprovar 1 de 2 pedidos; gerar pedidos dos dois produtos |
| Carrinho de 3 kg cota com parceiros de moto; de 250 kg com os de carro; de 400 kg com os de caminhão; o preço é o do mais barato ÷ 0,95 | Preço pelo custo real de quem entrega | Três carrinhos de teste com 2 parceiros de custos diferentes |
| Preço = máximo entre tarifa mínima e km × R$/km | Fórmula decidida | Entrega curta cai na mínima; longa no km |
| Moto não vê corrida de carro; caminhão vê corrida de carro | Compatibilidade de veículo | Dois entregadores, uma corrida de carro |
| Entregador com valor mínimo acima do valor da corrida não a vê | Respeitar o cadastro do entregador | Valor mínimo alto; corrida barata |
| Dois aceites simultâneos: só um fica com a corrida | Quem aceitar primeiro | Aceite concorrente |
| Simulador sugere a quantidade a partir da qual o frete fica ≤ 20% do pedido, partindo da quantidade mínima do produto | Orientar o seller | Tijolo com mínimo 5 a 5 km |
| As 3 afiliações por loja viram aprovações nos produtos da loja após o deploy | Ninguém perde corrida | Conferir a lista do seller após a conversão |
| Criação, coleta e aceite disparam os três avisos, uma vez cada | Agir sem abrir o painel | Corrida de teste com telefones reais |
| Carrinho com item sem entregador se divide em A (parceiro) e B (outras formas), com um pagamento só | Não perder a entrega rápida por um item | Carrinho com 1 produto afiliado e 1 não |
| Pedido pago dividido dispara a mensagem ao entregador e o aviso ao seller, respeitando 1 por semana | Levar o entregador a cobrir a loja toda | Dois pedidos divididos na mesma semana: 1 mensagem |

### 5b. Métricas de sucesso

| Métrica | Baseline (fonte) | Meta | Prazo | Mín. aceitável | Responsável |
|---------|-------------------|------|-------|-----------------|-------------|
| Produtos com entrega por parceiro com ≥ 1 entregador aprovado | 1 parceria aprovada (25/09) | 50% dos produtos com avião ligado | 60 dias | 20% | Dona |
| Corridas aceitas em até 60 min | A levantar | 80% | 60 dias | 60% | Dona |
| Parceiros com tarifa mínima e R$/km declarados | 0 (feature nova) | 80% dos parceiros com afiliação aprovada | 30 dias | 50% | Dona |

## 6. Milestones

### Milestone 1: Entregador se afilia a produtos

**Por que é um marco:** qualquer motorista entra sozinho e o seller passa a escolher quem leva cada produto.

**Funcionalidades:** US01, US02, US03, US08

**Checklist de aceite:**
- [ ] Entregador novo salva o cadastro e não vê corridas até ter um produto aprovado
- [ ] Seller aprova um pedido e o entregador passa a ver corridas só daquele produto
- [ ] As 3 afiliações por loja viram aprovações nos produtos da loja após o deploy

**Aprovador:** Dona

### Milestone 2: Custos do parceiro e simulador

**Por que é um marco:** o parceiro declara quanto cobra e o seller vê no simulador se a entrega fecha a conta com o mínimo por pedido atual.

**Funcionalidades:** US04, US05

**Checklist de aceite:**
- [ ] Simulador sugere a quantidade a partir da qual o frete fica ≤ 20% do pedido
- [ ] R$/km abaixo do piso da classe não é salvo no cadastro do parceiro
- [ ] Simulador parte da quantidade mínima do produto e sugere o ajuste quando o frete passa de 20%

**Aprovador:** Dona

### Milestone 3: Entrega vendida pelo veículo certo

**Por que é um marco:** o consumidor paga pelo veículo que o pedido exige e a corrida chega só a quem pode fazê-la.

**Funcionalidades:** US06, US07, US09, US10, US11

**Checklist de aceite:**
- [ ] Carrinho de 3 kg cota com parceiros de moto; de 250 kg com os de carro; de 400 kg com os de caminhão; o preço é o do mais barato ÷ 0,95
- [ ] Preço = máximo entre tarifa mínima e km × R$/km do parceiro + porto + ajudante
- [ ] Moto não vê corrida de carro; caminhão vê corrida de carro
- [ ] Entregador com valor mínimo acima do valor da corrida não a vê
- [ ] Dois aceites simultâneos: só um fica com a corrida
- [ ] Criação, coleta e aceite disparam os três avisos, uma vez cada
- [ ] Carrinho com item sem entregador se divide em A (parceiro) e B (outras formas), com um pagamento só
- [ ] Pedido pago dividido dispara a mensagem ao entregador e o aviso ao seller, respeitando 1 por semana

**Aprovador:** Dona

## 7. Riscos e Dependências

| Risco | Impacto | Mitigação | Status |
|-------|---------|-----------|--------|
| Cadastro livre sem verificação: entregador sai com a carga | Alto | Aprovação do seller por produto; suspensão pelo admin | Mitigado no desenho |
| Produto sem peso (69 de 127 em 24/09) não oferece entrega | Médio | Simulador pede o peso; PRD 051 sugere peso pelo Jev | Monitorando |
| Poucos entregadores por produto: opção some do checkout | Médio | Métrica de cobertura; aviso ao seller no avião | Monitorando |
| Mudança no despacho e no aceite mexe no caminho do dinheiro | Alto | Teste com rollback em prod; confirmação da dona antes do merge | Pendente |
| Pagamento ao entregador inexistente | Alto | PRD próprio; mecanismo no Asaas em decisão | Pendente |
| Modelos de WhatsApp não aprovados pela Meta | Médio | Submeter os 3 textos antes do Milestone 3 | Pendente |

**Dependências:**

| Dependência | Tipo | Status | Impacto se bloqueado |
|-------------|------|--------|----------------------|
| PRD 053 (checkout por km, cotação gravada, 60 min) | Interna | pronto; avião e simulador no ar | Milestone 3 |
| PRD 048 (devolução) | Interna | PR #748 aberto | Devolução dos 60 min fica manual |

## 8. Referências

- PRD 053 e migrations 0049, 0102, 0193, 0196 (ver frontmatter).
- `src/lib/logistica-parceiro/preco-km.ts`: fórmula a estender com tarifa mínima e classe.

## 9. Registro de Decisões

- **2026-09-25:** Brainstorm com a dona: cadastro livre, afiliação por produto aprovada pelo seller, nenhuma entrega sem aprovação, quem aceitar primeiro, conversão dos existentes, seller define a tarifa, fórmula máx(tarifa mínima, km × R$/km), tarifa por classe (moto ≤ 20 kg, carro ≤ 300 kg, caminhão acima), quantidade mínima só sugestão.
- **2026-09-25:** Confirmados pela dona: classe = menor que aguenta o peso total; limite de 20%; veículo em lista fixa; piso por classe da plataforma; produto sem peso fora; admin só suspende; classe maior vê corrida menor; só peso define a classe; conversão por loja → produtos da loja.
- **2026-09-25:** `depends_on: ["053", "048"]`. Critério: 053 define checkout, cotação gravada, preço/comissão da corrida e os 60 minutos que este PRD mantém ou substitui; 048 executa a devolução do frete.
- **2026-09-25:** Pisos por km: moto R$ 6,00, carro R$ 8,00, caminhão R$ 20,00. Três avisos da corrida (US09): chamado ao entregador na criação, "mercadoria saiu" ao cliente na coleta, acompanhamento ao seller no aceite. Pagamento ao entregador pelo Asaas vai para PRD próprio.
- **2026-09-25:** Telefone de WhatsApp obrigatório para seller e entregador (dona).
- **2026-09-25:** Carrinho dividido (US10): A por parceiro, B por retirada/a combinar conforme a loja, transportadora ou Uber; mensagem ao entregador para completar a afiliação na loja e aviso ao seller (US11), gatilho pedido pago dividido, 1 por semana.
- **2026-09-25:** Simulador: custos declarados pelo parceiro (tarifa mínima, R$/km, portos por lista ou digitação, ajudante); fórmula máx(tarifa mínima, km × R$/km) + portos + ajudantes; km só ida; consumidor paga o mais barato ÷ 0,95; seller simula a partir da quantidade mínima por pedido e recebe sugestão de ajuste. Áudio de transportador (ida e volta, porto, motorista, ajudantes) considerado; dona manteve só ida.
- **2026-09-25 (noite):** Dona revisou: três bandas de frete por produto definidas pelo seller no avião (tarifa mínima sem padrão, R$/km com piso 6/8/20, migration 0201); simulador sai do cadastro e vai para o avião, sugere o R$/km e a quantidade mínima. Substitui a decisão 8 original.
- **2026-09-25 (fim do dia):** Dona refez o simulador do zero: um R$/km por produto definido pelo seller + quantidade mínima; simulador mostra frete e % do pedido para perto/médio/longe com faixas 10% (ótimo) e 20% (viável) e a quantidade mínima viável/ideal; salva R$/km e quantidade mínima. Bandas por veículo (#801, 0201) descartadas.
- **2026-09-25 (noite, final):** Brainstorm com a dona fechou o simulador: bandas por veículo + custo por região + travessia (Routes API FERRY, tabela ANTAQ, balsa só de ida), sem ajudante; pedido mínimo por região fica para a fase 2. Change OpenSpec `simulador-aviao-bandas-regioes-travessia`, Issue #804.
- **2026-09-25:** Pendentes: mecanismo de pagamento ao entregador; premissas marcadas nos edge cases e no fora do escopo.
