---
prd_number: "036"
status: rascunho
priority: crítica
created: 2026-09-16
issue: ""
depends_on: ["012", "014", "026"]
references:
  - "supabase/migrations/0014_checkout_asaas.sql"
  - "supabase/migrations/0018_fix_checkout_oversell_duplicado.sql"
  - "supabase/migrations/0022_fix_checkout_race_estoque.sql"
  - "docs/prd/centro-distribuicao-fulfillment.md"
  - "docs/prds/026-vitrine-raio-geolocalizacao.md"
---

# PRD 036: Ledger de estoque multi-local (Fase 1 do armazenamento, piloto Manaus/AM)

## 1. Contexto

- **Produto/área**: Estoque e checkout do marketplace Indústria 24h, base para o serviço de armazenagem do marketplace (fulfillment).
- **Estado atual**: o estoque de todo o marketplace é um inteiro único por produto, `produtos.estoque_atual`, decrementado dentro das RPCs de checkout (`0014`, `0018`, `0022`). Não existe tabela de movimentação, não existe reserva e não existe noção de onde a mercadoria está fisicamente. A tabela `centros_distribuicao` guarda apenas `nome`, `localizacao` (texto livre) e `status`, sem vínculo com saldo. A proteção contra oversell hoje é um `FOR UPDATE` na linha do produto mais um `CHECK (estoque_atual >= 0)`.
- **Problema**: três dores somadas. (a) O marketplace não consegue dizer de onde o produto sai, o que impede qualquer serviço de armazenagem e impede prometer prazo por origem. (b) O saldo é destruído na baixa: quando um pedido é cancelado, expira sem pagamento ou falha parcialmente no checkout multi-loja, não há registro do que aconteceu nem devolução confiável ao saldo. (c) Não existe auditoria: quando o seller reclama que o saldo está errado, não há como reconstruir o histórico, e no momento em que o Indústria guardar mercadoria de terceiro em Manaus, divergência de saldo deixa de ser bug e vira dívida com o seller.

> Contexto técnico (stack, arquitetura, padrões) vive no TRD. Aqui só o ponteiro para as migrations que hoje fazem a baixa.

## 2. Solução Proposta

### Visão de produto

- Trocar o saldo escalar por um **livro de movimentações**: toda alteração de estoque vira um lançamento imutável com tipo, quantidade, local e motivo, e o saldo passa a ser a soma dos lançamentos.
- Introduzir **reserva com expiração**: o pedido criado reserva a mercadoria em vez de baixá-la; a baixa definitiva só ocorre na expedição, e o pedido não pago libera o saldo sozinho.
- Introduzir **local de estoque**: todo saldo passa a pertencer a um local (centro de distribuição do seller ou, no piloto, o CD Indústria em Manaus), o que torna possível responder "de onde sai" e habilita as fases seguintes de armazenagem.
- Manter **compatibilidade total** com o que já existe: `produtos.estoque_atual` continua existindo e correto, alimentado pelo ledger, para não quebrar as 124 referências espalhadas no código e nas migrations.
- Entregar ao seller uma **tela de extrato de estoque** por produto, com histórico e motivo de cada movimento, que é o que sustenta a confiança necessária para ele entregar mercadoria ao marketplace na Fase 3.

### Decisões de produto

1. **Piloto restrito a Manaus/AM.** O ledger passa a valer para todo o marketplace (o saldo é global), mas apenas lojas com centro de distribuição em Manaus recebem estoque multi-local e a tela de extrato na primeira onda. Motivo: a captação ativa está em Manaus e o volume menor permite reconciliar divergência à mão se algo escapar. *(premissa: faixa de CEP de Manaus tratada como 69000-000 a 69099-999 — confirme ou corrija)*
2. **Reserva expira em 30 minutos para PIX e boleto.** É o tempo em que o comprador ainda pode pagar sem que o saldo fique travado para os demais. *(premissa — confirme ou corrija)*
3. **Lançamento é imutável.** Correção de erro se faz com lançamento de ajuste contrário e motivo obrigatório, nunca com edição ou exclusão. Motivo: sem isso não há auditoria, e auditoria é o produto aqui.
4. **Saldo negativo é proibido em qualquer caminho.** A garantia atual (`CHECK`) é preservada no nível do saldo por local.
5. **Todo lançamento carrega motivo e autor.** Ajuste manual sem motivo é rejeitado, porque ajuste sem motivo é exatamente a origem da divergência que este PRD existe para eliminar.
6. **Seller não edita saldo direto.** O que hoje é "editar estoque" no cadastro de produto passa a gerar um lançamento de ajuste com motivo. *(premissa — confirme ou corrija)*

