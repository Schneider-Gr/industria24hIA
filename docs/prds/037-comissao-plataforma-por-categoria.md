---
prd_number: "037"
status: rascunho
priority: alta
created: 2026-09-16
issue: ""
depends_on: ["023"]
references:
  - "docs/prds/023-sistema-repasse-asaas.md"
  - "supabase/migrations/0172_guarda_cupom_ticket_minimo_loja.sql"
  - "supabase/migrations/0158_repasse_seller_valor_derivado_e_solicitacao.sql"
  - "supabase/migrations/0156_cupom_desconto_checkout.sql"
  - "supabase/migrations/0002_seller_module.sql"
---

# PRD 037: Comissão da plataforma por categoria e subcategoria

## 1. Contexto

- **Produto/área**: Indústria 24h (marketplace, www.industria24.com.br), caminho do dinheiro — checkout, comissão da plataforma e repasse ao seller.
- **Estado atual**: a plataforma cobra 5% sobre o valor de cada item, sempre, para qualquer produto. O número não é configurável em lugar nenhum: é a constante `round(v_valor_item * 0.05, 2)` escrita dentro do corpo da RPC `checkout_criar_pedido`, que já foi recopiada por inteiro em cerca de vinte migrations e existe hoje em overloads de 3, 4, 5 e 6 argumentos (última cópia na 0172). O painel `/admin/categorias` só cria, renomeia e exclui nomes de categoria e subcategoria; não guarda nenhum dado econômico.
- **Problema**: 5% é margem razoável em material de construção e é margem errada em perecível de supermercado, onde giro, perda e custo logístico são outros. Sem diferenciar por tipo de produto a plataforma subsidia as categorias caras com as baratas, e cada negociação nova de margem depende de alguém reescrever uma função SQL de centenas de linhas em quatro assinaturas, o que é caro e arriscado justamente no trecho que calcula dinheiro.

> Contexto técnico (stack, arquitetura, padrões) vive no TRD. Aqui só o ponteiro: a comissão gravada em `linha_itens.repasse_ind` é o que determina o repasse ao seller, porque desde a migration 0158 o ledger deriva o valor do seller como `valor - repasse_ind - repasse_afiliado` em vez de ler coluna própria.

## 2. Solução Proposta

### Visão de produto

- A comissão deixa de ser um número fixo do código e passa a ser um dado do catálogo, editável pelo admin na mesma tela onde a taxonomia já é mantida.
- A regra vive na categoria; a subcategoria pode sobrescrever quando o comportamento econômico dentro da categoria for diferente (o caso "Supermercado 10%, mas perecível outro número").
- Todo item vendido guarda o percentual que foi aplicado a ele, para que mudar a tabela amanhã não reescreva o extrato de ontem.
- O repasse ao seller e o teto de desconto do cupom de plataforma passam a acompanhar a comissão da categoria automaticamente, sem regra nova.

### Decisões de produto

1. **Escopo da regra é a taxonomia, não a loja.** Não há comissão negociada por loja nesta versão. Motivo: a dona optou por categoria; comissão por loja abre negociação caso a caso e precisa de governança própria.
2. **Precedência: subcategoria, depois categoria, depois o padrão de 5%.** A subcategoria só vale quando tiver percentual definido; deixá-la vazia é a forma normal de herdar da categoria.
3. **O percentual aplicado é gravado na linha do pedido.** Sem esse registro, qualquer mudança futura de percentual falsifica retroativamente o extrato do seller e a auditoria do caminho do dinheiro.
4. **O teto do cupom de plataforma continua sendo a comissão da linha.** O motor de cupom já limita o desconto ao `repasse_ind` daquela linha (`least(v_desc_linha, p_repasse_ind)`). Como consequência aceita: categoria com comissão menor passa a ter menos espaço para desconto de plataforma, e categoria com comissão maior passa a ter mais.
5. **Sem piso mínimo de repasse nesta versão.** Decisão explícita da dona, apesar de o custo por transferência PIX existir.
6. **O padrão de 5% permanece como fallback do sistema.** Categoria sem percentual definido, produto sem categoria e pedido de produto excluído continuam cobrando 5%, que é exatamente o comportamento de hoje.

### Fora do escopo

- **Perfis de entrega por categoria** (SLA, janela, temperatura, transportadoras elegíveis). Adiado por decisão da dona; é feature maior, encosta em despacho de corrida e pool de parceiros, e merece PRD próprio.
- **Comissão negociada por loja ou por produto individual.** Ver decisão 1.
- **Vigência agendada** (programar hoje uma mudança de percentual para entrar no dia 1º). A mudança passa a valer no momento em que é salva; pedidos já criados ficam protegidos pelo snapshot. *(premissa — confirme ou corrija)*
- **Piso mínimo e acúmulo de repasses.** Ver decisão 5.
- **Recálculo de comissão de pedidos antigos.** A tabela nova não reescreve nada do que já foi vendido.
- **Comissão do afiliado.** Continua vindo de `afiliacoes.porcentagem` e sai da parte do seller, sem relação com esta regra.

