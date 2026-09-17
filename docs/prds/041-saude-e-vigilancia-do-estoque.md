---
prd_number: "041"
status: rascunho
priority: alta
created: 2026-09-17
issue: ""
depends_on: ["036", "038"]
references:
  - "docs/prds/036-ledger-estoque-multi-local.md"
  - "docs/prds/038-ruptura-de-estoque-e-alertas-ao-seller.md"
  - "supabase/migrations/0175_estoque_ledger_milestone1.sql"
  - "supabase/migrations/0179_venda_futura_no_ledger_e_guardas.sql"
---

# PRD 041: Saúde e vigilância do estoque

## 1. Contexto

- **Produto/área**: Estoque e fulfillment do marketplace.
- **Estado atual**: o ledger de estoque (PRD 036) garante que toda mudança de saldo
  tem lançamento, motivo e origem. A conferência de que o ledger continua batendo com
  o saldo exibido é **manual**: alguém roda uma consulta quando lembra. A conferência
  diária prometida para os 30 primeiros dias após a entrada do ledger nunca aconteceu.
  As rotinas noturnas já registram o que acontece com elas, mas o registro é só
  escrita: **nada lê**.
- **Problema**: o estoque é o número que decide se a venda acontece, e hoje ele se
  vigia por lembrança. Medido em produção em 17/09/2026, dos **30 eventos de
  observabilidade existentes, 29 são de resultado `alerta`** e nenhum foi tratado. O
  alerta de carrinho abandonado falha há dias seguidos com o mesmo erro do provedor de
  e-mail (destinatário inválido), e o alerta de ruptura registra loja sem e-mail
  cadastrado. Ninguém foi avisado de nada disso. Enquanto o silêncio for
  indistinguível do funcionamento, uma rotina parada parece uma rotina sem trabalho, e
  a divergência de saldo só aparece quando um cliente compra o que não existe.

> Contexto técnico (stack, agendamento, provedores) vive no TRD. Aqui interessa que
> as rotinas existem, registram, e que o registro não vira aviso para ninguém.

## 2. Solução Proposta

### Visão de produto

- **O estoque se confere sozinho, todo dia**, em vez de depender de alguém lembrar.
- **Quebra de invariante vira aviso a uma pessoa**, com o que quebrou e desde quando,
  não uma linha a mais numa tabela que ninguém abre.
- **Silêncio passa a significar saúde**: rotina que deixou de rodar é tratada como
  falha, e não como ausência de trabalho.
- **Exceção registrada ganha dono e desfecho.** Hoje uma exceção de estoque é gravada
  e fica lá; ela passa a ser pendência que alguém fecha.
- **A saúde do estoque é consultável** por quem opera, sem pedir consulta a ninguém.

### Decisões de produto

1. **A conferência é diária, não em tempo real.** Divergência de saldo não é evento de
   minuto, e a garantia de não vender o que não existe já vive na criação do pedido. O
   diário é o que separa "descobrir em um dia" de "descobrir quando o cliente reclama".
2. **Alerta de invariante quebrado não é silenciado por repetição.** Diferente do
   alerta de ruptura ao seller, que espera pela mudança de estado, aqui a repetição é o
   próprio sinal: divergência que persiste por dias é pior que divergência nova.
3. **Rotina que não rodou é falha.** O aviso dispara pela ausência de execução, não só
   pelo erro dentro dela.
4. **O destinatário é a operação do marketplace, não o seller.** Divergência de ledger
   é problema de plataforma; o seller é avisado só quando o saldo da loja dele muda por
   correção.
5. **Toda exceção de estoque registrada tem um desfecho possível**: tratada, ou
   reconhecida como esperada. Pendência sem desfecho volta a aparecer.

### Fora do escopo

- Corrigir automaticamente divergência de saldo. Correção automática de número de
  estoque esconde a causa e pode transformar erro de leitura em perda real; o sistema
  avisa e a pessoa decide.
- Observabilidade de outros domínios (pagamento, entrega, agente de IA). A tabela de
  eventos é compartilhada, mas esta feature só responde pelo estoque.
- Substituir o monitoramento de erro de aplicação já existente. Aqui se vigia
  invariante de negócio, não exceção de runtime.
- Alertas ao seller sobre ruptura e reposição, que já são o PRD 038.

## 3. Funcionalidades

### US01: Conferência diária dos invariantes do estoque

