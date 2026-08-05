---
prd_number: "010"
status: em-progresso
priority: alta
created: 2026-08-05
issue: ""
depends_on: []
references:
  - "src/components/termos/gate.ts — mapa de documentos exigidos por painel (TERMOS_SELLER, TERMOS_AFILIADO), padrão a estender"
  - "src/components/termos/PortaoTermos.tsx, aceite-actions.ts — componente de opt-in e registro de aceite, referência de padrão"
  - "src/app/checkout/page.tsx:323-330, src/app/checkout/actions.ts:108 — padrão de opt-in pontual por transação (aceite_termos_mf), modelo mais próximo desta feature"
  - "src/app/termos/[slug]/page.tsx — renderização pública do conteúdo via paginas_cms"
  - "docs/prd/liquidacao-relampago-excedente.md — única menção prévia a produtos perecíveis/hortifruti no catálogo (aspiracional, ainda não semeado no schema)"
  - "docs/prds/009-pos-venda-disputas.md — módulo de disputas que passará a depender deste PRD para regras diferenciadas de item perecível"
---

# PRD 010: Termos e Regra de Produtos Perecíveis

## 1. Contexto

- **Produto/área**: Indústria 24h (industria24.com.br) — marketplace B2B industrial. Módulo transversal de checkout e catálogo, cobrindo produtos de natureza perecível (hortifruti, alimentos em geral).
- **Estado atual**: o catálogo já prevê a categoria de produtos perecíveis como aspiração de negócio (citada em `docs/prd/liquidacao-relampago-excedente.md`, "produtos perecíveis (já confirmados no catálogo, ex: hortifruti)"), mas **não existe hoje** nenhuma flag ou categoria semeada no schema (`produtos.categoria_id`/`subcategoria_id`) que marque um produto como perecível, nem termo de uso específico, nem regra de disputa diferenciada. O comprador que compra um item perecível hoje está sujeito às mesmas regras genéricas de qualquer outro produto.
- **Problema**: produto perecível tem janela de deterioração natural que não se aplica a produto industrial durável — sem regra própria, a plataforma fica exposta a dois riscos: (a) comprador reclamar semanas depois de um produto que naturalmente se deteriorou por decurso de tempo, gerando disputa indevida contra a loja; (b) comprador não ser avisado das particularidades do produto (validade curta, necessidade de conferência imediata no recebimento) antes de comprar.

> **Contexto técnico** (stack, RLS, modelo de dados) vive no TRD e no PLAN de implementação. Aqui só um ponteiro: a feature reaproveita a infraestrutura de termos já existente (`paginas_cms`, `aceites_termos`) e o padrão de opt-in pontual por transação já usado no checkout para o Mercado Futuro.

## 2. Solução Proposta

### Visão de produto

- Produto é marcado como perecível no cadastro (pela loja), o que ativa automaticamente as regras diferenciadas deste PRD para qualquer pedido que o contenha.
- Ao levar um item perecível ao checkout, o comprador vê um aviso e precisa marcar um checkbox de aceite de termo específico antes de conseguir finalizar a compra — mesmo padrão já usado para o termo de Mercado Futuro.
- O termo deixa explícito: validade curta, dever do comprador de conferir o produto no ato do recebimento, janela de reclamação reduzida, isenção da loja por deterioração natural pós-entrega, e o que a loja garante até a entrega (condições de transporte/armazenamento).
- O aceite fica registrado (data, versão do texto, pedido associado) e sinaliza ao módulo de disputa (PRD 009) que aquele pedido segue as regras diferenciadas de perecível — janela de disputa mais curta e exigência de foto no ato do recebimento.

### Decisões de produto

1. Um produto é marcado como perecível por uma flag própria `perecivel: boolean` no cadastro do produto, decidida pela loja no momento do cadastro — não por categoria automática *(premissa — confirme ou corrija; alternativa seria basear em categoria/subcategoria "Hortifruti", mas isso amarraria a regra à taxonomia do catálogo, que hoje não tem essa categoria semeada)*.
2. Termo de perecível é um documento único (`paginas_cms`, slug `termos-produtos-pereciveis`), não um termo por produto ou por loja *(premissa — mesma lógica do termo de Mercado Futuro, que é único para a plataforma)*.
3. Opt-in é **por pedido** (igual ao padrão `aceite_termos_mf` do checkout), não por conta — pois nem toda compra do comprador envolve item perecível.
4. Janela de disputa para pedido com item perecível é de **24h** após confirmação de entrega, substituindo os 7 dias padrão do PRD 009 *(premissa — confirme ou corrija; perecível se deteriora rápido, então o prazo de reclamação padrão não faz sentido)*.
5. Disputa de item perecível exige foto como evidência obrigatória (não opcional como no fluxo padrão) *(premissa)*.

