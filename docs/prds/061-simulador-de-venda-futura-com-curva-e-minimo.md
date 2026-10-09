---
prd_number: "061"
status: rascunho
priority: média
created: 2026-10-09
issue: ""
depends_on: ["011", "044", "047"]
references:
  - "docs/prds/011-assistente-ia-venda-futura.md" – sugestão de estoque, valor e data pela IA no mesmo formulário
  - "docs/prds/044-comissao-pelo-no-da-arvore.md" – comissão que o simulador desconta para mostrar o líquido por unidade
  - "docs/prds/047-alerta-imediato-e-venda-futura-vencida.md" – avisos da venda futura e o tick diário que eles usam
  - "src/components/seller/VendaFuturaForm.tsx" – formulário atual (Produto, Estoque, Valor, Disponibilidade)
  - "src/app/(seller)/seller/venda-futura/ia-actions.ts" – sugestão da IA (estoque, valor, data e motivo)
  - "src/components/vitrine/MercadoFuturo.tsx" – vitrine da venda futura (datas, cards, Reservar)
  - "supabase/migrations/0016_venda_futura_desconto_progressivo.sql" – preço próprio por lote
  - "supabase/migrations/0210_venda_futura_entrega_so_com_codigo.sql" – entrega só com o código do comprador
  - "supabase/migrations/0211_venda_futura_preco_teto.sql" – preço da reserva nunca acima do preço à vista
  - "supabase/migrations/0213_coletiva_participar_delega_fechamento.sql" – modelo de lote com meta e pedido por participante com PIX em 48 h, reaproveitado aqui
  - "Downloads/claude/Diagrama-arquitetura-industria24/arquitetura-venda-futura__venda-futura.pdf" – fluxo atual do lote ao repasse e seus limites
---

# PRD 061: Simulador de venda futura com curva de desconto por antecedência e mínimo de reservas

## 1. Contexto

