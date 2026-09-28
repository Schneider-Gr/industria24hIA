---
prd_number: "050"
status: pronto
priority: alta
created: 2026-09-24
issue: ""
depends_on: ["049"]
references:
  - "docs/prds/049-frete-por-tabela-da-transportadora-do-seller.md" – fontes de frete, CDs de origem e envios
  - "docs/prds/052-frete-no-repasse-do-seller.md" – o frete cotado vai para o seller
  - "supabase/migrations/0075_chat_comprador_vendedor.sql" – chat comprador↔vendedor
  - "supabase/migrations/0139_uber_direct_transportadora.sql" – cotação de frete gravada no servidor (cotacoes_frete_externo)
  - "https://cupommarketplace.com.br/entrega-a-combinar-como-funciona-no-mercado-livre/" – como o Mercado Livre faz
  - "https://docs.typesafe.ai/cookbooks/pre_parsed_value_extraction_cookbook.md" – padrão de extração com o Jev
---

# PRD 050: Entrega a combinar com o vendedor

## 1. Contexto

- **Produto/área**: página do produto, carrinho, checkout, painel do seller e WhatsApp.
- **Estado atual** (verificado em 24/09/2026):
  - Quando não há frete calculável para o CEP do comprador, o checkout mostra "CEP sem cobertura" e só resta a retirada, quando a loja permite.
  - Com o PRD 049, isso passa a acontecer em mais casos: produto sem peso ou medidas (69 de 127 aprovados), loja sem transportadora, CD sem CEP, CEP fora das faixas.
  - O chat comprador↔vendedor existe, mas só abre depois de um pedido pago (`podeFalarComVendedor`), por decisão contra spam e negociação por fora.
  - Já existe um molde de "frete cotado e gravado no servidor": a cotação da Uber Direct fica em `cotacoes_frete_externo` (loja, CEP, valor, prazo, validade), e o pedido usa esse valor, nunca um número vindo do navegador.
  - No Mercado Livre, "Entrega a combinar" significa frete combinado e pago direto ao vendedor, fora da plataforma, sem garantia do Mercado Livre sobre o frete.