> Nenhuma decisão arquitetural durável identificada. Reaproveita padrões já estabelecidos (termos + opt-in de checkout).

### Fora do escopo

- Automação de detecção de "produto perecível" por IA/análise de imagem — a marcação é manual, feita pela loja no cadastro.
- Logística especial de transporte refrigerado/cadeia de frio — tratar como PRD futuro se a operação exigir.
- Regra de validade/data de vencimento por lote de produto (rastreabilidade individual) — este PRD cobre o termo e a regra de disputa, não controle de estoque por validade.
- Alteração da UI de cadastro de produto além do campo/flag de perecível — o desenho completo da tela de cadastro é responsabilidade de implementação, não deste PRD.

## 3. Funcionalidades

### US01: Loja marcar produto como perecível no cadastro

Como loja (seller), quero marcar um produto como perecível ao cadastrá-lo, para que a plataforma aplique automaticamente o termo e as regras de disputa corretas a esse item.

**Rules:**
- Campo `perecivel` (boolean, default `false`) disponível no formulário de cadastro/edição de produto.
- Produto marcado como perecível aparece com um indicador visual na vitrine e na página do produto *(premissa — ex.: selo "Perecível", para o comprador já saber antes de comprar)*.
- Alterar um produto existente para perecível não afeta pedidos já feitos antes da mudança (regra aplicada é a vigente no momento da compra) *(premissa)*.

**Edge cases:**
- Loja tenta desmarcar `perecivel` de um produto com pedido em disputa aberta baseada na regra de perecível → bloqueado até a disputa ser resolvida *(premissa — evita mudar a regra no meio de um caso)*.

### US02: Comprador aceitar termo de perecível no checkout

Como comprador, quero ser avisado e precisar aceitar um termo específico ao comprar um produto perecível, para entender as particularidades do item antes de finalizar a compra.

**Rules:**
- Checkout detecta se o carrinho contém ao menos um item com `perecivel = true` e exibe o bloco de aceite (checkbox obrigatório + link para `/termos/termos-produtos-pereciveis`), mesmo padrão de `aceite_termos_mf`.
- Sem marcar o checkbox, o comprador não consegue finalizar o pedido (validação client e server, como o padrão existente).
- Aceite é registrado vinculado ao pedido (não só ao usuário), com data e versão do texto aceito *(premissa — necessário para auditoria caso o texto mude no futuro)*.
- Carrinho sem nenhum item perecível não exibe o bloco — comprador não é incomodado por termo irrelevante.

**Edge cases:**
- Carrinho tem item perecível e item comum juntos → comprador aceita um único termo cobrindo o pedido todo; regras diferenciadas de disputa (US03) se aplicam apenas às linhas perecíveis do pedido, não ao pedido inteiro *(premissa)*.
- Comprador tenta finalizar via alguma via alternativa que não passe pela tela de checkout padrão (se existir) → mesma validação server-side bloqueia, igual ao padrão do `aceite_termos_mf`.

### US03: Regras diferenciadas de disputa para item perecível

Como plataforma, quero aplicar regras de disputa diferentes para pedidos com item perecível, para refletir a natureza de deterioração rápida do produto e evitar disputas indevidas fora da janela útil de reclamação.

**Rules:**
- Para linha de pedido com produto `perecivel = true`, a janela de abertura de disputa é 24h após confirmação de entrega, substituindo os 7 dias do PRD 009 (US01) *(premissa)*.
- Disputa sobre item perecível exige ao menos 1 foto anexada no momento da abertura (obrigatório, diferente do fluxo padrão onde é opcional) *(premissa)*.
- Motivo de disputa ganha uma opção adicional específica: `produto_estragado_ou_vencido`, disponível apenas para itens perecíveis.
- Loja fica isenta de responsabilidade por deterioração ocorrida **após** a confirmação de entrega, desde que o comprador tenha tido a oportunidade de conferir no ato — isso é regra de arbitragem para o admin considerar, não um bloqueio automático de abertura de disputa *(premissa — o admin ainda avalia caso a caso, a regra apenas orienta a decisão)*.