### Fora do escopo

- Endereçamento por posição dentro do galpão (rua, prédio, nível). É Fase 3; aqui o local é o CD inteiro, não a posição.
- Aviso de recebimento, conferência de entrada e inventário cíclico. São Fase 3.
- Lote e validade de produto. Entram junto com perecíveis, no PRD 010, não aqui. *(premissa — confirme ou corrija)*
- Tarifação de armazenagem (entrada, estadia, saída). É Fase 4.
- Consolidação de pedidos multi-loja num único pedido. Continua um pedido por loja; este PRD só conserta o vazamento de saldo quando uma das lojas falha.
- Reposição sugerida e previsão de ruptura. Dependem do ledger, mas são feature própria.

## 3. Funcionalidades

### US01: Livro de movimentações como fonte da verdade

Como operação do marketplace, quero que toda alteração de estoque seja um lançamento registrado, para conseguir reconstruir o saldo de qualquer produto em qualquer data.

**Rules:**
- Todo lançamento tem: produto, local, quantidade com sinal, tipo (entrada, saída, reserva, liberação de reserva, ajuste, transferência), motivo, autor e data.
- O saldo disponível de um produto num local é a soma dos lançamentos menos as reservas ativas daquele local.
- Lançamento não pode ser alterado nem excluído após gravado.
- `produtos.estoque_atual` passa a refletir a soma dos saldos disponíveis do produto em todos os locais, e permanece consistente sem intervenção manual.
- Ajuste manual exige motivo preenchido, com no mínimo uma justificativa textual. *(premissa — confirme ou corrija)*

**Edge cases:**
- Lançamento que levaria o saldo do local abaixo de zero → rejeitado, com mensagem indicando o saldo disponível real.
- Produto sem nenhum local cadastrado → recebe lançamentos num local padrão da loja, criado automaticamente na migração. *(premissa — confirme ou corrija)*
- Duas operações concorrentes sobre o mesmo produto e local → ambas são serializadas e nenhuma produz saldo negativo.

### US02: Reserva no pedido, baixa na expedição

Como comprador, quero que o produto que coloquei num pedido não seja vendido a outra pessoa enquanto eu pago, para não perder a compra depois de pagar.

**Rules:**
- Criar pedido gera reserva, não baixa. A mercadoria reservada sai do saldo disponível e continua no saldo físico.
- Confirmação de pagamento mantém a reserva. A baixa definitiva ocorre na expedição do pedido.
- Cancelamento do pedido, em qualquer status anterior à expedição, libera a reserva integralmente.
- Reserva não paga expira em 30 minutos e libera o saldo automaticamente. *(premissa — confirme ou corrija)*
- Toda reserva aponta para o pedido que a originou, e a liberação registra o motivo (pago, cancelado, expirado).

**Edge cases:**
- Pagamento confirmado depois da reserva ter expirado e o saldo já ter sido vendido → pedido entra em pendência de estoque e o comprador é avisado com opção de reembolso, sem baixa forçada. *(premissa — confirme ou corrija)*
- Checkout multi-loja em que a segunda loja falha → as reservas da primeira loja são liberadas na mesma transação, sem sobrar saldo travado.
- Expedição de pedido cuja reserva foi liberada por engano → bloqueada, com mensagem apontando o pedido e o motivo da liberação registrado.
- Pedido expedido e depois devolvido → gera lançamento de entrada com motivo de devolução, nunca reversão do lançamento original.

### US03: Estoque por local

Como seller de Manaus, quero declarar de qual centro de distribuição cada quantidade sai, para que o marketplace prometa prazo correto e para que eu possa usar o CD do Indústria depois.

**Rules:**
- Todo local tem tipo: `seller` (CD próprio do seller) ou `industria` (CD operado pelo marketplace).
- O centro de distribuição passa a exigir CEP estruturado, além da localização textual que já existe hoje.
- Um produto pode ter saldo em mais de um local simultaneamente.
- Na venda, o local de origem é escolhido pela menor distância entre o CEP do local e o CEP de entrega, entre os locais com saldo disponível. *(premissa — confirme ou corrija)*
- No piloto, apenas lojas com pelo menos um local em Manaus podem cadastrar mais de um local.

