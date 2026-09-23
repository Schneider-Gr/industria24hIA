---
prd_number: "045"
status: rascunho
priority: alta
created: 2026-09-22
issue: ""
depends_on: ["003", "004", "030"]
references:
  - docs/prds/003-banners-destaque-admin-e-gap-ux-mobile.md
  - docs/prds/004-continuacao-redesign-vitrine-header-venda-futura-lp-seller.md
  - docs/prds/030-vitrine-proximidade-geolocalizacao.md
  - PRODUCT.md
  - DESIGN.md
  - docs/spec-impeccable-home.md
---

# PRD 045: Navegação da vitrine por mecanismos de economia

## 1. Contexto

- **Produto/área**: vitrine do comprador (home) do marketplace Indústria 24h.
- **Estado atual**: a home lista produtos em trilhos e blocos, mas os cinco mecanismos que fazem o comprador pagar menos ficam espalhados e sem porta de entrada própria. Compra coletiva não tinha nenhuma entrada no corpo da home, só no cabeçalho. Venda Futura aparecia em cinco lugares diferentes, o que abafava os outros mecanismos. A seção de lojas chamava "indústrias locais" e listava loja de outro estado e loja de teste sem produto.
- **Problema**: o comprador entra na home sem entender de quantas formas pode economizar, e sai com a impressão de um catálogo desorganizado. A crítica de UX de 19/09 deu 22/40 nas heurísticas de Nielsen, com o menor resultado justamente em "estética e minimalismo" (13 seções empilhadas) e em "reconhecer em vez de lembrar".

> Contexto técnico (stack, cache, região) vive no TRD e nos ADRs. Aqui só o comportamento.

## 2. Solução Proposta

### Visão de produto

- Uma porta por mecanismo de economia logo abaixo do banner: desconto por volume, venda futura, compra coletiva, direto da fábrica e entrega 24h. Cada porta leva ao destino correspondente.
- Venda Futura deixa de ocupar cinco pontos da página e passa a um bloco único: explicação curta, datas disponíveis e dúvidas frequentes.
- A seção de lojas mostra apenas indústrias que entregam no CEP informado, e o título passa a dizer isso.
- A primeira dobra do celular prioriza banner e categorias; o que é apoio (chips do topo, cronômetro de ofertas, título redundante) sai de lá.

### Decisões de produto

1. **Cinco portas, não quatro nem seis.** A dona confirmou os cinco mecanismos em 18/09, incluindo compra coletiva, que não tinha entrada própria.
2. **Venda Futura mantém a identidade roxa própria**, como sub-marca, mesmo sendo exceção à regra de paleta do DESIGN.md. Decisão da dona em 19/09.
3. **Lojas sem produto para o CEP não aparecem.** Chamar de "locais" uma loja de Porto Alegre para um comprador de Manaus contradiz a promessa de entrega.
4. **Categorias aparecem sempre**, mesmo sem produto no CEP: servem de navegação e de sinal de sortimento. Correção da dona em 19/09, depois de uma primeira versão que as filtrava.

### Fora do escopo

- Busca, filtros e ordenação dentro de categoria: já cobertos por outros PRDs.
- Personalização por comportamento do comprador: é o PRD 046.
- Conteúdo dos banners de "Destaques da indústria", que é cadastrado pelo admin (PRD 003).
- Remoção das lojas de teste do banco *(premissa — confirme ou corrija: é limpeza de dados, não de produto)*.

## 3. Funcionalidades

### US01: Portas de economia na home

Como comprador, quero ver de quantas formas posso pagar menos, para escolher a que serve ao meu caso.

**Rules:**
- A faixa exibe as cinco portas logo abaixo do banner, em qualquer largura de tela.
- Cada porta leva ao seu destino: desconto por volume e entrega 24h para trilhos da própria home, venda futura para o bloco da venda futura, compra coletiva para a página de coletivas e direto da fábrica para a seção de indústrias.
- No celular as cinco portas aparecem sem rolagem horizontal; o texto de apoio de cada porta só aparece a partir do desktop.

**Edge cases:**
- Comprador sem CEP informado → a faixa continua visível, porque explica a proposta antes de ele digitar o CEP *(premissa — confirme ou corrija)*.
- Destino sem conteúdo no momento (ex.: nenhuma oferta com desconto por volume) → a porta continua clicável e leva à seção, que mostra seu próprio estado vazio *(premissa — confirme ou corrija)*.

### US02: Venda Futura em bloco único

