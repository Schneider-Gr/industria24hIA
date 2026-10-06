---
prd_number: "060"
status: rascunho
priority: média
created: 2026-10-05
issue: ""
depends_on: ["058", "059", "001"]
references:
  - "docs/prds/058-rastreio-da-entrega-em-tempo-real.md" – rastreio que mostra a posição do comprador na rota
  - "docs/prds/059-zonas-de-servico-do-entregador.md" – zona usada para agrupar pedidos no mesmo lote
  - "docs/prds/001-confirmacao-entrega-por-codigo-do-comprador.md" – código por parada
  - "supabase/migrations/0074_consolidacao_carga_rota.sql" – consolidação de carga existente (lote manual, mesma loja, corredor de CEP, 30% de desconto)
  - "openspec/changes/entregador-rastreio-zonas-rotas/specs/entrega-rotas-multiplas-paradas/spec.md" – cenários
  - "openspec/changes/entregador-rastreio-zonas-rotas/design.md" – D5
---

# PRD 060: Rota com várias entregas

## 1. Contexto

- **Produto/área**: logística do marketplace (Manaus), frete consolidado.
- **Estado atual** (verificado no código em 05/10/2026):
  - A consolidação de carga já existe: o comprador opta no checkout por frete consolidado (30% de desconto, sai na próxima janela) e o admin monta à mão um lote com pedidos da mesma loja e do mesmo corredor de CEP. O lote vira uma corrida só.
  - O lote não tem ordem de paradas: o entregador decide a sequência sozinho.
  - O admin precisa achar os pedidos agrupáveis olhando a lista.
  - O comprador de um pedido em lote não sabe quantas entregas vêm antes da dele.
- **Problema**: montar lote dá trabalho, então o desconto de frete consolidado é pouco usado. A rota sai da cabeça do entregador, e o comprador espera sem previsão.

## 2. Solução Proposta

### Visão de produto

- O sistema sugere os lotes prontos (mesma loja, mesma zona) e o admin só aprova.
- A rota sai com as paradas já na melhor ordem e a previsão de chegada de cada uma.
- O entregador segue parada por parada, e cada uma fecha com o código daquele comprador.
- O comprador vê "faltam N entregas antes da sua" junto do mapa do rastreio.

### Decisões de produto

1. **Lote = uma loja, uma coleta** (premissa P3 aceita pela dona em 05/10/2026). Coleta em várias lojas fica fora.
2. **Sugestão automática, aprovação humana.** O admin continua dando o OK, como na consolidação atual.
3. **Agrupamento pela zona de serviço** (PRD 059) no lugar do corredor de 3 dígitos do CEP.
4. **Cada parada fecha com o código do respectivo comprador** e libera o repasse daquele pedido.
5. **Comprador ausente não trava a rota**: a parada sai como falha, o pedido volta para o seller e o entregador segue.
6. **O comprador não vê dados dos outros compradores do lote**, só quantas entregas faltam antes da dele.
7. **Desconto e repasse do frete consolidado ficam como estão** (0074).

### Fora do escopo

- Coleta em mais de uma loja no mesmo lote (decisão 1).
- Montagem automática sem aprovação do admin.
- Reordenar a rota no meio do caminho por trânsito. *(premissa, confirme ou corrija)*
- Mudar o desconto de 30% do frete consolidado.

## 3. Funcionalidades

### US01: Admin recebe lotes sugeridos

Como admin, quero ver os lotes já montados pelo sistema, para aprovar com um clique em vez de garimpar pedidos.

**Rules:**
- Entram pedidos pagos com frete consolidado, da mesma loja, com destino na mesma zona, dentro da janela configurada.
- A sugestão mostra os pedidos, a rota proposta e o frete somado.
- Aprovado, o lote vira uma corrida só, com as regras de aceite, exclusividade e repasse da consolidação atual.