**Edge cases:**
- Local sem CEP válido → não pode receber saldo, e o seller vê um aviso no cadastro do centro.
- Saldo suficiente no total, mas insuficiente em qualquer local isolado → o pedido é atendido a partir de mais de um local, e cada origem é registrada no pedido. *(premissa — confirme ou corrija)*
- Tentativa de excluir centro de distribuição com saldo maior que zero → bloqueada, com instrução de transferir o saldo antes.

### US04: Transferência entre locais

Como seller, quero mover saldo de um centro para outro, para abastecer o CD do Indústria sem inventar entrada nova.

**Rules:**
- Transferência gera dois lançamentos ligados: saída na origem e entrada no destino, com a mesma referência.
- O saldo total do produto não muda com a transferência.
- Transferência exige saldo disponível na origem, descontadas as reservas.

**Edge cases:**
- Origem e destino iguais → rejeitada.
- Transferência de quantidade maior que o disponível → rejeitada, com o disponível real na mensagem.

### US05: Extrato de estoque para o seller

Como seller, quero ver o histórico completo de movimentação de cada produto, para conferir o saldo do marketplace contra o meu controle e resolver divergência sem abrir chamado.

**Rules:**
- A tela lista os lançamentos do produto em ordem cronológica decrescente, com data, tipo, quantidade, local, motivo e saldo resultante.
- Permite filtrar por local e por período.
- Mostra separadamente saldo físico, saldo reservado e saldo disponível.
- O seller vê apenas os lançamentos das lojas dele.

**Edge cases:**
- Produto sem movimentação → estado vazio explicando que o saldo veio da migração inicial.
- Produto com histórico muito longo → paginação, sem travar a tela. *(premissa — confirme ou corrija)*

### US06: Migração do saldo atual sem perda

Como operação, quero que a virada para o ledger preserve exatamente o saldo que existe hoje em produção, para que nenhum seller veja o estoque mudar da noite para o dia.

**Rules:**
- Cada produto com `estoque_atual` maior que zero recebe um lançamento inicial de entrada com motivo "saldo inicial da migração", no local padrão da loja.
- Depois da migração, o saldo calculado pelo ledger é idêntico ao `estoque_atual` anterior para 100% dos produtos.
- A migração é reversível enquanto o ledger não estiver em uso pelo checkout.

**Edge cases:**
- Produto com `estoque_atual` zero → recebe local padrão, sem lançamento.
- Divergência detectada entre saldo calculado e `estoque_atual` na verificação pós-migração → a virada do checkout não acontece, e a lista de produtos divergentes é gerada para conferência manual.
- Pedido em aberto no momento da virada, criado sob a regra antiga (já baixado) → não gera reserva retroativa, para não baixar duas vezes. *(premissa — confirme ou corrija)*

## 4. Fluxo de Negócio

```
Pedido criado
   │
   ▼
Há saldo disponível no local mais próximo?
   ├── não ──▶ Há saldo em outros locais? ──┬── sim ──▶ Reserva dividida por local
   │                                        └── não ──▶ Pedido recusado por falta de estoque
   └── sim ──▶ Reserva criada (expira em 30 min)
                  │
                  ▼
              Pagamento confirmado dentro do prazo?
                  ├── não ──▶ Reserva expira ──▶ Saldo volta ao disponível
                  └── sim ──▶ Reserva mantida ──▶ Expedição ──▶ Baixa definitiva
                                                       │
                                                       ▼
                                                 Devolução? ──▶ Lançamento de entrada (motivo: devolução)
```

## 5. Critérios de Aceite

### 5a. Critérios de aceite da feature