Como comprador, quero entender a venda futura em um só lugar, para não reler a mesma explicação três vezes.

**Rules:**
- A home apresenta a venda futura uma única vez: chamada com a proposta, datas disponíveis com os produtos de cada data e dúvidas frequentes.
- O trilho separado que repetia os mesmos produtos deixa de existir.
- A identidade visual roxa vale só dentro deste bloco.

**Edge cases:**
- Nenhuma data com estoque disponível → o bloco inteiro some da home, em vez de exibir uma grade vazia.
- Produto de venda futura fora da faixa de CEP → não aparece no bloco, mesma regra de cobertura do restante da vitrine.

### US03: Indústrias que entregam no CEP

Como comprador, quero ver quem fabrica e entrega para mim, para confiar na promessa de entrega.

**Rules:**
- Com CEP informado, a seção lista apenas lojas com ao menos um produto visível para aquele CEP, e o título diz "Indústrias que entregam no seu CEP".
- Sem CEP informado, a seção lista as lojas da plataforma e o título diz "Indústrias da plataforma".
- Cada loja aparece como card com logo, nome e localização, clicável para a página da loja.

**Edge cases:**
- Nenhuma loja com produto para o CEP → a seção exibe texto explicando que nada chega àquele CEP ainda *(premissa — confirme ou corrija)*.
- Loja sem logo cadastrado → mostra a inicial do nome no lugar da imagem.

### US04: Primeira dobra do celular

Como comprador no celular, quero ver oferta logo de cara, para não gastar a tela com rótulo.

**Rules:**
- No celular, a ordem abaixo do banner é: categorias, depois portas de economia.
- Chips de categoria no topo, cronômetro de ofertas e o título "Categorias" não aparecem no celular; no desktop permanecem.
- O selo "24h Aberto" fica na base do banner e não cobre a arte principal.

**Edge cases:**
- Banner cadastrado com arte vertical → a proporção do slot é fixa e a arte é ajustada para caber inteira, sem corte *(premissa — confirme ou corrija)*.
- Comprador sem CEP no celular → o portão de CEP continua tendo prioridade sobre tudo o que está descrito aqui.

## 4. Fluxo de Negócio

```
Comprador abre a home
   │
   ▼
Tem CEP informado?
   ├── não ─▶ Portão de CEP ─▶ (informa CEP) ─┐
   └── sim ──────────────────────────────────┤
                                              ▼
                             Banner + categorias + 5 portas
                                              │
                        ┌─────────────────────┼─────────────────────┐
                        ▼                     ▼                     ▼
               Desconto por volume      Venda futura          Compra coletiva
                  (trilho da home)     (bloco único)        (página /coletivas)
                        │                     │                     │
                        └─────────────────────┴─────────────────────┘
                                              ▼
                              Indústrias que entregam no CEP
```

## 5. Critérios de Aceite

### 5a. Critérios de aceite da feature

| Critério | Razão de negócio | Como verificar (observável) |
|---|---|---|
| As cinco portas aparecem na home e cada uma leva ao destino declarado | Compra coletiva não tinha entrada; mecanismo sem porta não é usado | Abrir a home e clicar nas cinco, conferindo o destino |
| No celular as cinco portas são visíveis sem rolagem horizontal | A 3ª porta ficava cortada e as 2 últimas invisíveis | Abrir a home em 390px e contar as portas visíveis |
| Venda futura aparece uma única vez na home | Repetida, abafava os outros quatro mecanismos | Contar as ocorrências do bloco na página |
| Com CEP informado, toda loja listada tem ao menos um produto visível para aquele CEP | Prometer entrega de quem não entrega quebra confiança | Conferir cada loja listada contra os produtos exibidos |
| A home não exibe mensagem de erro técnica ao comprador | Mensagem de banco na vitrine assusta e não ajuda | Forçar erro de leitura e conferir o texto exibido |

### 5b. Métricas de sucesso

| Métrica | Baseline (fonte) | Meta | Prazo | Mín. aceitável | Responsável |
|---|---|---|---|---|---|
| Nota das heurísticas de Nielsen na home | 22/40 (crítica impeccable, 19/09) | 30/40 | 30 dias após a entrega | 27/40 | Dona do produto |
| Altura total da home no celular | 5.820px (medição 18/09) | ≤ 4.500px | Na entrega | ≤ 5.000px | Dona do produto |
| Cliques em compra coletiva vindos da home | A levantar (sem instrumentação hoje; responsável: dona; prazo: 15 dias) | Crescimento sobre o baseline | 30 dias após o baseline | Qualquer volume acima de zero | Dona do produto |