Como operação do marketplace, quero que o sistema confira sozinho, todo dia, se os
números de estoque continuam coerentes entre si, para descobrir divergência por rotina
e não por reclamação de cliente.

**Rules:**
- A conferência SHALL rodar uma vez por dia e verificar, no mínimo: a soma dos
  lançamentos do ledger contra o saldo disponível de cada produto; o saldo por centro
  contra o mesmo total; e a existência de reserva ativa vencida ainda em aberto.
- A conferência do ledger SHALL considerar apenas os lançamentos que não são de
  pré-venda, porque venda futura vive em eixo próprio e não compõe o saldo disponível.
- O resultado SHALL ser registrado sempre, inclusive quando estiver tudo certo, para
  que a ausência de registro signifique rotina parada.
- A conferência SHALL apontar **quais** produtos divergem e por quanto, não apenas
  quantos.

**Edge cases:**
- Divergência em produto de loja inativa → fica fora do resultado, porque loja inativa não
  vende e o aviso competiria com divergência que afeta venda hoje. A conferência SHALL
  reavaliar o produto quando a loja voltar a ficar ativa, para que o saldo errado não
  reapareça na vitrine sem ninguém ter olhado.
- Conferência demora além da janela da rotina → o resultado parcial é registrado como
  falha, e não como sucesso com número incompleto.
- Produto sem centro de distribuição resolvível → contabilizado à parte, porque a causa
  é cadastro e não movimentação.

### US02: Aviso a uma pessoa quando um invariante quebra

Como operação do marketplace, quero ser avisada quando a conferência achar divergência
ou quando uma rotina de estoque deixar de rodar, para agir antes que o número errado
vire venda errada.

**Rules:**
- Divergência encontrada SHALL gerar aviso ao destinatário da operação, contendo o que
  quebrou, o tamanho da divergência e desde quando ela aparece.
- Rotina de estoque sem execução registrada em 24h SHALL gerar aviso, tratada como falha.
- Falha de envio do aviso NÃO SHALL ser silenciosa: uma tentativa frustrada precisa
  aparecer em algum lugar que alguém olhe.
- Divergência que persiste SHALL continuar avisando, sem supressão por repetição.

**Edge cases:**
- Provedor de e-mail recusa o destinatário → o aviso é registrado como não entregue e
  reaparece na conferência seguinte, em vez de sumir. É exatamente o que acontece hoje
  com o alerta de carrinho abandonado, que falha há dias sem ninguém saber.
- Destinatário da operação não configurado → a conferência ainda roda e registra, e a
  ausência de destinatário é ela própria uma pendência.
- Muitas divergências no mesmo dia → um aviso consolidado, e não um por produto, para
  que o volume não vire ruído ignorado.

### US03: Painel de saúde do estoque

Como operação do marketplace, quero ver num lugar só se as rotinas de estoque rodaram e
se os invariantes estão de pé, para responder "está tudo certo?" sem pedir consulta a
ninguém.

**Rules:**
- O painel SHALL mostrar, para cada rotina de estoque, quando rodou pela última vez e
  com que resultado.
- O painel SHALL mostrar o estado atual de cada invariante conferido e há quantos dias
  ele está assim.
- O painel SHALL destacar rotina que não roda há mais que o esperado, com a mesma
  gravidade de uma que falhou.
- O acesso SHALL ser restrito à operação do marketplace. O seller NÃO SHALL ver este
  painel: divergência de plataforma não é problema que ele possa resolver.

**Edge cases:**
- Nenhuma execução registrada ainda → o painel diz "nunca rodou", que é diferente de
  "rodou sem achar nada".
- Rotina removida do agendamento → deixa de ser cobrada no painel, mas o histórico dela
  permanece.

### US04: Exceção de estoque com dono e desfecho

Como operação do marketplace, quero que cada exceção registrada pelo estoque apareça
como pendência até alguém resolvê-la, para que registro não vire arquivo morto.

**Rules:**
- Exceção de estoque registrada SHALL aparecer como pendência aberta até receber um
  desfecho.
- O desfecho SHALL ser um entre: tratada, com o que foi feito; ou esperada, com a razão.
- Pendência aberta há mais que o prazo definido SHALL ser incluída no aviso diário.

**Edge cases:**
- Exceção do mesmo tipo repetida no mesmo produto → agrupada numa pendência com
  contagem, para não gerar fila artificial.