| Critério | Razão de negócio | Como verificar (observável) |
|----------|------------------|-----------------------------|
| Saldo calculado pelo ledger é idêntico ao `estoque_atual` anterior para 100% dos produtos, imediatamente após a migração | Seller que vê o estoque mudar sozinho perde a confiança no marketplace e é irrecuperável | Query de conferência comparando as duas fontes em produção, com zero linhas divergentes |
| Nenhum caminho de escrita produz saldo negativo por local | Vender o que não existe custa o pedido e a reputação, e o custo cai no marketplace | Teste de concorrência com duas compras simultâneas do último item disponível |
| Checkout multi-loja que falha na segunda loja não deixa reserva ativa da primeira | É o vazamento de saldo que existe hoje e trava mercadoria vendável | Executar o cenário em transação com rollback e conferir que não sobra reserva |
| Reserva não paga libera o saldo em até 30 minutos | Acima disso o produto fica indisponível na vitrine sem venda correspondente | Criar pedido sem pagar e conferir o saldo disponível depois do prazo |
| Toda linha do ledger tem motivo e autor preenchidos | Ajuste sem rastro é a origem da divergência que este PRD elimina | Query de verificação: zero lançamentos com motivo ou autor nulo |
| Extrato do produto carrega em menos de 2 segundos com 12 meses de histórico | Acima disso o seller para de conferir e volta a abrir chamado | Medir na tela com o produto de maior volume do piloto |
| Seller não acessa lançamento de loja que não é dele | Vazamento de dado de concorrente entre sellers do mesmo marketplace | Teste de acesso com dois sellers distintos |

### 5b. Métricas de sucesso

| Métrica | Baseline (fonte) | Meta | Prazo | Mín. aceitável | Responsável |
|---------|-------------------|------|-------|-----------------|-------------|
| Divergência de saldo entre ledger e contagem do seller (piloto Manaus) | A levantar (não medido hoje; sem ledger não há como medir) | Menor que 1% dos SKUs | 60 dias após a virada | Menor que 3% dos SKUs | Operação |
| Pedidos recusados por falta de estoque com saldo travado indevidamente | A levantar (Operação, 30 dias antes da virada) | Zero | 30 dias após a virada | Zero | Operação |
| Chamados de seller sobre estoque errado | A levantar (Operação, histórico de atendimento) | Queda de 70% | 90 dias após a virada | Queda de 40% | Operação |
| Sellers de Manaus com mais de um local cadastrado | 0 (nenhum local estruturado existe hoje) | 5 sellers | 60 dias após a virada | 2 sellers | Captação |

## 6. Milestones

### Milestone 1: Ligar o livro de movimentações sem mexer no checkout

**Por que é um marco:** o marketplace passa a ter histórico auditável de estoque, e a operação consegue pela primeira vez responder "por que esse saldo mudou". Nada quebra, porque o checkout continua no caminho antigo até o saldo bater 100%.

**Funcionalidades:** US01, US06

**Checklist de aceite:**
- [ ] Saldo calculado pelo ledger idêntico ao `estoque_atual` anterior para 100% dos produtos
- [ ] Toda linha do ledger tem motivo e autor preenchidos
- [ ] Nenhum caminho de escrita produz saldo negativo por local

**Aprovador:** Dona do produto

### Milestone 2: Reserva no lugar da baixa antecipada

**Por que é um marco:** acaba o vazamento de estoque do checkout multi-loja e do pedido não pago, que é bug de produção hoje. O comprador deixa de perder compra paga e o seller deixa de ter saldo travado sem venda.

**Funcionalidades:** US02

**Checklist de aceite:**
- [ ] Checkout multi-loja que falha na segunda loja não deixa reserva ativa da primeira
- [ ] Reserva não paga libera o saldo em até 30 minutos
- [ ] Teste de concorrência com o último item disponível não produz saldo negativo

**Aprovador:** Dona do produto

### Milestone 3: Estoque com endereço, piloto Manaus

**Por que é um marco:** o marketplace passa a saber de onde cada produto sai e o seller ganha o extrato que sustenta a confiança. É o pré-requisito que destrava o serviço de armazenagem do Indústria.

**Funcionalidades:** US03, US04, US05

**Checklist de aceite:**
- [ ] Extrato do produto carrega em menos de 2 segundos com 12 meses de histórico
- [ ] Seller não acessa lançamento de loja que não é dele
- [ ] Ao menos um seller de Manaus com saldo distribuído em dois locais e transferência executada entre eles

**Aprovador:** Dona do produto

## 7. Riscos e Dependências

