---
prd_number: "039"
status: rascunho
priority: alta
created: 2026-09-16
issue: ""
depends_on: ["036", "010", "023"]
references:
  - "supabase/migrations/0175_estoque_ledger_milestone1.sql"
  - "docs/prds/036-ledger-estoque-multi-local.md"
  - "docs/prd/centro-distribuicao-fulfillment.md"
  - "src/app/(seller)/seller/centros/page.tsx"
---

# PRD 039: Custódia e operação do CD Indústria (armazenar mercadoria do seller)

## 1. Contexto

- **Produto/área**: serviço de armazenagem do marketplace Indústria 24h. É o miolo do fulfillment: receber mercadoria de terceiro, guardar em endereço conhecido, reservar no pedido, separar, expedir e cobrar por isso.
- **Estado atual (verificado em produção em 16/09/2026)**:
  - O ledger de estoque existe (migration `0175`): todo movimento vira lançamento imutável com tipo, origem, motivo, autor e centro. São 143 lançamentos, um por produto, todos do seed da migração.
  - Existem 21 centros de distribuição, **todos do tipo `seller`**. Não existe nenhum centro `tipo = 'industria'`. Apenas 5 têm localização preenchida e apenas 1 tem endereço em Manaus, e é de seller, não do marketplace. **O piloto de Manaus não tem onde acontecer.**
  - `centros_distribuicao` guarda `nome`, `localizacao` (JSON com endereço e lat/lng), `status`, `tipo` e `padrao`. Não tem CEP estruturado, não tem capacidade, não tem responsável e não tem nada dentro: não existe o conceito de posição dentro do galpão.
  - O saldo pertence a um centro (`estoque_saldos` por produto e centro), mas a autoridade da escrita ainda é `produtos.estoque_atual`; o ledger é espelho.
  - Não existe reserva: `checkout_criar_pedido` ainda baixa o saldo na criação do pedido.
  - Os status de pedido `Em Separação` (1 pedido) e `Enviado` (2 pedidos) já existem em produção, mas são rótulos escolhidos à mão, sem operação por trás.
- **Problema**: o marketplace decidiu vender armazenagem e hoje não consegue executar nenhuma etapa dela. Não sabe dizer quanto de mercadoria de um seller está sob sua guarda, onde ela está fisicamente, o que já foi prometido a um comprador, o que foi separado e o que saiu, e portanto não tem como cobrar por nada disso. Guardar mercadoria de terceiro sem esse registro não é um recurso faltando: é passivo. Quando o seller diz que enviou 500 e o sistema diz 480, sem custódia registrada a diferença vira prejuízo do marketplace.

## 2. Solução Proposta

### Visão de produto

Quatro movimentos, nesta ordem, cada um entregando valor sozinho:

1. **Reserva no pedido** (Milestone 2 do PRD 036). O pedido para de baixar estoque e passa a reservar. É pré-requisito de tudo: sem reserva não existe "separar o que foi prometido", e é bug de produção hoje.
2. **Endereço dentro do galpão.** O centro deixa de ser caixa preta e passa a ter posições (rua, prédio, nível, apartamento). Saldo passa a ter endereço, e por isso alguém consegue encontrar a mercadoria.
3. **Custódia e operação.** Mercadoria de terceiro entra por um aviso de recebimento, é conferida contra o que foi anunciado, é endereçada, é separada num pedido e é expedida. Cada etapa é lançamento no ledger, com autor.
4. **Tarifação.** O que foi guardado, por quanto tempo e quantas vezes foi manuseado vira fatura mensal do seller.

### Decisões de produto