**Edge cases:**
- Só um pedido elegível → não há sugestão; o pedido segue o fluxo normal.
- Pedidos de lojas diferentes → nunca no mesmo lote.
- Pedido cancelado depois da sugestão e antes da aprovação → sai do lote ao aprovar.

### US02: Rota com as paradas na melhor ordem

Como entregador, quero receber o lote com as paradas já ordenadas e o horário previsto de cada uma, para rodar menos e avisar o comprador certo.

**Rules:**
- A ordem parte do endereço de coleta da loja e minimiza o trajeto total.
- Cada parada tem previsão de chegada.
- A tela do entregador mostra a parada atual e as próximas.

**Edge cases:**
- Serviço de rotas fora do ar → lote criado na ordem de chegada dos pedidos, com aviso ao admin de que a rota não foi otimizada.
- Lote acima do limite de paradas que a otimização suporta → sugestão dividida em lotes menores.

### US03: Cada parada fecha com o código do comprador

Como entregador, quero confirmar cada entrega com o código daquele comprador, para receber por cada uma sem esperar o fim da rota.

**Rules:**
- O código correto confirma aquele pedido, dispara o repasse dele e avança para a próxima parada.
- O entregador pode marcar falha de entrega (comprador ausente, endereço não encontrado).
- A corrida do lote termina quando todas as paradas foram confirmadas ou marcadas como falha.

**Edge cases:**
- Código errado → a parada não fecha; vale o limite de tentativas do PRD 001.
- Parada marcada como falha → o pedido volta para tratamento do seller e as demais seguem.
- Entregador confirma fora da ordem → aceito; a ordem é sugestão, não trava.

### US04: Comprador vê sua posição na rota

Como comprador de um pedido em lote, quero saber quantas entregas vêm antes da minha, para ter uma expectativa real de chegada.

**Rules:**
- Junto do mapa do rastreio (PRD 058), aparece "faltam N entregas antes da sua" e a previsão da sua parada.
- O número cai a cada parada resolvida antes da dele.

**Edge cases:**
- Parada anterior marcada como falha → conta como resolvida.
- Sua parada é a próxima → "você é a próxima entrega".
- Comprador tenta ver outros endereços do lote → nada além da contagem é exibido.

## 4. Fluxo de Negócio

```
Pedidos pagos com frete consolidado (mesma loja, mesma zona)
   │
   ▼
2+ pedidos na janela? ──não──▶ fluxo normal de entrega
   │sim
   ▼
Sugestão de lote ──▶ admin aprova? ──não──▶ pedidos seguem soltos
   │sim
   ▼
Rota ordenada ──▶ entregador aceita ──▶ parada atual
   │
   ▼
Código correto? ──sim──▶ pedido entregue + repasse ──▶ próxima parada
   │não / ausente
   ▼
Falha de entrega ──▶ pedido volta ao seller ──▶ próxima parada
   │
   ▼
Todas resolvidas ──▶ corrida do lote entregue
```

## 5. Critérios de Aceite

### 5a. Critérios de aceite da feature

| Critério | Razão de negócio | Como verificar (observável) |
|----------|------------------|-----------------------------|
| Admin vê sugestão com 2+ pedidos da mesma loja e zona | Tira o trabalho manual que trava a consolidação | Criar 3 pedidos consolidados elegíveis e abrir o admin |
| Pedidos de lojas diferentes nunca no mesmo lote | Uma coleta por lote | Pedidos de 2 lojas na mesma zona |
| Rota aprovada tem ordem e previsão por parada | Entregador roda menos | Abrir o lote na tela do entregador |
| Falha do serviço de rotas não impede o lote | Pedido pago não pode parar | Simular indisponibilidade |
| Cada parada fecha com o próprio código e libera o repasse dela | Entregador recebe por entrega | Confirmar 1 de 3 paradas e conferir o repasse |
| Falha numa parada não trava as outras | Comprador ausente é comum | Marcar falha na 1ª parada |
| Comprador vê "faltam N entregas antes da sua" sem dados dos outros | Expectativa e privacidade | Abrir o pedido da 3ª parada |