**Edge cases:**
- Comprador tenta abrir disputa de item perecível após 24h da entrega → bloqueado, mesma UX de "prazo expirado" do PRD 009, com texto explicando o prazo reduzido por se tratar de produto perecível.
- Pedido tem itens perecíveis e não-perecíveis, comprador quer disputar só o item perecível → disputa é aberta por linha de item (já é o modelo do PRD 009: "vinculada a um pedido e opcionalmente a um item específico"), então a regra de 24h se aplica apenas àquela linha.

## 4. Fluxo de Negócio

```
Comprador adiciona item ao carrinho
   │
   ▼
Carrinho tem item com perecivel = true?
   ├── não ──▶ Checkout segue fluxo padrão
   └── sim ──▶ Checkout exibe termo + checkbox obrigatório
                    │
                    ▼
          Comprador aceita? ──┬── não ──▶ Bloqueado, não finaliza pedido
                               └── sim ──▶ Pedido criado, aceite registrado (pedido, data, versão)
                                                │
                                                ▼
                                    Entrega confirmada
                                                │
                                                ▼
                          Comprador tem 24h para abrir disputa da linha perecível
                                                │
                              ┌─────────────────┴─────────────────┐
                              ▼                                   ▼
                    Dentro do prazo, com foto            Fora do prazo
                    → segue fluxo padrão do PRD 009       → bloqueado
                      (US01-US04), com motivo
                      "produto_estragado_ou_vencido"
                      disponível
```

## 5. Critérios de Aceite

### 5a. Critérios de aceite da feature

| Critério | Razão de negócio | Como verificar (observável) |
|----------|------------------|-----------------------------|
| Checkout com item perecível não permite finalizar sem o checkbox de aceite marcado | Sem o opt-in, a plataforma não tem registro de que o comprador foi avisado das particularidades do produto | Tentar finalizar checkout com item perecível sem marcar o checkbox |
| Checkout sem nenhum item perecível não exibe o bloco de termo | Evita atrito desnecessário em compras que não envolvem o risco que o termo cobre | Finalizar checkout só com itens não perecíveis e verificar ausência do bloco |
| Disputa de item perecível não pode ser aberta após 24h da confirmação de entrega | Produto perecível se deteriora rápido; prazo padrão de 7 dias tornaria a reclamação inútil para avaliar o estado real na entrega | Tentar abrir disputa de item perecível 25h+ após entrega confirmada |
| Disputa de item perecível exige ao menos 1 foto para ser aberta | Evidência no ato é o único jeito de avaliar se o problema é de origem/transporte ou deterioração natural posterior | Tentar abrir disputa de item perecível sem anexar foto |

### 5b. Métricas de sucesso

| Métrica | Baseline (fonte) | Meta | Prazo | Mín. aceitável | Responsável |
|---------|-------------------|------|-------|-----------------|-------------|
| % de disputas de item perecível abertas dentro da janela de 24h com foto válida | A levantar — não existe dado hoje, feature nova | 90% | 90 dias após lançamento | 75% | Time de produto |
| % de disputas de item perecível decididas a favor da loja por deterioração pós-entrega (indicador de que a regra está funcionando como isenção justa) | A levantar | — (métrica de acompanhamento, sem meta fixa) | — | — | Time de produto |

## 6. Milestones

### Milestone 1: Loja marca produto e comprador aceita termo no checkout

**Por que é um marco:** entrega o par mínimo que já protege a plataforma — produto sinalizado + comprador avisado e com aceite registrado — mesmo antes de qualquer disputa acontecer.

**Funcionalidades:** US01, US02

**Checklist de aceite** (marcado pelo Aprovador após a implementação):
- [x] Loja consegue marcar/desmarcar um produto como perecível no cadastro *(verificado ao vivo em produção — "Jambu Pré Cozido 1kg", loja Hidropônicos Buriti)*
- [x] Checkout com item perecível exibe o bloco de opt-in com checkbox exigido (`required`) *(verificado ao vivo — bloqueio real de submissão sem marcar não foi re-testado após o marcar)*
- [ ] Checkout sem nenhum item perecível não exibe o bloco de termo *(não testado nesta rodada)*
- [ ] Aceite fica registrado vinculado ao pedido, com data e versão do texto *(não testado — nenhuma compra real foi finalizada via Asaas nesta rodada)*

**Aprovador:** Dono do produto (Indústria24h)

### Milestone 2: Regras diferenciadas de disputa para item perecível

**Por que é um marco:** fecha o ciclo — sem isso, o termo aceito no checkout não teria efeito prático nenhum na hora em que realmente importa, que é a disputa.