1. **A mercadoria no CD continua sendo do seller.** O Indústria é depositário, não comprador. Não há compra de estoque, não há transferência de titularidade e a cobrança é de serviço, não de mercadoria. *(premissa — confirme ou corrija; muda a modelagem fiscal inteira)*
2. **A conferência de entrada é a que vale.** O saldo creditado ao seller é o conferido no recebimento, nunca o declarado por ele no aviso. Divergência vira registro com foto, não ajuste silencioso.
3. **Pedido de produto em custódia não é expedido pelo seller.** Quem separa e expede é a operação do CD. O seller vê o andamento, não executa.
4. **Endereçamento é obrigatório no CD Indústria e opcional no CD do seller.** O seller que guarda em casa não precisa inventar rua e prédio; quem opera galpão de terceiros precisa.
5. **Tarifa é por contrato de armazenagem da loja, não tabela global.** Tabela global existe como padrão, o contrato da loja sobrepõe. Mesmo desenho já usado em transportadoras (`0145`, `0148`).
6. **Cobrança de armazenagem é fatura mensal separada, não desconto no repasse.** Motivo: o repasse já é derivado e frágil (`0158`), e misturar serviço com venda torna impossível auditar qualquer um dos dois. *(premissa — confirme ou corrija)*
7. **Sem WMS externo na v1.** O endereçamento é campo estruturado e lista de separação na tela, não integração com sistema de armazém.

### Fora do escopo

- Lote, validade e FEFO. Entram com perecíveis (PRD 010) sobre a mesma estrutura de custódia; aqui a separação é FIFO por endereço. *(premissa — confirme ou corrija)*
- Código de barras, coletor e conferência por leitura. A v1 confere na tela, digitando quantidade.
- Cross-docking e consolidação de carga entre lojas.
- Inventário cíclico programado. A v1 tem contagem sob demanda, que já gera ajuste com motivo.
- Emissão de nota fiscal de remessa e de retorno simbólico. É bloqueio contábil externo, tratado como dependência.
- Operação de mais de um CD Indústria simultâneo.

## 3. Funcionalidades

### US01: Reserva no pedido em vez de baixa (Milestone 2 do PRD 036)

Como marketplace, quero que o pedido reserve a mercadoria em vez de baixá-la, para que exista algo concreto a separar e para que pedido não pago devolva o saldo sozinho.

**Rules:**
- Criar pedido gera reserva vinculada ao pedido, ao produto e ao centro; a mercadoria sai do saldo disponível e continua no saldo físico.
- A baixa definitiva acontece na expedição, não no pagamento.
- Cancelamento antes da expedição libera a reserva integralmente, com motivo registrado.
- Reserva de pedido não pago expira em 30 minutos e libera o saldo. *(premissa do PRD 036 — confirme)*
- O saldo disponível desconta reservas ativas, e reserva vencida não conta como ativa mesmo que o job de expiração não tenha rodado.
- `produtos.estoque_atual` passa a ser derivado do ledger e permanece correto sem intervenção.

**Edge cases:**
- Checkout multi-loja em que a segunda loja falha → as reservas da primeira são liberadas na mesma transação.
- Pagamento confirmado após a expiração, com o saldo já vendido → pedido entra em pendência de estoque, com opção de reembolso, sem baixa forçada.
- Duas compras simultâneas da última unidade → uma reserva, uma recusa, nenhum saldo negativo.
- Pedido criado sob a regra antiga no momento da virada → não ganha reserva retroativa, para não baixar duas vezes.

### US02: Endereço de armazenagem dentro do centro

Como operação do CD, quero que cada quantidade tenha endereço físico, para guardar e achar a mercadoria sem depender da memória de quem guardou.

**Rules:**
- O centro passa a ter endereços de armazenagem com identificação estruturada (rua, prédio, nível, apartamento) e código legível derivado dela.
- O centro passa a exigir CEP estruturado, além da localização textual que já existe (US03 do PRD 036, ainda não entregue).
- Saldo em CD Indústria pertence a um endereço; saldo em CD de seller pode ficar sem endereço.
- Um endereço guarda mais de um produto e um produto ocupa mais de um endereço.
- Endereço pode ser bloqueado (avaria, manutenção), e endereço bloqueado não recebe entrada nem entra em separação.

**Edge cases:**
- Tentativa de excluir endereço com saldo → bloqueada, com instrução de transferir antes. Mesma regra que já existe para centro.
- Endereço duplicado no mesmo centro → rejeitado.
- Produto em CD Indústria sem endereço (herdado da virada) → aparece numa fila de "a endereçar" e não entra em separação até ser endereçado.