## 3. Funcionalidades

### US01: Definir a comissão da categoria

Como administradora da plataforma, quero definir o percentual de comissão de cada categoria, para que a margem reflita o custo real de operar aquele tipo de produto.

**Rules:**
- O percentual é editável em `/admin/categorias`, na mesma linha onde a categoria já é listada.
- Categoria sem percentual definido cobra o padrão de 5%, e a tela deixa isso explícito em vez de exibir campo vazio ambíguo.
- Percentual aceito entre 0% e 100%, com duas casas decimais. *(premissa — confirme ou corrija)*
- Só administrador altera; a tela já é restrita e as escritas já exigem papel de admin.
- Toda alteração fica registrada com autor, valor anterior, valor novo e data. *(premissa — confirme ou corrija)*

**Edge cases:**
- Percentual 0% → aceito, a plataforma não cobra comissão naquela categoria e o seller recebe o valor integral do item. Como efeito da decisão 4, cupom de plataforma não dá desconto nenhum nessa categoria.
- Percentual salvo com vírgula, espaço ou símbolo de porcentagem → normalizado antes de gravar, ou recusado com mensagem clara. *(premissa — confirme ou corrija)*
- Categoria excluída enquanto tem produtos → comportamento atual de exclusão não muda; os produtos órfãos passam a cobrar o padrão de 5%.

### US02: Sobrescrever a comissão em uma subcategoria

Como administradora da plataforma, quero definir um percentual próprio para uma subcategoria, para que um grupo com economia diferente dentro da mesma categoria não fique preso à margem geral.

**Rules:**
- Subcategoria com percentual definido tem precedência sobre a categoria à qual pertence.
- Subcategoria sem percentual herda a categoria, e a tela mostra qual valor está sendo herdado.
- Limpar o percentual da subcategoria devolve a herança; não existe estado "definido como zero por engano" indistinguível de vazio, porque 0% é valor válido e distinto de vazio.

**Edge cases:**
- Subcategoria movida para outra categoria → se tem percentual próprio, mantém; se herdava, passa a herdar da categoria nova.
- Produto com subcategoria preenchida mas categoria vazia → usa a subcategoria; se ela também não tem percentual, cai no padrão de 5%. *(premissa — confirme ou corrija)*

### US03: Cobrar no checkout o percentual da taxonomia do produto

Como plataforma, quero que cada item vendido seja cobrado pelo percentual da sua subcategoria ou categoria, para que a margem configurada tenha efeito real sobre o dinheiro.

**Rules:**
- No fechamento do pedido, cada item resolve seu percentual pela precedência subcategoria, categoria, padrão 5%, e a comissão da linha é o valor do item multiplicado por esse percentual.
- O repasse ao seller continua sendo derivado (valor do item menos comissão da plataforma menos comissão do afiliado), então ele se ajusta sem regra adicional.
- O desconto de cupom de plataforma continua limitado à comissão daquela linha, que agora varia por categoria.
- A comissão é calculada sobre o valor do item já com desconto progressivo, preço de faixa, venda futura ou cupom de loja aplicados, exatamente como hoje; frete não entra na base.
- Pedido com itens de categorias diferentes cobra percentuais diferentes por linha, sem média nem arredondamento no nível do pedido.

**Edge cases:**
- Percentual alterado entre o momento em que o comprador montou o carrinho e o momento em que fechou o pedido → vale o percentual vigente no fechamento, que é quando o preço e o estoque também são revalidados no servidor.
- Produto sem categoria e sem subcategoria → 5%.
- Categoria com percentual altíssimo que deixaria o repasse do seller negativo → não pode ocorrer enquanto o teto for 100% e o afiliado sair da parte do seller; se a soma comissão mais afiliado passar de 100% do item, o pedido é recusado em vez de gravar repasse negativo. *(premissa — confirme ou corrija)*

### US04: Ver qual percentual foi aplicado

Como seller, quero ver o percentual de comissão que incidiu sobre cada item vendido, para conferir meu repasse sem depender do suporte. Como administradora, quero o mesmo dado para auditar o caminho do dinheiro.