| Risco | Impacto | Mitigação | Status |
|-------|---------|-----------|--------|
| A virada toca as RPCs de checkout, que são o caminho do dinheiro | Alto | Testar cada alteração em transação com verificação e rollback antes de aplicar, e manter o caminho antigo até o saldo bater 100% | Pendente |
| Divergência silenciosa entre ledger e `estoque_atual` depois da virada | Alto | Verificação diária comparando as duas fontes durante os primeiros 30 dias, com alerta em caso de divergência | Pendente |
| As 124 referências a `estoque_atual` no código e nas migrations quebrarem | Alto | Manter a coluna funcionando e correta, alimentada pelo ledger, sem exigir alteração dos consumidores | Pendente |
| Expiração de reserva depender de job periódico que falha silenciosamente | Médio | Reserva expirada também é tratada na leitura do saldo, não só pelo job, para que a falha do job não trave estoque | Pendente |
| Seller resistir ao fim da edição direta de estoque | Médio | Manter o campo de edição, convertendo em ajuste com motivo, sem trocar o fluxo que ele já conhece | Pendente |
| Piloto em Manaus com volume baixo demais para revelar problema de concorrência | Médio | Complementar com teste de carga sintético no cenário de último item disponível | Pendente |

**Dependências:**

| Dependência | Tipo | Status | Impacto se bloqueado |
|-------------|------|--------|----------------------|
| PRD 014 (checkout PIX em sessão única) | Interna | Rascunho | Milestone 2 precisa saber qual é o desenho final do checkout antes de trocar baixa por reserva |
| PRD 026 (vitrine por raio de geolocalização) | Interna | Rascunho | Milestone 3 compartilha o conceito de origem geográfica do produto; divergir dele cria dois modelos de origem |
| Definição do CD Indústria em Manaus (próprio ou 3PL) | Externa | Em aberto | Não bloqueia nenhum milestone deste PRD, mas define o conteúdo da Fase 3 |
| Validação contábil do fluxo fiscal de mercadoria de terceiro | Externa | Em aberto | Não bloqueia este PRD, bloqueia a Fase 3 |

## 8. Referências

- `supabase/migrations/0014_checkout_asaas.sql` — onde a baixa de estoque foi introduzida no checkout
- `supabase/migrations/0018_fix_checkout_oversell_duplicado.sql` — correção do oversell por produto duplicado no carrinho
- `supabase/migrations/0022_fix_checkout_race_estoque.sql` — lock atual e restrição de saldo não negativo que este PRD preserva
- [PRD 012](012-checkout-pix-fluxo-atual.md) — fluxo de checkout PIX como está hoje
- [PRD 014](014-checkout-pix-unificacao-sessao-unica.md) — unificação de criação de pedido e cobrança
- [PRD 026](026-vitrine-raio-geolocalizacao.md) — origem geográfica do produto
- `docs/prd/centro-distribuicao-fulfillment.md` — PRD antigo de centro de distribuição, anterior à numeração

## 9. Registro de Decisões

- **2026-09-16:** Fase 1 do armazenamento é o ledger de estoque, antes de qualquer investimento em galpão. Motivo: o ledger conserta bug de produção existente (vazamento de saldo no checkout multi-loja e no pedido não pago) e tem valor próprio mesmo se o CD nunca sair do papel.
- **2026-09-16:** `produtos.estoque_atual` é preservada como saldo derivado em vez de removida. Motivo: são 124 referências no código e nas migrations, e migrar todas junto com a troca do modelo concentraria risco no caminho do dinheiro.
- **2026-09-16:** Piloto restrito a Manaus. Motivo: captação ativa na praça e volume baixo o suficiente para reconciliar divergência à mão durante a estabilização.
- **2026-09-16:** Lançamentos são imutáveis, com correção por ajuste contrário. Motivo: quando o marketplace guardar mercadoria de terceiro, o histórico auditável é o que sustenta a relação com o seller.
- **2026-09-16:** `depends_on` definido como 012, 014 e 026 por dependência real: 012 e 014 descrevem o fluxo de checkout cuja baixa este PRD substitui por reserva; 026 define o conceito de origem geográfica do produto que o local de estoque reutiliza. Os demais PRDs de logística (008, 022, 023) são do mesmo domínio mas não são pressupostos por esta feature.
- **2026-09-16:** Número 036 atribuído após conferir o maior número em todas as branches com `git log --all`, que era 035. O diretório local mostrava apenas até 026.