### US03: Aviso de recebimento e conferência de entrada

Como seller, quero anunciar o que vou enviar ao CD e acompanhar a conferência, para saber exatamente quanto do meu material o marketplace assumiu.

**Rules:**
- O seller cria um aviso de recebimento com produtos e quantidades declaradas, e recebe um identificador para acompanhar a carga.
- O aviso tem ciclo: rascunho, anunciado, em conferência, conferido, cancelado.
- A conferência registra a quantidade recebida por produto, sempre por operador identificado.
- Só a quantidade conferida vira lançamento de entrada no ledger, com origem `recebimento` e referência ao aviso.
- Divergência entre declarado e conferido é registrada com motivo e foto, e fica visível para o seller.
- Mercadoria conferida só vira saldo disponível depois de endereçada.

**Edge cases:**
- Chegou produto que não estava no aviso → registrado como item não anunciado, conferido à parte, sem virar saldo até o seller confirmar.
- Chegou mais do que o anunciado → o excedente segue a mesma regra do item não anunciado.
- Aviso anunciado cuja mercadoria nunca chega → expira em 30 dias e é cancelado, sem afetar saldo. *(premissa — confirme ou corrija)*
- Produto avariado no recebimento → entra como avaria, não como saldo vendável.

### US04: Separação e expedição

Como operação do CD, quero uma lista do que separar e de onde, para expedir o pedido certo sem procurar mercadoria no galpão.

**Rules:**
- Pedido pago com item em custódia gera ordem de separação, com produto, quantidade e endereço de origem.
- A separação é confirmada por operador identificado, item a item.
- A expedição converte a reserva em baixa definitiva no ledger, com referência ao pedido, e move o pedido para `Enviado`.
- Pedido sem reserva ativa não pode ser expedido, e a tela mostra o pedido e o motivo registrado da liberação.
- Devolução gera lançamento de entrada com origem `devolucao`, nunca reversão do lançamento original.

**Edge cases:**
- Endereço indicado está vazio na hora de separar → o operador registra a falta, o sistema sugere outro endereço com saldo e a diferença vira divergência de inventário.
- Separação parcial → o pedido fica em separação pendente; nada é expedido pela metade sem decisão explícita.
- Pedido cancelado após separado e antes de expedido → a mercadoria volta ao endereço com lançamento de entrada e motivo.

### US05: Tarifação da armazenagem

Como marketplace, quero cobrar pelo serviço de guardar, para que a armazenagem seja receita e não custo escondido.

**Rules:**
- A tarifa tem três componentes: entrada (por recebimento conferido), estadia (por período e volume guardado) e saída (por item expedido). *(premissa — confirme ou corrija)*
- Existe tabela global padrão e contrato por loja que a sobrepõe.
- O que é cobrado é derivado do ledger, e todo item da fatura aponta para os lançamentos que o originaram.
- A fatura é mensal, por loja, separada do repasse de vendas.
- O seller vê a prévia da fatura do mês corrente antes de ela fechar.

**Edge cases:**
- Mercadoria que entra e sai no mesmo dia → paga entrada e saída, não paga estadia. *(premissa — confirme ou corrija)*
- Loja sem contrato de armazenagem com mercadoria no CD → a operação bloqueia o recebimento, em vez de guardar de graça.
- Fatura contestada pelo seller → o extrato de custódia é a evidência, e a contestação não altera lançamento, só gera crédito.

### US06: Painel de custódia para o seller

Como seller, quero ver quanto do meu material está no CD do Indústria, onde está e o que já foi prometido, para conferir contra o meu controle sem abrir chamado.

**Rules:**
- Mostra por produto: saldo em custódia, reservado, disponível e em conferência.
- Mostra os avisos de recebimento e o resultado de cada conferência, com as divergências.
- Mostra a prévia da fatura de armazenagem do mês.
- O seller vê apenas as próprias lojas.