- **Produto/área**: Venda Futura (pré-venda de safra ou lote de produção), painel do seller e vitrine do comprador. Exemplo de referência: produtor de açaí.
- **Estado atual** (verificado no código em 09/10/2026):
  - O seller cadastra um lote com quatro campos: Produto, Estoque, Valor e Disponibilidade. O valor é fixo do cadastro até a entrega.
  - Um botão de IA sugere estoque, valor e data a partir das últimas 8 vendas futuras do mesmo produto (PRD 011). Não existe simulação: o seller não vê o efeito do preço, do desconto nem da data antes de publicar.
  - O preço da reserva não pode passar do preço à vista (migration 0211). Não há cálculo de desconto no painel; o desconto só aparece ao comprador, como preço à vista riscado na vitrine.
  - O comprador paga na reserva e o dinheiro fica retido até a entrega. O repasse ao seller só sai com todos os itens entregues, e a entrega só vale com o código do comprador.
  - Não há estorno no sistema: data vencida vai para uma fila do admin, só de leitura. A devolução ao comprador é o PRD 048 (PR #748, aberto).
  - A vitrine mostra no card o menor preço entre o desconto por volume e a venda futura.
- **Problema**: o seller de safra decide sem base quanto da produção oferecer, para qual data e com quanto de desconto. Desconto único não recompensa quem reserva cedo, e o seller corre o risco de assumir um lote que poucos reservam.

> **Contexto técnico** no TRD. O preço cobrado é sempre recalculado no servidor, como no frete: o simulador nunca é a fonte do valor.

## 2. Solução Proposta

### Visão de produto

- O seller monta o lote num simulador: informa a produção prevista e a data de entrega, desenha a curva de desconto por antecedência e o mínimo de reservas, e vê o resultado antes de publicar.
- Quanto mais cedo o comprador reserva, maior o desconto. O preço fica travado no dia da reserva.
- O desconto por volume do produto **soma** com o desconto da curva.
- O lote só vale se atingir o mínimo de reservas até um prazo. Ninguém paga antes disso; atingido o mínimo, cada reserva vira um pedido com PIX em 48 h, como na compra coletiva.
- O comprador vê na vitrine quanto está abaixo do preço à vista e até quando vale o degrau atual.

### Decisões de produto

1. **Curva por antecedência, em degraus.** Até 3 degraus, cada um com "a partir de N dias antes da entrega" e um desconto em %. Degrau é o formato que o seller já conhece das faixas de volume e dos lotes da coletiva. *(número máximo de degraus: premissa — confirme ou corrija)*
2. **Volume e curva somam, de forma multiplicativa**: preço da reserva = preço da faixa de volume para a quantidade × (1 − desconto do degrau da data da reserva). *(forma multiplicativa: premissa — confirme ou corrija)*
3. **Preço travado no dia da reserva.** Vale o degrau vigente naquele dia; a cobrança posterior usa esse preço, mesmo que o degrau já tenha mudado.
4. **Estoque previsto informado pelo seller.** A previsão é a produção que ele declara; o sistema não estima demanda.
5. **Mínimo de reservas com prazo.** O lote tem uma quantidade mínima reservada e uma data-limite. Sem o mínimo até o prazo, o lote é cancelado sem cobrar ninguém.
6. **Cobrança só no atingimento.** A reserva não cobra. Atingido o mínimo, cada reserva vira um pedido com PIX de 48 h. Assim o lote não depende de estorno, que o sistema não tem.
7. **Regras atuais mantidas**: teto do preço à vista (vale para qualquer combinação), só compra quem tem CNPJ ou inscrição estadual, cupom não vale em item de venda futura, entrega só com o código do comprador, repasse só depois da entrega.

### Fora do escopo

- Previsão de demanda a partir do histórico de pedidos (a previsão é a produção que o seller informa).
- Antecipação de caixa ao seller: o repasse continua saindo depois da entrega. O simulador não pode sugerir "receba agora".
- Simulador para o comprador.
- Estorno automático: a cobrança no atingimento evita a necessidade. A devolução por outros motivos segue no PRD 048.
- Curva linear (preço mudando todo dia). *(premissa — confirme ou corrija)*
- Mudança na sugestão da IA (PRD 011): ela continua sugerindo estoque, valor e data; o simulador mostra o efeito. *(premissa — confirme ou corrija)*

## 3. Funcionalidades

### US01: Montar a curva de desconto do lote

Como seller, quero definir degraus de desconto por antecedência no lote, para que quem reserva mais cedo pague menos.

**Rules:**
- Cada degrau tem "a partir de N dias antes da entrega" e um desconto em %. Até 3 degraus. *(premissa — confirme ou corrija)*
- Degraus mais distantes da entrega têm desconto maior ou igual ao do degrau seguinte.
- Lote sem degraus funciona como hoje: um preço só, sem desconto por antecedência.
- O preço base do lote é o preço à vista do produto. *(premissa — confirme ou corrija)*

**Edge cases:**
- Degraus com dias repetidos ou desconto crescente em direção à entrega → o formulário não salva e aponta o degrau inválido.
- Desconto de 100% ou mais → não salva.
- Data de entrega mais próxima que o primeiro degrau → o lote só usa os degraus que ainda cabem; o simulador avisa quais não terão efeito.

### US02: Simular antes de publicar

Como seller, quero ver o efeito da curva, do volume e da comissão antes de publicar, para escolher um desconto que me dê margem.

**Rules:**
- Entradas: produção prevista, data de entrega, degraus da curva, mínimo de reservas e prazo.
- Saída principal: uma matriz de faixa de volume × degrau com preço por unidade, desconto total sobre o à vista e líquido por unidade depois da comissão da plataforma (pelo nó da taxonomia, PRD 044).
- Mostra a receita do lote no pior caso (todo o lote vendido no degrau de menor desconto e na menor faixa) e no melhor caso para o comprador (maior desconto). *(definição de pior e melhor caso: premissa — confirme ou corrija)*
- Mostra o mínimo de reservas em unidades e em valor.
- A simulação não grava nada; só o botão de registrar publica o lote.

**Edge cases:**
- Produto sem desconto por volume → a matriz vira uma linha só, com os degraus.
- Comissão do nó indisponível no momento da simulação → mostra o líquido com a comissão padrão (5%) e avisa que é estimativa. *(premissa — confirme ou corrija)*
- Desconto total acima de um limite de alerta → mostra aviso de margem, sem bloquear. *(limite de 30%: premissa — confirme ou corrija)*

### US03: Reservar com o preço do dia

Como comprador, quero reservar pelo preço do degrau vigente, para garantir o desconto de quem reserva cedo.

**Rules:**
- O preço da reserva é calculado no servidor pela data da reserva, pela faixa de volume da quantidade e pela curva do lote.
- O preço fica gravado na reserva e não muda depois.
- O resultado nunca passa do preço à vista.
- Continua valendo: só CNPJ ou inscrição estadual, sem cupom.

**Edge cases:**
- Reserva feita no limite entre dois degraus → vale o degrau do dia da reserva no fuso de Manaus. *(premissa — confirme ou corrija)*
- O seller baixa o preço à vista depois de reservas feitas → as reservas mantêm o preço travado, mesmo que agora fique acima do novo à vista. *(premissa — confirme ou corrija)*
- Reserva maior que o saldo do lote → recusa com o saldo disponível.

### US04: Lote com mínimo de reservas

Como seller, quero que o lote só valha se atingir uma quantidade mínima até uma data, para não produzir ou separar um lote que quase ninguém reservou.

**Rules:**
- O lote tem mínimo de reservas (em unidades) e prazo para atingi-lo. O prazo é anterior à data de entrega.
- A vitrine mostra o progresso: unidades reservadas, mínimo e prazo.
- O prazo é avaliado pelo processamento diário que a venda futura já tem (o mesmo dos avisos do PRD 047).
- Mínimo zero, ou sem mínimo, mantém o comportamento atual: cobra na reserva. *(premissa — confirme ou corrija)*

**Edge cases:**
- Prazo vence com o mínimo atingido no mesmo dia → vale como atingido.
- O seller remove o lote com reservas abertas e mínimo ainda não atingido → todas as reservas são canceladas sem cobrança e os compradores são avisados.
- Lote atinge o mínimo antes do prazo → passa a valer na hora e as novas reservas já viram pedido. *(premissa — confirme ou corrija)*

### US05: Cobrança quando o mínimo é atingido

Como comprador, quero pagar só quando o lote estiver garantido, para não deixar dinheiro parado num lote que pode não acontecer.

**Rules:**
- Ao atingir o mínimo, cada reserva vira um pedido próprio com PIX válido por 48 h, pelo preço travado na reserva.
- Quem não paga em 48 h perde o pedido e a quantidade volta ao saldo do lote.
- Depois de pago, o fluxo é o atual: dinheiro retido, entrega só com código, repasse depois da entrega.

**Edge cases:**
- Pedidos não pagos fazem o total pago cair abaixo do mínimo → o lote continua valendo; o mínimo é avaliado nas reservas, não nos pagamentos. *(premissa — confirme ou corrija)*
- Comprador perde o CNPJ/IE do perfil entre a reserva e a cobrança → a cobrança é gerada mesmo assim, pois a regra foi verificada na reserva. *(premissa — confirme ou corrija)*

### US06: Cancelamento sem cobrança e avisos

Como comprador e como seller, quero ser avisado do resultado do lote, para saber se vou receber e se preciso produzir.

**Rules:**
- Mínimo atingido → aviso ao comprador com o link de pagamento e ao seller com o total reservado.
- Prazo vencido sem o mínimo → lote cancelado, aviso a compradores e seller, nada cobrado.
- Os avisos usam os mesmos canais da venda futura (WhatsApp e e-mail, PRD 047).

**Edge cases:**
- Seller sem WhatsApp cadastrado → recebe só por e-mail e o painel mostra o resultado.
- Falha no envio do aviso → o resultado do lote vale do mesmo jeito; o painel e a página do pedido mostram o estado.

### US07: Vitrine mostra o desconto e até quando ele vale

Como comprador, quero ver quanto a reserva está abaixo do preço à vista e quando o desconto diminui, para decidir se reservo agora.

**Rules:**
- O card mostra o preço à vista riscado, o preço do degrau atual e um selo "X% abaixo do à vista".
- Mostra até quando vale o degrau atual e o próximo preço.
- O "a partir de" do card passa a ser a combinação do degrau atual com a maior faixa de volume. *(premissa — confirme ou corrija)*

**Edge cases:**
- Último degrau já passou e a entrega ainda não chegou → mostra o preço sem desconto de antecedência (só volume).
- Lote com mínimo ainda não atingido → o card mostra o progresso e "você só paga se o lote atingir o mínimo".

### US08: Lotes atuais continuam funcionando

Como seller com lotes já publicados, quero que eles sigam valendo, para não perder reservas por causa da mudança.

**Rules:**
- Lotes existentes viram lotes com um degrau único (o preço atual, sem desconto por antecedência) e sem mínimo.
- Reservas e pedidos existentes mantêm preço e fluxo de pagamento atuais.

**Edge cases:**
- Lote existente com preço acima do à vista (dado ruim) → não é corrigido automaticamente; aparece no simulador com o aviso do teto. *(premissa — confirme ou corrija)*

## 4. Fluxo de Negócio

```
Seller simula e publica o lote (curva + mínimo + prazo)
   │
   ▼
Comprador reserva ── preço travado no degrau do dia (× faixa de volume)
   │
   ▼
Lote tem mínimo? ──── não ──▶ cobra na reserva (fluxo atual)
   │ sim
   ▼
Mínimo atingido até o prazo?
   ├── sim ──▶ cada reserva vira pedido com PIX 48 h ──▶ pagou? ──┬── sim ──▶ entrega com código ──▶ repasse
   │                                                             └── não ──▶ pedido cancelado, quantidade volta ao lote
   └── não ──▶ lote cancelado, nada cobrado, avisos a todos
```

## 5. Critérios de Aceite

### 5a. Critérios de aceite da feature

| Critério | Razão de negócio | Como verificar (observável) |
|----------|------------------|-----------------------------|
| O preço cobrado é igual ao que o simulador mostrou para a mesma quantidade e o mesmo dia | Simulação que diverge da cobrança destrói a confiança do seller | Simular, reservar na mesma faixa e no mesmo degrau, comparar o valor do pedido |
| Nenhuma combinação de volume e curva gera preço acima do à vista | Regra vigente (0211) e promessa ao comprador | Tentar salvar e reservar combinações extremas |
| Reserva em lote com mínimo não gera cobrança antes do atingimento | Nenhum dinheiro parado sem lote garantido; não há estorno | Reservar em lote abaixo do mínimo e conferir que não existe cobrança |
| Atingido o mínimo, todas as reservas viram pedidos com PIX de 48 h no mesmo processamento | Comprador precisa pagar enquanto o interesse é recente | Completar o mínimo e conferir os pedidos gerados |
| Prazo vencido sem mínimo cancela o lote e avisa compradores e seller | Ninguém fica esperando um lote que não vai acontecer | Deixar o prazo vencer abaixo do mínimo e conferir status e avisos |
| O preço travado não muda quando o degrau vira | Promessa "preço travado no ato da reserva" | Reservar, avançar a data para o degrau seguinte, conferir o pedido |
| O simulador responde a cada alteração em menos de 1 s | O seller ajusta vários valores até chegar à margem; espera quebra a simulação | Alterar degraus e quantidades e medir a resposta na tela *(limiar: premissa — confirme ou corrija)* |
| Lotes publicados antes da mudança continuam reserváveis e cobram como antes | Não perder vendas em andamento | Reservar num lote antigo depois do deploy |

### 5b. Métricas de sucesso

| Métrica | Baseline (fonte) | Meta | Prazo | Mín. aceitável | Responsável |
|---------|-------------------|------|-------|-----------------|-------------|
| Lotes de venda futura publicados com curva | A levantar (lotes ativos hoje no banco) | A definir com a dona | 60 dias após o Milestone 1 | A definir | Dona do produto |
| Lotes com mínimo que atingem o mínimo | Não existe hoje | A definir | 60 dias após o Milestone 2 | A definir | Dona do produto |
| Reservas feitas no degrau de maior desconto | Não existe hoje | A definir | 60 dias após o Milestone 1 | A definir | Dona do produto |

## 6. Milestones

### Milestone 1: Simular e vender com a curva de desconto

**Por que é um marco:** o seller passa a montar o lote vendo margem e preço, e o comprador ganha desconto por reservar cedo, somado ao desconto por volume.

**Funcionalidades:** US01, US02, US03, US07, US08

**Checklist de aceite** (marcado pelo Aprovador após a implementação):
- [ ] O preço cobrado é igual ao que o simulador mostrou para a mesma quantidade e o mesmo dia
- [ ] Nenhuma combinação de volume e curva gera preço acima do à vista
- [ ] O preço travado não muda quando o degrau vira
- [ ] O simulador responde a cada alteração em menos de 1 s
- [ ] Lotes publicados antes da mudança continuam reserváveis e cobram como antes

**Aprovador:** dona do produto (Andreia)

### Milestone 2: Lote com mínimo de reservas e cobrança no atingimento

**Por que é um marco:** o seller só assume o lote quando há demanda garantida, e o comprador só paga quando o lote vai acontecer.

**Funcionalidades:** US04, US05, US06

**Checklist de aceite** (marcado pelo Aprovador após a implementação):
- [ ] Reserva em lote com mínimo não gera cobrança antes do atingimento
- [ ] Atingido o mínimo, todas as reservas viram pedidos com PIX de 48 h no mesmo processamento
- [ ] Prazo vencido sem mínimo cancela o lote e avisa compradores e seller

**Aprovador:** dona do produto (Andreia)

## 7. Riscos e Dependências

| Risco | Impacto | Mitigação | Status |
|-------|---------|-----------|--------|
| Volume e curva somados derrubam a margem do seller | Alto | Simulador mostra desconto total e líquido por unidade; aviso de margem acima do limite | Pendente |
| Comprador reserva e não paga quando o mínimo é atingido | Médio | PIX de 48 h e quantidade de volta ao lote, como na coletiva; mínimo avaliado nas reservas | Pendente |
| Processamento diário atrasa o cancelamento ou a cobrança em até 24 h | Médio | Mostrar prazo e estado na vitrine e no painel; o atingimento antes do prazo vale na hora (US04) | Pendente |
| Pagamento em produção ainda no ambiente de testes do Asaas (memória de 01/10) | Alto | Conferir antes do Milestone 2; a cobrança no atingimento depende do PIX real | Pendente |
| "Preço a partir de" do card mais baixo que o preço que a maioria paga | Médio | Card mostra também o preço do degrau atual e até quando vale | Pendente |

**Dependências:**

| Dependência | Tipo | Status | Impacto se bloqueado |
|-------------|------|--------|----------------------|
| PRD 044 (comissão pelo nó) | Interna | Em produção desde 18/09 | Milestone 1: líquido por unidade só como estimativa |
| PRD 047 (avisos da venda futura e processamento diário) | Interna | Em produção | Milestone 2: sem avaliação de prazo nem avisos |
| PRD 011 (sugestão da IA) | Interna | Em produção | Nenhum bloqueio; a IA continua no mesmo formulário |
| Asaas de produção fora do modo de testes | Externa | A conferir | Milestone 2 |

## 8. Referências

- PRDs 011, 044 e 047 — ver `references` no topo.
- Diagrama `arquitetura-venda-futura__venda-futura.pdf` — fluxo do lote ao repasse e limites atuais (sem estorno, avisos 1× por dia, teto não revalidado).
- Compra coletiva (migrations 0077 e 0213) — modelo de meta, pedido por participante e PIX em 48 h reaproveitado no Milestone 2.

## 9. Registro de Decisões

- **2026-10-09:** Simulador como funcionalidade nova no site (e não só explicação em vídeo). Motivo: hoje o seller não tem como prever estoque e preço com desconto; só existe a sugestão da IA. Decidido pela dona no brainstorm.
- **2026-10-09:** Desconto por antecedência em curva. Motivo: recompensar quem reserva cedo. Decidido pela dona. Formato em degraus é premissa.
- **2026-10-09:** Estoque previsto informado pelo seller. Motivo: o sistema não tem base de demanda confiável. Decidido pela dona.
- **2026-10-09:** Mínimo de reservas com cancelamento sem cobrança. Decidido pela dona.
- **2026-10-09:** Cobrança só quando o mínimo é atingido, por PIX de 48 h, como na coletiva. Motivo: o sistema não tem estorno (PRD 048 em aberto). Decidido pela dona.
- **2026-10-09:** Desconto por volume soma com a curva. Decidido pela dona. A forma multiplicativa é premissa.
- **2026-10-09:** Critério de `depends_on`: 044 porque o simulador mostra o líquido depois da comissão pelo nó; 047 porque prazo e avisos usam o processamento diário e os canais da venda futura; 011 porque o simulador estende o formulário em que a IA já sugere valores. PRD 048 não entra: a cobrança no atingimento existe justamente para não depender de estorno.
- **2026-10-09:** Produto de referência para comunicação (vídeo): açaí. Motivo: a própria IA do sistema registra que produtos industriais de reposição contínua, como tijolo, não têm sazonalidade.