- Exceção marcada como esperada volta a acontecer depois de muito tempo → reabre como
  pendência nova, porque "esperado" descreve o caso conhecido, não licença permanente. O prazo
  de reabertura é de 90 dias sem nova ocorrência (premissa de prazo, ajustável).

## 4. Fluxo de Negócio

```
Rotina diária de conferência
   │
   ▼
Rodou dentro da janela?
   ├── não ──▶ Aviso de rotina parada ──▶ Pendência aberta
   └── sim ──▶ Invariantes batem?
                 ├── sim ──▶ Registra saúde ──▶ Painel mostra "ok, hoje"
                 └── não ──▶ Aviso com o que quebrou, quanto e desde quando
                                │
                                ▼
                          Pendência aberta
                                │
                                ▼
                       Operação dá desfecho?
                          ├── tratada ──▶ fecha, com o que foi feito
                          ├── esperada ─▶ fecha, com a razão
                          └── sem ação ─▶ volta no aviso do dia seguinte
```

## 5. Critérios de Aceite

### 5a. Critérios de aceite da feature

| Critério | Razão de negócio | Como verificar (observável) |
|---|---|---|
| Divergência introduzida de propósito é apontada na conferência seguinte, com produto e quantidade | Conferência que não nomeia o produto não permite agir | Criar divergência controlada em ambiente de teste e ler o resultado da conferência |
| Divergência gera aviso recebido por uma pessoa em até 24h | Acima disso o saldo errado atravessa um ciclo de vendas | Verificar o recebimento do aviso após a conferência |
| Rotina de estoque que não roda por mais de 24h gera aviso | Uma janela diária perdida já deixa o estoque sem conferência por um ciclo inteiro de vendas | Suspender a rotina em teste e observar o aviso |
| Conferência registra resultado também quando está tudo certo | Sem isso, silêncio de rotina parada é igual a silêncio de saúde | Consultar o registro após um dia sem divergência |
| Falha de entrega do aviso aparece como pendência | É a falha que hoje passa despercebida há dias | Forçar destinatário inválido e verificar a pendência |
| Painel responde "as rotinas rodaram e os invariantes batem?" sem consulta ao banco | O objetivo é tirar a operação da dependência de quem sabe SQL | Uma pessoa da operação responde a pergunta usando só o painel |

### 5b. Métricas de sucesso

| Métrica | Baseline (fonte) | Meta | Prazo | Mín. aceitável | Responsável |
|---|---|---|---|---|---|
| Eventos de estoque com resultado de alerta sem tratamento | 29 de 30 eventos registrados, nenhum tratado (`observabilidade_eventos`, 17/09/2026) | Menos de 3 abertos ao fim de cada semana | 30 dias após o Milestone 1 | Menos de 10 | Operação |
| Tempo entre a divergência surgir e alguém saber | Indeterminado hoje: não há conferência automática | Menor que 24h | 30 dias após o Milestone 1 | Menor que 72h | Operação |
| Dias com conferência de paridade registrada | 0 de 30 dias desde a entrada do ledger (conferência manual, feita por lembrança) | 100% dos dias | 30 dias após o Milestone 1 | 90% dos dias | Operação |
| Divergências de paridade encontradas em produção | 0 divergentes na conferência manual de 17/09/2026 | Permanece 0 | Contínuo | Qualquer divergência tratada em até 72h | Operação |
| Rotinas de estoque falhando em silêncio | 2 conhecidas (carrinho abandonado com destinatário inválido; ruptura com loja sem e-mail) | 0 | 30 dias após o Milestone 1 | 0 | Operação |

## 6. Milestones

### Milestone 1: A quebra avisa

**Por que é um marco:** é o momento em que o estoque deixa de depender de alguém
lembrar de conferir. A partir daqui, divergência de saldo e rotina parada chegam a uma
pessoa por conta própria, e as duas falhas que hoje se repetem em silêncio param de se
repetir em silêncio.

**Funcionalidades:** US01, US02

**Checklist de aceite** (marcado pelo Aprovador após a implementação):
- [ ] Divergência introduzida de propósito é apontada na conferência seguinte, com produto e quantidade
- [ ] Divergência gera aviso recebido por uma pessoa em até 24h
- [ ] Rotina de estoque que não roda por mais de 24h gera aviso
- [ ] Conferência registra resultado também quando está tudo certo
- [ ] Falha de entrega do aviso aparece como pendência