**Edge cases:**
- Seller sem nada em custódia → estado vazio explicando como enviar mercadoria ao CD.
- Produto com saldo em CD próprio e em CD Indústria → as duas origens aparecem separadas, nunca somadas em silêncio.

## 4. Fluxo de Negócio

```
Seller anuncia carga (aviso de recebimento)
   │
   ▼
Mercadoria chega ao CD ──▶ Conferência por operador
   │                            ├── divergência ──▶ registro com foto, visível ao seller
   │                            └── avaria ──────▶ entra como avaria, não vendável
   ▼
Entrada no ledger (só o conferido) ──▶ Endereçamento ──▶ Saldo disponível
   │
   ▼
Pedido criado ──▶ Reserva (expira em 30 min se não pago)
   │
   ▼
Pagamento confirmado ──▶ Ordem de separação (produto, quantidade, endereço)
   │
   ▼
Separado ──▶ Expedido ──▶ Baixa definitiva no ledger ──▶ pedido "Enviado"
   │
   ▼
Fim do mês ──▶ Fatura de armazenagem (entrada + estadia + saída), derivada do ledger
```

## 5. Critérios de Aceite

### 5a. Critérios de aceite da feature

| Critério | Razão de negócio | Como verificar (observável) |
|----------|------------------|-----------------------------|
| Saldo em custódia de um seller é sempre igual à soma dos lançamentos de recebimento menos expedições, devoluções e ajustes | É a conta que o seller vai fazer, e divergência aqui é dívida do marketplace com ele | Query de conferência por loja, com zero divergentes |
| Nenhum caminho de escrita produz saldo negativo por produto e endereço | Vender ou expedir o que não existe custa o pedido e a mercadoria de terceiro | Teste de concorrência com o último item disponível em separação e em compra |
| Checkout multi-loja que falha na segunda loja não deixa reserva ativa da primeira | É o vazamento de saldo que existe hoje em produção | Cenário em transação com rollback, sem reserva remanescente |
| Toda quantidade creditada ao seller tem operador identificado na conferência | Custódia sem autor não se sustenta numa disputa | Query: zero conferências com operador nulo |
| Nenhum item de fatura existe sem lançamento de ledger correspondente | Cobrar sem evidência quebra a relação no primeiro questionamento | Reconciliação fatura × ledger, com zero itens órfãos |
| Pedido com item em custódia não é expedido sem ordem de separação confirmada | Expedir sem separar é como o estoque some | Tentativa de expedição direta rejeitada, com mensagem |
| Seller não acessa custódia, aviso ou fatura de loja que não é dele | Vazamento entre concorrentes do mesmo marketplace | Teste de acesso com dois sellers |

### 5b. Métricas de sucesso

| Métrica | Baseline (fonte) | Meta | Prazo | Mín. aceitável | Responsável |
|---------|-------------------|------|-------|-----------------|-------------|
| Receita mensal de armazenagem | R$ 0 (serviço não existe) | A definir com a dona | 90 dias após o Milestone 4 | Maior que zero, com 2 lojas faturadas | Dona do produto |
| Divergência entre conferido e declarado nos avisos de recebimento | A levantar (não existe recebimento hoje) | Menor que 2% das unidades | 60 dias após o Milestone 3 | Menor que 5% | Operação |
| Sellers com mercadoria em custódia no CD Manaus | 0 | 5 | 90 dias após o Milestone 3 | 2 | Captação |
| Prazo entre pagamento e expedição de pedido em custódia | A levantar (2 pedidos `Enviado` hoje, sem processo) | Menor que 24h úteis | 60 dias após o Milestone 3 | Menor que 48h úteis | Operação |
| Pedidos expedidos sem ordem de separação | — | Zero | Desde o Milestone 3 | Zero | Operação |

## 6. Milestones

### Milestone 1: Reserva no lugar da baixa antecipada

**Por que é um marco:** é o Milestone 2 do PRD 036 e o pré-requisito de todo o resto. Acaba o vazamento de estoque do checkout multi-loja e do pedido não pago, que é bug de produção hoje, e cria a noção de "prometido" sem a qual não existe separação.