## 6. Milestones

### Milestone 1: Abrir uma porta por mecanismo de economia

**Por que é um marco:** o comprador passa a enxergar, na primeira tela, as cinco formas de pagar menos, incluindo compra coletiva, que antes não tinha entrada nenhuma na home.

**Funcionalidades:** US01

**Checklist de aceite:**
- [ ] As cinco portas aparecem e levam ao destino declarado
- [ ] No celular as cinco são visíveis sem rolagem horizontal

**Aprovador:** dona do produto

### Milestone 2: Enxugar a home e dizer a verdade sobre quem entrega

**Por que é um marco:** a página encolhe, a venda futura deixa de se repetir e a seção de lojas passa a refletir a promessa de entrega.

**Funcionalidades:** US02, US03

**Checklist de aceite:**
- [ ] Venda futura aparece uma única vez na home
- [ ] Toda loja listada tem produto visível para o CEP informado
- [ ] A home não exibe mensagem de erro técnica ao comprador

**Aprovador:** dona do produto

### Milestone 3: Primeira dobra do celular dedicada a produto

**Por que é um marco:** no aparelho em que a maioria compra, a tela inicial passa a mostrar banner, categorias e portas em vez de rótulos e barras de apoio.

**Funcionalidades:** US04

**Checklist de aceite:**
- [ ] No celular, categorias vêm logo abaixo do banner
- [ ] Chips do topo, cronômetro e título de categorias não aparecem no celular
- [ ] A altura total da home no celular fica dentro da meta de 5b

**Aprovador:** dona do produto

## 7. Riscos e Dependências

| Risco | Impacto | Mitigação | Status |
|---|---|---|---|
| Esconder o cronômetro de ofertas no celular reduz senso de urgência | Médio | A porta "desconto por volume" continua levando ao trilho de ofertas; medir cliques antes de decidir reverter | Monitorando |
| Filtrar lojas pelo CEP faz a seção parecer pequena onde há pouca cobertura | Médio | O texto do título explica o critério; captação de sellers por região segue em outro PRD | Monitorando |
| Loja de teste com produto real continua visível ao comprador | Alto | Limpeza de dados pela dona; não há marcação de "loja de teste" no banco | Pendente |

**Dependências:**

| Dependência | Tipo | Status | Impacto se bloqueado |
|---|---|---|---|
| Cobertura por faixa de CEP (PRD 030) | Interna | Em produção | Sem ela, US03 não tem critério para listar loja |
| Banners de destaque cadastrados pelo admin (PRD 003) | Interna | Em produção | Sem eles a home perde um bloco, mas as portas seguem |

## 8. Referências

- [PRODUCT.md](../../PRODUCT.md) — posicionamento com os cinco mecanismos de economia
- [DESIGN.md](../../DESIGN.md) — paleta, exceção do roxo da Venda Futura e regras de tipografia
- [docs/spec-impeccable-home.md](../spec-impeccable-home.md) — spec de execução da revisão de design da home
- [PRD 030](030-vitrine-proximidade-geolocalizacao.md) — cobertura e proximidade por CEP, base da US03
- [PRD 004](004-continuacao-redesign-vitrine-header-venda-futura-lp-seller.md) — redesign anterior do header e da venda futura

## 9. Registro de Decisões

- **2026-09-18:** Adotados cinco mecanismos de economia como eixo de navegação da home. Motivo: compra coletiva não tinha entrada própria e os outros quatro competiam sem hierarquia.
- **2026-09-19:** Venda Futura reduzida a um bloco único, mantendo a identidade roxa. Motivo: ocupava cinco pontos da página e abafava os demais mecanismos; a dona optou por preservar a cor como sub-marca.
- **2026-09-19:** Seção de lojas passa a filtrar por cobertura de CEP e muda de título. Motivo: listava loja de outro estado sob o rótulo "indústrias locais".
- **2026-09-19:** Categorias deixam de ser filtradas por CEP. Motivo: correção da dona; a categoria serve de navegação mesmo sem produto disponível naquele CEP.
- **2026-09-22:** Primeira dobra do celular sem chips, sem cronômetro e sem o título de categorias. Motivo: pedido da dona para dar a tela inicial ao produto.
- **2026-09-22:** `depends_on` fixado em 003, 004 e 030. Critério: US03 pressupõe a regra de cobertura do 030; a home herda o header e o bloco de venda futura do 004 e os banners cadastráveis do 003.