**Rules:**
- A tela de pedidos do seller mostra, por item, o percentual aplicado além do valor já exibido hoje.
- O valor exibido vem do registro gravado na venda, nunca da tabela de configuração atual.
- Pedido anterior a esta feature, sem percentual gravado, é exibido como 5%, que é o que foi de fato cobrado. *(premissa — confirme ou corrija)*

**Edge cases:**
- Pedido migrado do Bubble cuja comissão histórica não corresponde a 5% do valor → exibir o valor em reais efetivamente cobrado e omitir o percentual, em vez de mostrar um número derivado que não bate. *(premissa — confirme ou corrija)*

## 4. Fluxo de Negócio

```
Item entra no pedido
   │
   ▼
Subcategoria do produto tem percentual?
   ├── sim ──▶ usa o da subcategoria
   └── não ──▶ Categoria tem percentual?
                 ├── sim ──▶ usa o da categoria
                 └── não ──▶ usa o padrão de 5%
   │
   ▼
Grava na linha: comissão em reais + percentual aplicado
   │
   ▼
Repasse ao seller = valor − comissão da plataforma − comissão do afiliado
   │
   ▼
Cupom de plataforma (se houver) desconta no máximo a comissão desta linha
```

## 5. Critérios de Aceite

### 5a. Critérios de aceite da feature

| Critério | Razão de negócio | Como verificar (observável) |
|----------|------------------|-----------------------------|
| Categoria com 10% gera comissão de 10% do valor do item no pedido | é o efeito central da feature | fechar pedido de teste com produto dessa categoria e conferir a comissão gravada na linha |
| Subcategoria com percentual próprio prevalece sobre a categoria | é o caso "supermercado perecível" que originou o pedido | dois produtos da mesma categoria, um com subcategoria configurada, no mesmo pedido, resultam em percentuais distintos |
| Categoria sem percentual continua cobrando 5% | nenhuma categoria pode mudar de margem por omissão | pedido com produto de categoria não configurada mantém a comissão idêntica à de hoje |
| Repasse ao seller fecha com o valor do item menos comissão e afiliado, ao centavo | divergência aqui é dinheiro errado no bolso de terceiro | somar as linhas do pedido e comparar com o ledger de repasse |
| Percentual gravado na venda não muda quando a configuração muda depois | sem isso o extrato histórico passa a mentir | alterar o percentual da categoria e reabrir um pedido antigo, que deve exibir o valor original |
| Desconto de cupom de plataforma nunca ultrapassa a comissão da linha | acima disso a plataforma paga para vender | cupom de valor alto em categoria de comissão baixa tem o desconto truncado |
| Mudança de percentual fica visível a partir do próximo pedido, sem redeploy | a operação precisa ajustar margem sem equipe técnica | salvar no painel e fechar um pedido em seguida |

### 5b. Métricas de sucesso

| Métrica | Baseline (fonte) | Meta | Prazo | Mín. aceitável | Responsável |
|---------|-------------------|------|-------|-----------------|-------------|
| Comissão média efetiva da plataforma | 5,00% (constante no código, igual para todo item) | A definir pela dona por categoria | 30 dias após a entrega | não cair abaixo de 5% no agregado sem decisão explícita | Andreia |
| Tempo para mudar a margem de uma categoria | hoje exige migration SQL reescrevendo `checkout_criar_pedido` (medido em horas e com risco no caminho do dinheiro) | menos de 1 minuto no painel | na entrega | qualquer mudança sem migration | Andreia |
| Divergência entre comissão cobrada e comissão esperada pela configuração | A levantar (hoje não é medido; responsável: Andreia, até a entrega do Milestone 1) | zero | contínuo | zero | Andreia |

## 6. Milestones

### Milestone 1: Cobrar comissão por categoria e subcategoria

**Por que é um marco:** a partir dele a plataforma deixa de ter margem única e passa a precificar por tipo de produto, que é a decisão de negócio que motivou tudo. É anunciável como conquista porque muda a economia do marketplace, não só a tela.

**Funcionalidades:** US01, US02, US03

**Checklist de aceite** (marcado pelo Aprovador após a implementação):
- [ ] Categoria com 10% gera comissão de 10% do valor do item no pedido
- [ ] Subcategoria com percentual próprio prevalece sobre a categoria
- [ ] Categoria sem percentual continua cobrando 5%
- [ ] Repasse ao seller fecha com o valor do item menos comissão e afiliado, ao centavo
- [ ] Percentual gravado na venda não muda quando a configuração muda depois
- [ ] Desconto de cupom de plataforma nunca ultrapassa a comissão da linha
- [ ] Mudança de percentual fica visível a partir do próximo pedido, sem redeploy

**Aprovador:** dona do produto (Andreia)

### Milestone 2: Mostrar a comissão aplicada ao seller