**Funcionalidades:** US01

**Checklist de aceite:**
- [ ] Checkout multi-loja que falha na segunda loja não deixa reserva ativa da primeira
- [ ] Reserva não paga libera o saldo em até 30 minutos, mesmo com o job de expiração parado
- [ ] Teste de concorrência com o último item disponível não produz saldo negativo
- [ ] `produtos.estoque_atual` permanece idêntico ao saldo do ledger para 100% dos produtos após a virada

**Aprovador:** Dona do produto

### Milestone 2: O CD Indústria de Manaus existe e tem endereços

**Por que é um marco:** hoje o piloto não tem onde acontecer. Ao fim deste marco existe um centro `tipo = 'industria'` em Manaus, com CEP, com endereços de armazenagem cadastrados e com saldo endereçável. É o menor passo que transforma o serviço de intenção em lugar.

**Funcionalidades:** US02

**Checklist de aceite:**
- [ ] Existe um centro `tipo = 'industria'` em Manaus, com CEP estruturado, cadastrado em produção
- [ ] Endereços de armazenagem cadastrados e visíveis na tela do centro
- [ ] Endereço com saldo não pode ser excluído
- [ ] Endereço bloqueado não recebe entrada nem entra em separação

**Aprovador:** Dona do produto

### Milestone 3: Custódia de ponta a ponta

**Por que é um marco:** é o primeiro momento em que o marketplace guarda mercadoria de terceiro com registro completo: entrou, foi conferida, foi endereçada, foi reservada, foi separada, saiu. A partir daqui a armazenagem é serviço prestado, não promessa.

**Funcionalidades:** US03, US04, US06

**Checklist de aceite:**
- [ ] Um aviso de recebimento real percorrido do anúncio à conferência, com divergência registrada
- [ ] Um pedido de produto em custódia separado e expedido pela operação, com baixa no ledger
- [ ] Pedido sem reserva ativa não é expedido
- [ ] Saldo em custódia bate com a soma dos lançamentos para 100% das lojas do piloto

**Aprovador:** Dona do produto

### Milestone 4: Cobrar pelo serviço

**Por que é um marco:** fecha o objetivo de negócio original, que é receita recorrente além da comissão de venda.

**Funcionalidades:** US05

**Checklist de aceite:**
- [ ] Tabela global e contrato por loja em produção
- [ ] Prévia da fatura visível ao seller antes do fechamento
- [ ] Reconciliação fatura × ledger com zero itens órfãos
- [ ] Uma fatura real emitida e paga por um seller do piloto

**Aprovador:** Dona do produto

## 7. Riscos e Dependências

| Risco | Impacto | Mitigação | Status |
|-------|---------|-----------|--------|
| O Milestone 1 toca `checkout_criar_pedido`, que é o caminho do dinheiro e já foi recopiada em cerca de 20 migrations, com overloads de 3 a 6 argumentos | Alto | Testar cada alteração em `begin; … select verificação; rollback;` antes de aplicar, e virar por trás de flag, mantendo o caminho antigo até o saldo bater 100% | Pendente |
| Guardar mercadoria de terceiro sem nota fiscal de remessa correta expõe o marketplace fiscalmente | Alto | Bloqueio explícito do Milestone 3: validação contábil antes do primeiro recebimento real | Em aberto |
| Perda, avaria ou furto de mercadoria sob custódia sem cobertura contratual | Alto | Contrato de depósito e seguro definidos antes do primeiro recebimento; sem contrato assinado, não recebe | Em aberto |
| O CD Indústria em Manaus não existe fisicamente (próprio ou 3PL não decidido) | Alto | Decisão da dona antes do Milestone 2; enquanto isso o marco pode ser cumprido no endereço do parceiro | Em aberto |
| Operação de CD sem pessoa dedicada: conferência e separação exigem alguém no galpão | Médio | Definir o operador do piloto junto com o CD; o sistema exige autor identificado em cada etapa e não aceita operação anônima | Em aberto |
| Seller enviar mercadoria e o piloto parar no meio | Médio | Piloto começa com no máximo 2 sellers e volume combinado, com saída documentada | Pendente |
| Divergência silenciosa entre custódia e contagem física | Médio | Contagem sob demanda gerando ajuste com motivo, e conferência diária de paridade nos 30 primeiros dias | Pendente |