**Aprovador:** Dona do produto

### Milestone 2: A saúde é visível e a pendência tem dono

**Por que é um marco:** a operação passa a responder sozinha se o estoque está são, e
cada exceção registrada passa a ter desfecho. É o que transforma o registro, que hoje
só cresce, em fila de trabalho que fecha.

**Funcionalidades:** US03, US04

**Checklist de aceite** (marcado pelo Aprovador após a implementação):
- [ ] Painel responde "as rotinas rodaram e os invariantes batem?" sem consulta ao banco
- [ ] Exceção registrada aparece como pendência até receber desfecho
- [ ] Pendência aberta além do prazo entra no aviso diário

**Aprovador:** Dona do produto

## 7. Riscos e Dependências

| Risco | Impacto | Mitigação | Status |
|---|---|---|---|
| O aviso vira ruído e a operação passa a ignorá-lo, reproduzindo o problema atual em outro formato | Alto | Aviso consolidado, e alerta só para invariante quebrado ou rotina parada, nunca para atividade normal | Pendente |
| O provedor de e-mail continua recusando destinatários e o aviso não chega | Alto | Falha de entrega é pendência visível, não linha de log; o Milestone 1 não fecha sem isso verificado | Pendente |
| Conferência pesada demais para rodar sobre o catálogo inteiro conforme ele cresce | Médio | Registrar duração desde a primeira execução, para que o limite apareça antes de virar timeout | Pendente |
| Divergência real aparecer e ninguém saber o que fazer com ela | Médio | Cada aviso diz o que quebrou e desde quando; a decisão de correção é humana e registrada como desfecho | Pendente |

**Dependências:**

| Dependência | Tipo | Status | Impacto se bloqueado |
|---|---|---|---|
| PRD 036, ledger de estoque | Interna | Em produção desde 16/09/2026 | Sem o ledger não há invariante a conferir |
| PRD 038, alertas ao seller | Interna | Em produção desde 16/09/2026 | Reaproveita o padrão de alerta já existente; sem ele, o Milestone 1 precisa criá-lo |
| Definição do destinatário da operação | Externa | Em aberto | Bloqueia o Milestone 1: sem destinatário o aviso não tem para onde ir |
| Correção do destinatário inválido no alerta de carrinho abandonado | Interna | Corrigida em 17/09/2026, fora deste PRD | Resolvida antes do Milestone 1, para que a feature não nasça vigiando uma falha conhecida |

## 8. Referências

- [PRD 036, ledger de estoque multi-local](036-ledger-estoque-multi-local.md) — define a paridade que esta feature confere
- [PRD 038, ruptura de estoque e alertas ao seller](038-ruptura-de-estoque-e-alertas-ao-seller.md) — padrão de alerta e de supressão por estado, aqui deliberadamente não seguido
- `supabase/migrations/0175_estoque_ledger_milestone1.sql` — origem da paridade e da conferência de 30 dias que nunca aconteceu
- `supabase/migrations/0179_venda_futura_no_ledger_e_guardas.sql` — separa pré-venda do saldo e cria a exceção `estoque.sem_centro_resolvivel`

## 9. Registro de Decisões

- **2026-09-17:** A conferência é diária e não contínua. Motivo: a garantia de não vender o que não existe já vive na criação do pedido; o que falta é descobrir divergência em um dia em vez de descobrir por reclamação.
- **2026-09-17:** Alerta de invariante quebrado não é suprimido por repetição, ao contrário do alerta de ruptura ao seller. Motivo: no alerta ao seller a repetição é ruído, porque o estado não mudou; aqui a persistência é o próprio agravamento.
- **2026-09-17:** O sistema não corrige divergência automaticamente. Motivo: correção automática de saldo esconde a causa e pode transformar erro de leitura em perda real de mercadoria.
- **2026-09-17:** Rotina que não rodou é tratada como falha, e não como ausência de trabalho. Motivo: hoje silêncio de rotina parada é indistinguível de silêncio de rotina saudável, e foi assim que duas falhas ficaram dias sem ninguém ver.
- **2026-09-17:** `depends_on` fechado em 036 e 038. Critério: 036 define o invariante que esta feature confere, e 038 define o mecanismo de alerta que ela reaproveita. Os demais PRDs de estoque (039 custódia, 040 tarifação) tratam de operação do CD e cobrança, e nada nesta feature pressupõe comportamento deles.