- **Estado em 28/09/2026** (Milestone 1 implementado no PR #815, testado de ponta a ponta no preview com o pedido FCB9E8DAB3):
  - O seller vê e responde as cotações no menu "Cotações de frete" do painel, com contador de pendentes, e recebe o aviso por e-mail e WhatsApp.
  - O comprador só vê a cotação no bloco da página do produto e no checkout. Não existe lista das cotações dele: quem perde o e-mail ou não lembra de qual produto pediu perde a cotação.
  - O comprador já tem, no menu da conta, "Meus pedidos", "Mensagens" (chat, só depois do pagamento) e "Avisos" (central que mostra o que mudou nos pedidos e nas mensagens).
- **Problema**: o comprador desiste quando não vê frete, e o seller perde a venda. Copiar o Mercado Livre (frete pago por fora) tira da plataforma o controle do valor, deixa o comprador sem garantia e abre um canal para negociar as próximas compras por fora.

## 2. Solução Proposta

### Visão de produto

- O seller marca "Frete a combinar" no produto; esse produto passa a mostrar "Combine a entrega com o vendedor", a cidade de origem e o botão "Pedir cotação de frete", e perde qualquer outro frete.
- O comprador pede a cotação informando CEP, quantidade e uma observação; o seller responde valor e prazo (ou "não entrego nesse CEP") pelo painel ou pelo WhatsApp.
- A cotação respondida fica gravada no servidor, presa ao CEP, à quantidade e a uma validade; o checkout a usa como opção de frete, num pagamento só.
- O chat livre continua liberado só depois do pagamento.
- Cada lado acompanha as cotações num lugar fixo do próprio painel: o seller em "Cotações de frete", o comprador em "Minhas cotações", com as mudanças também em "Avisos".

### Decisões de produto

1. A cotação acontece antes da compra, e o frete é pago junto com o produto, num pagamento único. Motivo: controle do valor, garantia ao comprador e nada de negociação por fora (decisão da dona, 24/09). Descartados: frete cobrado depois, em separado; e frete pago por fora, como no Mercado Livre.
2. O chat continua bloqueado antes da compra; antes dela existe só o pedido de cotação estruturado (decisão da dona, 24/09).
3. "Entrega a combinar" existe só no produto em que o seller marcar "Frete a combinar" no cadastro, e só em loja em que o admin ligou a opção. Marcado, o produto perde todo outro frete: frete grátis, transportadora de tabela, frete percentual, Uber Direct e entrega por km do afiliado; a retirada na loja continua. Vale dentro das regiões declaradas no produto; produto sem região declarada vale só para a UF de origem (decisão da dona, 28/09, substitui a de 24/09 de aparecer automaticamente sem frete calculável).
4. Na página do produto, a cotação é do produto e da quantidade. No carrinho da loja, os itens com frete calculável mantêm o frete de tabela e a cotação cobre só os itens sem frete: são envios separados. Se o seller quiser mandar tudo junto mais barato, pode responder também com um valor para o carrinho inteiro da loja, e o comprador escolhe entre as duas opções. A cotação indica o CD de origem (decisões da dona, 24/09).
5. O seller responde em até 24 h, com lembrete em 12 h; sem resposta, a cotação expira e o comprador é avisado. A cotação respondida vale 48 h (recomendações aceitas pela dona, 24/09).
6. O seller pode responder "não entrego nesse CEP" ou frete grátis (R$ 0,00) (decisão da dona, 24/09).
7. O seller pode responder pelo WhatsApp em texto livre; o Jev interpreta valor, prazo e recusa, e o seller confirma num botão antes de valer (decisão da dona, 24/09).
8. O frete cotado vai integral para o seller, sem comissão (PRD 052) (decisão da dona, 24/09).
9. A cotação não entra no chat "Mensagens" antes do pagamento: fica numa caixa própria em cada painel, "Cotações de frete" no do seller e "Minhas cotações" no do comprador. Motivo: o chat é bloqueado antes da compra (decisão 2) e misturar os dois reabriria o canal para combinar por fora *(premissa aceita pela dona em 28/09)*.
10. As mudanças da cotação (respondida, recusada, expirada, vencendo) aparecem também em "Avisos" do comprador, que já é a central de novidades dele *(premissa aceita pela dona em 28/09)*.
11. Depois do pagamento, a cotação usada vira a primeira mensagem do chat do pedido, para o seller ter o contexto (observação, CEP, valor e prazo combinados) sem o comprador repetir *(premissa aceita pela dona em 28/09)*.

### Fora do escopo

- Chat livre antes da compra.
- Negociação de preço do produto junto com o frete.
- Frete cobrado depois da compra, em cobrança separada.
- Cotação automática por IA sem resposta do seller.
- Classificação de mensagens do comprador pelo Jev (frente 4, fica para depois).
- Cotação dentro do chat antes do pagamento (decisão 9).
- Lista de cotações no painel do admin: o admin consulta pelo banco enquanto o volume for pequeno *(premissa aceita pela dona em 28/09)*.

## 3. Funcionalidades

### US01: Mostrar "Entrega a combinar" no produto

Como comprador, quero saber que o produto pode ser entregue mesmo sem frete calculado, para não desistir da compra.

**Rules:**
- Aparece só no produto com "Frete a combinar" marcado pelo seller, em loja com a opção ligada pelo admin, e com o CEP do comprador nas regiões declaradas no produto. Produto sem região declarada → só CEPs da UF de origem (decisão 3).
- Mostra "Combine a entrega com o vendedor", a cidade e UF de origem, e o botão "Pedir cotação de frete". Nenhum outro frete aparece para o produto.
- Sem CEP conhecido do comprador, o botão pede o CEP primeiro.

**Edge cases:**
- CEP fora das regiões declaradas → mostra "Não entregamos na sua região" e, se houver, retirada.
- Seller desmarca a opção no produto → o produto volta ao frete que tinha antes.
- Admin desliga a opção da loja → o produto marcado fica só com retirada até o admin religar ou o seller desmarcar.
- Comprador não logado clica em "Pedir cotação" → vai para o login e volta ao produto.

### US02: Pedir cotação de frete

Como comprador, quero pedir ao vendedor o valor do frete para o meu endereço, para decidir a compra.

**Rules:**
- Formulário: CEP (preenchido), quantidade, observação opcional (até 500 caracteres).
- Na observação são bloqueados telefone, e-mail, chave Pix e links *(premissa aceita pela dona em 24/09)*.
- O pedido de cotação fica visível ao comprador ("Aguardando o vendedor, resposta em até 24 h").
- Um pedido aberto por comprador, produto e CEP; um novo substitui o anterior *(premissa aceita pela dona em 24/09)*.

**Edge cases:**
- Comprador pede cotação do próprio produto (é o seller) → bloqueado.
- Muitos pedidos do mesmo comprador em pouco tempo → limite de 10 por hora *(premissa aceita pela dona em 24/09)*.

### US03: Avisar o seller e cobrar a resposta

Como seller, quero ser avisado na hora de um pedido de cotação, para não perder a venda.

**Rules:**
- Aviso imediato por e-mail, WhatsApp e no painel, com produto, quantidade, CEP de destino, bairro e observação. O nome e o contato do comprador não aparecem *(premissa aceita pela dona em 24/09)*.
- No painel, o pedido entra no menu "Cotações de frete", com contador das que aguardam resposta; a lista mostra primeiro as que vencem antes *(premissa aceita pela dona em 28/09)*.
- Lembrete em 12 h sem resposta; expira em 24 h.
- Ao expirar, o comprador é avisado e pode pedir de novo.

**Edge cases:**
- WhatsApp do seller não cadastrado → só e-mail e painel.
- Seller responde depois de expirar → a resposta é recusada e ele vê o aviso "cotação expirada".

### US04: Responder a cotação pelo painel

Como seller, quero responder valor e prazo, ou recusar, num lugar só.

**Rules:**
- Campos: valor (R$, aceita 0,00), prazo mínimo e máximo em dias úteis, CD de origem (entre os CDs com estoque), ou "não entrego nesse CEP".
- A cotação respondida vale 48 h, para o CEP e a quantidade pedidos.

**Edge cases:**
- Nenhum CD com estoque suficiente → o seller só pode recusar.
- Valor acima de 50% do valor dos produtos → pede confirmação ao seller *(premissa aceita pela dona em 24/09)*.

### US05: Responder a cotação pelo WhatsApp com o Jev

Como seller, quero responder a cotação em texto livre pelo WhatsApp, para não precisar abrir o painel.

**Rules:**
- O aviso de WhatsApp aceita resposta livre ("fica 35, entrego quinta").
- O código encontra os valores em R$, números e datas no texto; o Jev escolhe qual é o frete, qual é o prazo e se o seller está recusando.
- O seller recebe o resumo ("Frete R$ 35,00, prazo 2 dias. Confirmar?") com botões Confirmar e Corrigir; só vale após Confirmar.
- Baixa confiança do Jev ou nenhum valor encontrado → a mensagem pede a resposta pelo painel, com o link.

**Edge cases:**
- Texto com dois valores (ex.: "35 ou 50 com montagem") → o resumo mostra o escolhido e o seller corrige se preciso.
- O seller manda foto ou áudio → pede resposta em texto ou pelo painel.

### US06: Usar a cotação no checkout

Como comprador, quero comprar com o frete cotado, num pagamento só.

**Rules:**
- Comprador é avisado por e-mail e WhatsApp com valor, prazo e validade, e um link para o produto ou o carrinho.
- No checkout, a opção "Frete combinado com o vendedor" aparece para o envio correspondente, com o valor gravado, se o CEP e a quantidade baterem e a cotação estiver válida.
- Carrinho da loja com itens de frete calculável e itens a combinar → envios separados: os calculáveis seguem pela tabela (PRD 049) e a cotação cobre só os itens a combinar; se o carrinho tiver itens a combinar além dos já cotados, o checkout pede nova cotação desses itens (US02) (decisão 4).
- Se o seller respondeu também com valor para o carrinho inteiro da loja, o checkout mostra as duas opções (tabela + cotação, ou tudo cotado) e o comprador escolhe.
- O pedido usa o valor gravado no servidor, nunca um valor do navegador; o chat livre abre após o pagamento, como hoje.

**Edge cases:**
- Cotação expirada no checkout → a opção some e o comprador pode pedir de novo.
- Comprador muda o CEP ou a quantidade → a cotação deixa de valer para esse carrinho.
- Estoque do CD cotado acaba → o checkout avisa e pede nova cotação.

### US07: Acompanhar minhas cotações

Como comprador, quero ver num lugar só todas as cotações de frete que pedi, para não perder uma resposta do vendedor.

**Rules:**
- O menu da conta ganha "Minhas cotações", ao lado de "Meus pedidos" e "Mensagens" *(premissa aceita pela dona em 28/09)*.
- Cada cotação mostra produtos e quantidades, loja, CEP, estado (aguardando, respondida, recusada, expirada, vencida, usada) e, quando respondida, valor, prazo e validade.
- Cotação respondida e válida tem o botão "Comprar com este frete", que leva o comprador ao checkout com os itens e as quantidades da cotação.
- Cotação aguardando tem o botão "Cancelar pedido de cotação"; expirada, vencida ou recusada tem "Pedir de novo".
- Ordem: as respondidas e válidas primeiro, depois as aguardando, depois o resto, da mais recente para a mais antiga *(premissa aceita pela dona em 28/09)*.

**Edge cases:**
- Cotação pedida no checkout (sem produto de origem) → "Comprar com este frete" coloca no carrinho os itens da cotação, substitui só os itens daquela loja e mantém os de outras lojas *(premissa aceita pela dona em 28/09)*.
- Produto da cotação saiu da vitrine ou ficou sem estoque → a cotação aparece com o aviso "produto indisponível" e sem o botão de compra.
- Cotação usada num pedido → mostra o link para o pedido.

### US08: Ser avisado das mudanças na central de avisos

Como comprador, quero que a resposta do vendedor apareça também nos meus avisos, para ver a novidade mesmo sem abrir o e-mail.

**Rules:**
- "Avisos" do comprador passa a mostrar: cotação respondida, recusada, expirada e cotação respondida que vence em menos de 12 horas *(premissa aceita pela dona em 28/09)*.
- Cada aviso leva para a cotação em "Minhas cotações".

**Edge cases:**
- Cotação já usada ou cancelada → o aviso some da central.
- Várias cotações da mesma loja no mesmo dia → um aviso por cotação, não agrupado *(premissa aceita pela dona em 28/09)*.

### US09: Levar a cotação para o chat depois da compra

Como seller, quero ver no chat do pedido o que foi combinado na cotação, para entregar sem perguntar de novo ao comprador.

**Rules:**
- Quando o pedido com frete combinado é pago, a conversa do pedido abre com uma primeira mensagem automática: produtos, quantidades, CEP, bairro, observação do comprador, valor e prazo combinados *(premissa aceita pela dona em 28/09)*.
- A mensagem automática não tem autor humano e não pode ser apagada por nenhum dos dois.

**Edge cases:**
- Pedido cancelado antes do pagamento → nenhuma mensagem é criada.
- Já existe conversa do comprador com a loja para aquele produto → a mensagem entra na conversa existente, sem abrir outra.

## 4. Fluxo de Negócio

```
Produto com "Frete a combinar" marcado pelo seller (e CEP dentro das regiões do produto)
   │
   ▼
"Combine a entrega com o vendedor · Manaus, AM · [Pedir cotação de frete]"
   │
   ▼
Comprador informa CEP, quantidade, observação ──▶ seller avisado (e-mail, WhatsApp, painel)
   │
   ▼
Seller responde (painel, ou WhatsApp + Jev + botão Confirmar)
   ├── sem resposta 12 h ──▶ lembrete ── 24 h ──▶ expira, comprador avisado
   ├── "não entrego" ──▶ comprador avisado; só retirada, se houver
   └── valor + prazo + CD ──▶ cotação gravada (48 h, CEP e quantidade)
                                 │
                                 ▼
                     Comprador avisado ──▶ checkout com "Frete combinado"
                                 │
                                 ▼
                     Pagamento único ──▶ chat livre liberado
```

## 5. Critérios de Aceite

### 5a. Critérios de aceite da feature

| Critério | Razão de negócio | Como verificar (observável) |
|----------|------------------|-----------------------------|
| Produto com "Frete a combinar", CEP de Manaus dentro das regiões → mostra "Combine a entrega com o vendedor" com a cidade de origem | Não perder a venda | Página do produto |
| CEP fora das regiões → não mostra a opção | Limite de venda (PRD 049, decisão 13) | Página do produto com CEP de outro estado |
| Produto sem região declarada, CD em Manaus: CEP do AM mostra "Entrega a combinar"; CEP de outra UF não mostra | Decisão 3 | Página do produto com dois CEPs |
| Carrinho com cimento (tabela R$ 40) e porcelanato com "Frete a combinar" → 2 envios; a cotação cobre só o porcelanato e o cimento segue R$ 40 | Decisão 4 | Checkout |
| Pedido de cotação chega ao seller em até 1 minuto por e-mail, WhatsApp e painel | Resposta rápida é o que salva a venda | Criar pedido de cotação e cronometrar |
| Observação com telefone ou Pix é recusada | Evitar negociação por fora | Formulário com telefone |
| Seller responde "fica 35 conto, entrego quinta" pelo WhatsApp → resumo R$ 35,00 com botão Confirmar; só vale após confirmar | Resposta sem abrir o painel, com controle humano | Teste com o número do seller |
| Sem resposta em 24 h → cotação expira e o comprador é avisado | O comprador não fica esperando | Relógio de teste |
| Cotação de R$ 35,00 aparece no checkout e o pedido é criado com R$ 35,00 de frete | Pagamento único com valor gravado | Finalizar a compra |
| Mudar a quantidade no carrinho invalida a cotação | Valor bate com o que é comprado | Checkout |
| Resposta R$ 0,00 aparece como "Frete grátis combinado com o vendedor" | Ferramenta de venda | Checkout |
| O chat livre continua bloqueado antes do pagamento | Decisão 2 | Tentar abrir o chat sem pedido pago |
| Produto com "Frete a combinar" não mostra frete grátis, transportadora, percentual, Uber nem km, mesmo com cobertura | Decisão 3 (28/09) | Página do produto e checkout de loja com transportadora e percentual |
| Comprador vê em "Minhas cotações" a cotação que pediu, com estado, valor, prazo e validade | Não perder a resposta do vendedor | Pedir cotação, recarregar a conta e abrir o menu |
| "Comprar com este frete" leva ao checkout com os itens e o frete da cotação | Resposta vira compra sem refazer o caminho | Clicar no botão e conferir o checkout |
| Resposta do seller aparece em "Avisos" do comprador e leva à cotação | Ver a novidade sem o e-mail | Responder como seller e abrir os avisos do comprador |
| Pedido pago com frete combinado abre o chat com a mensagem do que foi combinado | O seller entrega sem perguntar de novo | Pagar o pedido e abrir a conversa como seller |

### 5b. Métricas de sucesso

| Métrica | Baseline (fonte) | Meta | Prazo | Mín. aceitável | Responsável |
|---------|-------------------|------|-------|-----------------|-------------|
| Cotações respondidas em até 24 h | Não existe (feature nova) | 80% | 60 dias após o deploy | 60% | Dona do produto |
| Tempo mediano de resposta do seller | Não existe | 4 h | 60 dias após o deploy | 12 h | Dona do produto |
| Cotações respondidas que viram pedido pago | Não existe | 30% | 60 dias após o deploy | 15% | Dona do produto |
| Respostas pelo WhatsApp confirmadas sem correção | Não existe | 85% | 60 dias após o deploy | 70% | Engenharia |

## 6. Milestones

### Milestone 1: Comprador pede cotação e o seller responde

**Por que é um marco:** produto sem frete deixa de ser venda perdida: o comprador pede, o seller responde, e o frete cotado vira compra num pagamento só.

**Funcionalidades:** US01, US02, US03, US04, US06

**Checklist de aceite** (marcado pelo Aprovador após a implementação):
- [ ] Produto com "Frete a combinar" mostra "Combine a entrega com o vendedor" e nenhum outro frete; CEP fora das regiões não mostra; sem região declarada, só a UF de origem
- [ ] Carrinho com item de tabela e item a combinar vira 2 envios e a cotação cobre só o que falta
- [ ] Pedido de cotação chega ao seller em até 1 minuto
- [ ] Observação com telefone ou Pix é recusada
- [ ] Sem resposta em 24 h, a cotação expira e o comprador é avisado
- [ ] Cotação de R$ 35,00 vira pedido com R$ 35,00 de frete; mudar a quantidade invalida
- [ ] R$ 0,00 aparece como frete grátis combinado
- [ ] Chat livre continua bloqueado antes do pagamento

**Aprovador:** dona do produto

### Milestone 2: Seller responde pelo WhatsApp

**Por que é um marco:** o seller responde de onde já está, e a venda espera menos.

**Funcionalidades:** US05

**Checklist de aceite** (marcado pelo Aprovador após a implementação):
- [ ] "fica 35 conto, entrego quinta" → resumo R$ 35,00, vale só após Confirmar
- [ ] Mensagem sem valor ou com baixa confiança → pede resposta pelo painel

**Aprovador:** dona do produto

### Milestone 3: Cada lado acompanha as cotações no próprio painel

**Por que é um marco:** a cotação deixa de depender do e-mail e da memória do comprador; quem pediu acha a resposta e compra, e o seller entrega sabendo o que foi combinado.

**Funcionalidades:** US07, US08, US09

**Checklist de aceite** (marcado pelo Aprovador após a implementação):
- [ ] "Minhas cotações" lista a cotação pedida com estado, valor, prazo e validade
- [ ] "Comprar com este frete" leva ao checkout com os itens e o frete da cotação
- [ ] Resposta do seller aparece em "Avisos" e leva à cotação
- [ ] Pedido pago com frete combinado abre o chat com a mensagem do combinado

**Aprovador:** dona do produto

## 7. Riscos e Dependências

| Risco | Impacto | Mitigação | Status |
|-------|---------|-----------|--------|
| Seller não responde e a venda morre | Alto | Lembrete, expiração, métrica de tempo de resposta visível ao seller | Pendente |
| Comprador e seller usam a observação para combinar por fora | Médio | Bloqueio de telefone, e-mail, Pix e links; chat só após pagamento | Pendente |
| Jev interpreta errado a resposta em português | Médio | Confirmação obrigatória pelo seller; baixa confiança manda para o painel | Pendente |
| Seller marca "Frete a combinar" em muitos produtos e não dá conta de responder | Médio | A opção é do seller, produto a produto; lembrete em 12 h e contador no painel | Pendente |
| Cotação reaproveitada para outro carrinho | Baixo | Presa ao CEP, à quantidade e à validade; checada no servidor | Mitigado |
| Comprador perde a cotação por não achar onde ela está | Alto | "Minhas cotações" e "Avisos" (US07, US08) | Pendente |
| "Comprar com este frete" apaga itens que o comprador tinha no carrinho | Médio | Substitui só os itens da loja da cotação | Pendente |

**Dependências:**

| Dependência | Tipo | Status | Impacto se bloqueado |
|-------------|------|--------|----------------------|
| PRD 049 (fontes de frete, CDs, envios) | Interna | Rascunho | Define quando não há frete calculável e o CD de origem |
| PRD 052 (frete no repasse) | Interna | Rascunho | Sem ele, o frete cotado não chega ao seller |
| WhatsApp do seller cadastrado e bot com botões (em produção) | Interna | Em produção | M2 |
| Chave TypeSafe/Jev (em produção) | Externa | Em produção | M2 |

## 8. Referências

- [PRD 049: Frete por tabela de transportadora](./049-frete-por-tabela-da-transportadora-do-seller.md)
- [PRD 052: Frete no repasse do seller](./052-frete-no-repasse-do-seller.md)
- `supabase/migrations/0075_chat_comprador_vendedor.sql` – chat e regra de só abrir após pagamento
- `supabase/migrations/0139_uber_direct_transportadora.sql` – molde de cotação gravada no servidor
- [Cupom Marketplace: Entrega a combinar no Mercado Livre](https://cupommarketplace.com.br/entrega-a-combinar-como-funciona-no-mercado-livre/)
- [TypeSafe: extração de valores pré-parseados](https://docs.typesafe.ai/cookbooks/pre_parsed_value_extraction_cookbook.md)

## 9. Registro de Decisões

- **2026-09-24:** Cotação antes da compra e pagamento único. Descartados: cobrança separada depois e frete por fora (Mercado Livre). Motivo: controle do valor, garantia e sem negociação por fora.
- **2026-09-24:** Chat continua bloqueado antes da compra; só o formulário de cotação.
- **2026-09-24:** Aparece automaticamente sem frete calculável, dentro das regiões do produto; seller pode desligar por produto.
- **2026-09-24:** Cotação do produto na página; nova cotação do conjunto no checkout se o carrinho tiver mais itens; indica o CD.
- **2026-09-24:** Resposta em 24 h com lembrete em 12 h; validade de 48 h; "não entrego" e frete grátis permitidos.
- **2026-09-24:** Resposta pelo WhatsApp interpretada pelo Jev, confirmada pelo seller.
- **2026-09-24:** Premissas pendentes: bloqueio de contato na observação; um pedido aberto por comprador, produto e CEP; limite de 10 pedidos por hora; dados do comprador ocultos no aviso; confirmação para frete acima de 50% do valor.
- **2026-09-24:** `depends_on: ["049"]`. Critério: a regra de "não há frete calculável", o CD de origem e os envios vêm do PRD 049. O PRD 052 é referência (destino do dinheiro), mas depende deste, não o contrário.
- **2026-09-24:** Todas as premissas pendentes aceitas pela dona; status passa a pronto.
- **2026-09-24:** Grilling com a dona: carrinho com item de tabela e item a combinar vira envios separados e a cotação cobre só o que falta (substitui "nova cotação do conjunto"); o seller pode oferecer também valor para o carrinho inteiro. Produto sem região declarada fica a combinar só na UF do CD. Motivo: manter o preço automático onde ele existe e evitar cotação de outro estado para carga pesada.
- **2026-09-28:** Decisão da dona: "Frete a combinar" é opção que o seller marca no produto e desativa todo outro frete dele (substitui a decisão 3 de 24/09, de aparecer automaticamente sem frete calculável). Retirada continua, como premissa. A origem passa a ser o CEP do produto e a cidade dele, não o CD (alinhado à change do checkout por tabela).
- **2026-09-28:** Milestone 1 implementado (PR #815, migration 0203 aplicada em produção) e testado de ponta a ponta no preview: pedido FCB9E8DAB3 com R$ 149,00 + R$ 29,80 de frete combinado.
- **2026-09-28:** Brainstorm "para onde vão as cotações": cada painel tem caixa própria (seller "Cotações de frete", já existente; comprador "Minhas cotações", nova), com avisos na central do comprador. Descartados: cotação dentro do chat antes da compra (reabre o canal por fora, conflita com a decisão 2), cotação em "Meus pedidos" (cotação não é pedido) e só avisos sem lista (com várias cotações o comprador se perde). US07, US08 e US09 adicionadas como Milestone 3, com premissas pendentes de confirmação.
- **2026-09-28:** Dona aceitou as 5 premissas do Milestone 3: "Minhas cotações" como item próprio do menu da conta; cotação usada vira a primeira mensagem do chat do pedido após o pagamento, sem poder ser apagada; "Comprar com este frete" de cotação do checkout substitui só os itens daquela loja no carrinho; "vencendo" = respondida com menos de 12 horas de validade; sem tela de cotações no admin por enquanto. Status segue pronto.