**Dependências:**

| Dependência | Tipo | Status | Impacto se bloqueado |
|-------------|------|--------|----------------------|
| PRD 036 Milestone 1 (ledger) | Interna | Em produção desde 16/09/2026 | — |
| PRD 036 US03 (CEP estruturado no centro) | Interna | Não entregue | O Milestone 2 depende disso para escolher origem por proximidade |
| Definição do CD Indústria em Manaus (próprio ou 3PL) | Externa | Em aberto | Bloqueia o Milestone 2 na prática, ainda que não no software |
| Validação contábil do fluxo fiscal de mercadoria de terceiro | Externa | Em aberto | Bloqueia o Milestone 3 |
| Contrato de depósito e seguro | Externa | Em aberto | Bloqueia o Milestone 3 |
| PRD 023 (repasse Asaas) | Interna | Em produção, com zero repasses transferidos | O Milestone 4 cobra por fora do repasse justamente para não depender dele |
| PRD 010 (perecíveis) | Interna | Rascunho | Lote e validade entram depois, sobre a mesma estrutura de custódia |

## 8. Referências

- [PRD 036](036-ledger-estoque-multi-local.md) — ledger de estoque multi-local; este PRD começa onde o Milestone 1 dele parou
- `supabase/migrations/0175_estoque_ledger_milestone1.sql` — ledger, saldo por centro, invariante de local padrão e ajuste com motivo
- `docs/prd/centro-distribuicao-fulfillment.md` — PRD original de fulfillment exportado do Confluence (MPDD-31), anterior à numeração
- `src/app/(seller)/seller/centros/page.tsx` — tela fina de centro que o Milestone 2 aprofunda
- `openspec/specs/seller-centro-distribuicao/spec.md` — comportamento hoje especificado do centro
- [PRD 010](010-termos-produtos-pereciveis.md) — perecíveis, lote e validade
- [PRD 026](026-vitrine-raio-geolocalizacao.md) — origem geográfica do produto

## 9. Registro de Decisões

- **2026-09-16:** Custódia e operação viram PRD próprio (039) em vez de crescerem dentro do 036. Motivo: o 036 declara explicitamente endereçamento, recebimento e tarifação como fora de escopo, e o 036 é sobre saldo auditável, que tem valor mesmo se o CD nunca sair do papel. Misturar os dois faria o ledger esperar por decisões fiscais e contratuais que não são dele.
- **2026-09-16:** A reserva (Milestone 2 do 036) é o Milestone 1 deste PRD, e não é duplicada. Motivo: é pré-requisito real da separação e é bug de produção hoje; deixá-la pendurada apenas no 036 esconderia que ela bloqueia o fulfillment inteiro.
- **2026-09-16:** O CD Indústria em Manaus é marco próprio, antes de qualquer software de custódia. Motivo: verificado em produção que existem 21 centros, todos `tipo = 'seller'`, nenhum do marketplace, e apenas 1 endereço em Manaus, de seller. Construir recebimento antes de existir um lugar seria código sem operação.
- **2026-09-16:** Mercadoria em custódia permanece do seller e a cobrança é de serviço. Motivo: comprar estoque muda o modelo de negócio, o capital de giro e o regime fiscal; nada no objetivo original pede isso.
- **2026-09-16:** Fatura de armazenagem separada do repasse de vendas. Motivo: o repasse é derivado (`0158`) e hoje tem zero transferências efetivadas; acoplar receita nova a um fluxo não comprovado colocaria as duas em risco.
- **2026-09-16:** Número 039 atribuído após conferir o maior número em todas as branches com `git log --all`, que era 038.