### 5b. Métricas de sucesso

| Métrica | Baseline (fonte) | Meta | Prazo | Mín. aceitável | Responsável |
|---------|-------------------|------|-------|-----------------|-------------|
| Pedidos com frete consolidado que entram em lote | A levantar no banco (lotes_consolidacao, últimos 60 dias) | 70% | 60 dias após o Milestone 1 | 40% | Dona |
| Tempo entre pagamento e aprovação do lote | A levantar | −50% | 60 dias após o Milestone 1 | −25% | Dona |

## 6. Milestones

### Milestone 1: Lote sugerido com rota otimizada

**Por que é um marco:** o admin para de montar lote à mão e o entregador recebe a rota pronta; anuncia-se como "rotas automáticas".

**Funcionalidades:** US01, US02

**Checklist de aceite** (marcado pelo Aprovador após a implementação):
- [ ] Sugestão com 2+ pedidos da mesma loja e zona
- [ ] Nunca mistura lojas
- [ ] Ordem e previsão por parada
- [ ] Lote criado mesmo com o serviço de rotas fora

**Aprovador:** dona

### Milestone 2: Entrega parada por parada, com o comprador informado

**Por que é um marco:** cada comprador recebe e é avisado na sua vez, e o entregador recebe por entrega.

**Funcionalidades:** US03, US04

**Checklist de aceite** (marcado pelo Aprovador após a implementação):
- [ ] Código por parada libera o repasse daquele pedido
- [ ] Falha numa parada não trava as outras
- [ ] "Faltam N entregas antes da sua" sem dados de outros compradores

**Aprovador:** dona

## 7. Riscos e Dependências

| Risco | Impacto | Mitigação | Status |
|-------|---------|-----------|--------|
| Volume baixo de frete consolidado não forma lotes | Alto | Medir antes (5b); manter fluxo normal quando não houver lote | Pendente |
| Custo e limite de paradas da otimização de rota | Médio | Conferir na documentação oficial antes da implementação; dividir lotes grandes | Pendente |
| Repasse por parada divergir do repasse consolidado atual | Alto | Manter a regra da 0074 e testar com pedidos reais em rollback | Pendente |

**Dependências:**

| Dependência | Tipo | Status | Impacto se bloqueado |
|-------------|------|--------|----------------------|
| PRD 059, zonas de serviço | Interna | Rascunho | US01 (sem zona, volta ao corredor de CEP) |
| PRD 058, rastreio | Interna | Milestone 1 em produção | US04 |
| PRD 001, código de entrega | Interna | Em produção | US03 |

## 8. Referências

- [PRD 058](./058-rastreio-da-entrega-em-tempo-real.md): rastreio.
- [PRD 059](./059-zonas-de-servico-do-entregador.md): zonas de serviço.
- [PRD 001](./001-confirmacao-entrega-por-codigo-do-comprador.md): código de entrega.
- [Migration 0074](../../supabase/migrations/0074_consolidacao_carga_rota.sql): consolidação de carga existente.
- [Spec OpenSpec de rotas](../../openspec/changes/entregador-rastreio-zonas-rotas/specs/entrega-rotas-multiplas-paradas/spec.md): cenários.

## 9. Registro de Decisões

- **2026-10-02:** dona pediu várias entregas na mesma rota com roteirização. Motivo: brainstorm do Fleetbase.
- **2026-10-05:** lote com uma loja só. Motivo: premissa P3 aceita pela dona; várias coletas complicam rota e repasse.
- **2026-10-05:** evoluir a consolidação 0074 em vez de criar fluxo novo. Motivo: lote, corrida única e repasse já existem e funcionam.
- **Dependências:** 059 porque o agrupamento usa a zona; 058 porque a US04 aparece no rastreio; 001 porque cada parada fecha com o código.