**Funcionalidades:** US03

**Checklist de aceite** (marcado pelo Aprovador após a implementação):
- [ ] Disputa de item perecível não pode ser aberta após 24h da confirmação de entrega *(lógica coberta por teste unitário; não testado ao vivo com item fora da janela)*
- [x] Disputa de item perecível exige ao menos 1 foto para ser aberta *(verificado ao vivo — campo obrigatório, foto de fato enviada e persistida no storage)*
- [x] Motivo "produto_estragado_ou_vencido" disponível apenas para itens perecíveis *(verificado ao vivo — opção apareceu e foi usada na disputa de teste)*

**Aprovador:** Dono do produto (Indústria24h)

## 7. Riscos e Dependências

| Risco | Impacto | Mitigação | Status |
|-------|---------|-----------|--------|
| Janela de 24h proposta pode ser curta ou longa demais dependendo do tipo real de perecível vendido (verdura vs. alimento processado com validade maior) | Médio | Validar com o dono do produto antes de implementar; considerar se precisa ser configurável por produto no futuro | Pendente |
| Loja marcar produto como perecível incorretamente (ou deixar de marcar um que deveria) | Médio | Fora de escopo automatizar detecção; mitigação é curadoria/admin poder corrigir a flag se notar erro recorrente | Pendente |

**Dependências:**

| Dependência | Tipo | Status | Impacto se bloqueado |
|-------------|------|--------|----------------------|
| Módulo de disputas (PRD 009) | Interna | Rascunho | US03 deste PRD só faz sentido depois que o fluxo padrão de disputa (PRD 009) existir — a US03 é uma regra condicional sobre ele. Este PRD (010) não lista 009 em `depends_on` porque a relação de implementação é o inverso: é o PRD 009 que precisará referenciar este documento para aplicar a regra condicional quando o pedido tiver item perecível |
| Padrão de opt-in de checkout (`aceite_termos_mf`) | Interna | Em produção | Sem ele, seria necessário desenhar um mecanismo de opt-in por transação do zero |

## 8. Referências

- `docs/prd/liquidacao-relampago-excedente.md` — única menção prévia a produtos perecíveis/hortifruti no catálogo da Indústria24h.
- `docs/prds/009-pos-venda-disputas.md` — módulo de disputas que deve passar a referenciar este PRD para aplicar as regras condicionais de item perecível.
- `src/app/checkout/page.tsx:323-330`, `src/app/checkout/actions.ts:108` — padrão de opt-in por transação reaproveitado.

## 9. Registro de Decisões

- **2026-08-05:** `depends_on` deste PRD ficou vazio propositalmente — a relação de dependência é inversa: é o PRD 009 (pós-venda/disputas) que dependerá deste PRD 010 para aplicar a regra condicional de item perecível (janela de 24h, foto obrigatória, motivo específico), não o contrário. Este PRD (010) precisa existir de forma independente do 009 porque o termo e a marcação de produto como perecível têm valor mesmo isoladamente (US01 e US02 não dependem de disputa existir).
- **2026-08-05:** Marcação de produto como perecível será uma flag própria (`perecivel: boolean`) decidida pela loja no cadastro, não uma inferência automática por categoria. Motivo: o catálogo ainda não tem categoria "Hortifruti"/"Alimentos" semeada no schema atual, e amarrar a regra à taxonomia do catálogo criaria acoplamento desnecessário — a loja sabe melhor que o produto dela é perecível do que uma inferência por categoria.
- **2026-08-05:** Janela de disputa de item perecível proposta em 24h (vs. 7 dias do fluxo padrão) e exigência de foto obrigatória (vs. opcional no padrão) — ambas marcadas como premissa a validar, pois não há dado histórico da operação para calibrar esse prazo.
- **2026-08-05:** Migration 0104 aplicada em produção; código mergeado em `master` (PR #229) e deployado em `industria24.com.br`. Milestone 1 (flag perecível + checkout) e a exigência de foto/motivo de US03 foram testados ao vivo com produto real (Jambu Pré Cozido 1kg, loja Hidropônicos Buriti). O bloqueio de janela de 24h vencida e o carimbo de aceite por pedido não foram exercitados ao vivo — cobertos por teste unitário (`src/lib/disputas.ts`) e pela RPC `carimbar_aceite_pereciveis`, mas recomenda-se validação manual com uma compra real antes de considerar o Milestone 1 totalmente aceito.