**Por que é um marco:** o seller passa a conferir sozinho por que recebeu aquele valor. Com margem variável por categoria, a pergunta "por que esse pedido rendeu menos" deixa de ter resposta óbvia, e sem essa tela ela vira ticket de suporte.

**Funcionalidades:** US04

**Checklist de aceite** (marcado pelo Aprovador após a implementação):
- [ ] O percentual exibido vem do registro da venda e não da configuração atual
- [ ] Pedido anterior à feature aparece sem inconsistência

**Aprovador:** dona do produto (Andreia)

## 7. Riscos e Dependências

| Risco | Impacto | Mitigação | Status |
|-------|---------|-----------|--------|
| O repasse PIX nunca transferiu em produção: zero linhas `transferido` desde sempre, e o motivo da recusa do Asaas não é diagnosticado nem persistido | Alto | esta feature calcula a comissão certa mas não faz o dinheiro sair; destravar o repasse é o PRD 023 e deve vir antes ou em paralelo, senão a entrega é contábil e não financeira | Pendente |
| O cálculo mora dentro de uma RPC de checkout recopiada por inteiro em cerca de vinte migrations, em quatro assinaturas | Alto | extrair a resolução do percentual para uma função própria antes de dar comportamento novo a ela, de modo que a primeira mudança não altere resultado nenhum e seja verificável isoladamente | Pendente |
| Margem mal calibrada em categoria de giro alto derruba receita sem ninguém perceber | Médio | métrica de comissão média efetiva acompanhada nos primeiros 30 dias | Pendente |
| Redução de comissão encolhe silenciosamente o teto de desconto do cupom de plataforma naquela categoria | Médio | efeito aceito na decisão 4; a tela de cupom deve deixar claro que o desconto pode ser truncado | Monitorando |
| Pedidos migrados do Bubble têm histórico financeiro que não obedece a nenhuma regra atual | Baixo | não recalcular histórico; exibir valor efetivo em vez de percentual derivado | Monitorando |

**Dependências:**

| Dependência | Tipo | Status | Impacto se bloqueado |
|-------------|------|--------|----------------------|
| PRD 023 (sistema de repasse via Asaas) | Interna | repasse não funciona em produção | os dois milestones entregam número correto sem pagamento correspondente |
| Decisão da dona sobre o percentual de cada categoria | Interna | pendente | Milestone 1 entrega a capacidade com todas as categorias ainda em 5% |

## 8. Referências

- [PRD 023 — Sistema de Repasse Automático via Asaas](023-sistema-repasse-asaas.md) — define o trilho que paga o valor que esta feature calcula, e hoje está bloqueado
- `supabase/migrations/0172_guarda_cupom_ticket_minimo_loja.sql` — cópia mais recente de `checkout_criar_pedido`, onde a constante de 5% vive hoje
- `supabase/migrations/0158_repasse_seller_valor_derivado_e_solicitacao.sql` — estabelece que o repasse ao seller é derivado da comissão, razão de esta feature não precisar mexer no ledger
- `supabase/migrations/0156_cupom_desconto_checkout.sql` — motor de cupom cujo teto é a comissão da linha
- `supabase/migrations/0002_seller_module.sql` — origem de `categorias`, `subcategorias` e dos campos de taxonomia do produto

## 9. Registro de Decisões

- **2026-09-16:** Regra de comissão vive na categoria, com a subcategoria podendo sobrescrever. Motivo: escolha da dona; cobre o caso que originou o pedido (supermercado perecível dentro de supermercado) sem abrir negociação por loja.
- **2026-09-16:** Percentual aplicado é gravado na venda. Motivo: sem snapshot, mudar a configuração reescreve retroativamente o extrato do seller e destrói a auditoria do caminho do dinheiro.
- **2026-09-16:** Teto do cupom de plataforma continua sendo a comissão da linha, que agora varia. Motivo: escolha da dona; mantém a garantia de que a plataforma nunca paga para vender, ao custo de o espaço de desconto variar por categoria.
- **2026-09-16:** Sem piso mínimo de repasse nesta versão. Motivo: decisão da dona; o custo por transferência PIX fica como assunto de uma revisão futura.
- **2026-09-16:** Perfis de entrega por categoria ficam fora de escopo. Motivo: decisão da dona; o modelo de frete atual (percentual por faixa de CEP, tabela por transportadora, Uber Direct) não conhece categoria, e um perfil de entrega real encosta em despacho de corrida, o que é feature própria.
- **2026-09-16:** `depends_on: ["023"]`. Motivo: esta feature altera o valor que o sistema de repasse transfere; nenhum outro PRD descreve comportamento pressuposto aqui.
