---
prd_number: "033"
status: rascunho
priority: alta
created: 2026-09-11
issue: ""
depends_on: ["004"]
references:
  - "https://github.com/Schneider-Gr/industria24hIA/pull/596"
  - "https://github.com/Schneider-Gr/industria24hIA/pull/598"
  - "https://github.com/Schneider-Gr/industria24hIA/issues/595"
  - "https://github.com/Schneider-Gr/industria24hIA/issues/597"
  - "docs/prds/003-banners-destaque-admin-e-gap-ux-mobile.md"
  - "docs/prds/004-continuacao-redesign-vitrine-header-venda-futura-lp-seller.md"
  - "web/DESIGN.md"
---

# PRD 033: Navegação mobile da vitrine

## 1. Contexto

- **Produto/área**: vitrine do comprador (home e páginas públicas com tab bar), no celular.
- **Estado atual** (master `950503a`, 11/09/2026):
  - O topo fixo mostra logo, ícones de CEP/conta/menu e a barra de busca. A faixa de chips
    (Categorias, Meus Pedidos, Ofertas, Venda Futura, Compras coletivas) saiu do mobile no PR #598.
  - A tab bar inferior fixa tem Início, Categorias, Carrinho e Pedidos. O botão flutuante de
    atendimento (FAB amarelo) fica logo acima dela.
  - Ofertas, Venda Futura e Compras coletivas continuam acessíveis pelo menu hambúrguer
    (`MenuMais`), a dois toques. Na home, não há atalho visível para essas seções.
  - Cards de Venda Futura ocupam 45% da largura (#596), e o selo "Envio de" (só aparece no hover) não
    reserva mais espaço no toque (#598).
- **Problema**: com o topo e a base fixos, sobra pouca altura útil para os produtos durante a rolagem.
  A dona do produto reportou em duas capturas de tela (11/09) que a imagem do produto ocupava a tela
  inteira, que o espaço branco era excessivo e que a navegação no topo tomava espaço demais. O PRD 003
  já registrava que a UX mobile nunca tinha sido auditada. Este PRD especifica esse trabalho.

> Contexto técnico (stack, tokens de design) vive no TRD e em `web/DESIGN.md`.

## 2. Solução Proposta

### Visão de produto

- A navegação fixa sai do caminho enquanto o comprador rola para ver produtos e volta quando ele
  sinaliza que quer navegar (rolagem para cima).
- As seções de campanha (Ofertas, Venda Futura, Compras coletivas) ficam a um toque na própria home,
  sem ocupar espaço fixo no topo.
- Todo trilho de produtos da home segue o mesmo padrão de densidade no celular: cerca de 2 cards
  visíveis e nenhum espaço reservado para elemento invisível.

### Decisões de produto

1. **A tab bar inferior é a navegação primária no mobile.** Ela nunca some. O topo pode recolher,
   porque a tab bar já cobre Início, Categorias, Carrinho e Pedidos.
2. **A faixa de chips não volta ao topo fixo do mobile.** O acesso às campanhas migra para dentro do
   conteúdo da home (US02). Isso revisa a decisão 6 do PRD 004. Aquele PRD corrigiu a falta de acesso
   no mobile com chips no topo, e agora o acesso é garantido pelo hambúrguer e pelo atalho na home.
3. **Nenhum elemento que só aparece no hover ocupa espaço no toque.** Isso vale para qualquer card da
   vitrine, porque em tela de toque o hover não existe.

### Fora do escopo

- Desktop e tablet (≥ 768px): o comportamento atual se mantém.
- Áreas com layout próprio (`/admin`, `/seller`, `/afiliado`, `/parceiro`), que não têm tab bar.
- Página de produto (PDP) e carrinho: a PDP já foi compactada no #587. Revisões nessas páginas
  pedem PRD próprio *(premissa — confirme ou corrija)*.
- Mudar as abas da tab bar (quais são e em que ordem). A composição atual foi decidida em 11/09.
- Busca por voz, filtros na busca e outros recursos novos de busca.

## 3. Funcionalidades

### US01: Topo recolhe ao rolar para baixo

Como comprador no celular, quero que o topo fixo saia da tela enquanto rolo para ver produtos, para
enxergar mais itens de uma vez.

**Rules:**
- Ao rolar para baixo além da altura do próprio topo, ele (logo, ícones e busca) sai da tela
  *(premissa — confirme ou corrija)*.
- Qualquer rolagem para cima traz o topo inteiro de volta, com a busca utilizável na hora.
- No início da página, o topo está sempre visível.
- A tab bar inferior não recolhe (decisão 1).

**Edge cases:**
- Campo de busca com foco ou sugestões abertas → o topo não recolhe enquanto o foco durar.
- Menu hambúrguer ou modal de CEP aberto → o topo não recolhe.
- Página curta, sem rolagem → o topo fica sempre visível.
- Rolagem muito curta, como um tremor do dedo → não alterna o topo, para ele não "piscar"
  *(premissa — confirme ou corrija: tolerância de ~10px)*.
- Usuário com preferência de movimento reduzido → o topo aparece e some sem animação.

### US02: Campanhas a um toque na home

Como comprador no celular, quero acessar Ofertas, Venda Futura e Compras coletivas direto da home,
para não precisar abrir o menu para achar as campanhas.

**Rules:**
- A home mostra um atalho para cada campanha logo abaixo do banner inicial, fora do topo fixo
  *(premissa — confirme ou corrija: posição e formato (chips roláveis ou cards pequenos) a definir no design)*.
- Um atalho só aparece se a campanha tiver conteúdo no CEP do comprador. Exemplo: sem Venda Futura
  disponível, o atalho não aparece, para não levar a uma seção vazia.
- Ofertas e Venda Futura levam à respectiva seção da home. Compras coletivas leva a `/coletivas`.
- O menu hambúrguer continua com os três links. O atalho na home é caminho adicional, não substituto.

**Edge cases:**
- Nenhuma campanha com conteúdo → a faixa de atalhos inteira não aparece.
- Ao tocar num atalho para seção da mesma página, o título da seção não pode ficar escondido atrás do
  topo fixo.
- Comprador sem CEP informado → segue a regra atual da home, que exige CEP (PRD da vitrine por CEP),
  e os atalhos não aparecem antes disso.

### US03: Trilhos de produto densos no celular

Como comprador no celular, quero ver cerca de dois produtos por tela em cada trilho, para comparar
opções sem rolar tanto.

**Rules:**
- Todo trilho horizontal de produtos da home mostra cerca de 2 cards por largura de tela, mais uma
  parte do próximo card, que indica que dá para rolar.
- Os cards não reservam espaço para elementos invisíveis (decisão 3).
- As seções da home mantêm o mesmo espaçamento vertical entre si no mobile.
- Faixas de banners de campanha não repetem em título o que a arte já comunica.

**Edge cases:**
- Nome de produto longo → no máximo 2 linhas, com reticências.
- Produto sem imagem → espaço da imagem com o mesmo tamanho e o texto "sem imagem", sem mudar a
  altura do card.
- Trilho com 1 único produto → o card mantém a largura padrão e não estica para a tela inteira.

### US04: Atendimento flutuante sem cobrir o conteúdo

Como comprador no celular, quero que o botão de atendimento não cubra preço nem botões dos cards,
para não tocar nele por engano.

**Rules:**
- Durante a rolagem para baixo, o botão de atendimento recolhe junto com o topo e volta na rolagem
  para cima *(premissa — confirme ou corrija: a alternativa é reduzir o botão a um ícone menor)*.
- O atendimento continua acessível em qualquer página com tab bar.

**Edge cases:**
- Conversa de atendimento aberta → o botão não recolhe.
- Página sem tab bar → sem mudança, porque o botão é a única porta de atendimento ali.

## 4. Fluxo de Negócio

```
Comprador rola a home no celular
   │
   ▼
Rolou para baixo além da altura do topo?
   ├── não ──▶ Topo e atendimento visíveis
   └── sim ──▶ Busca com foco, menu ou modal aberto?
                  ├── sim ──▶ Topo continua visível
                  └── não ──▶ Topo e atendimento recolhem (tab bar fica)
                                 │
                                 ▼
                          Rolou para cima? ──sim──▶ Topo e atendimento voltam
```

## 5. Critérios de Aceite

### 5a. Critérios de aceite da feature

Medido em viewport de 390×844 (celular de referência) *(premissa — confirme ou corrija)*.

| Critério | Razão de negócio | Como verificar (observável) |
|----------|------------------|-----------------------------|
| Com o topo recolhido, a área útil entre a borda superior e a tab bar é ≥ 85% da altura da tela | Mais produto visível por rolagem é o objetivo da feature | Captura de tela no meio da home, medir a altura livre |
| Rolagem para cima de qualquer ponto traz o topo de volta em ≤ 300ms | Acima disso a busca parece travada | Gravação de tela a 60fps, contar os frames |
| Com o foco no campo de busca, rolar não recolhe o topo | Não pode sumir o campo em que o usuário está digitando | Teste manual no celular |
| A home mostra os atalhos só das campanhas com conteúdo no CEP do comprador | Atalho para seção vazia gera frustração | Testar com um CEP que tem Venda Futura e outro que não tem |
| Todo trilho de produtos da home mostra de 2 a 2,5 cards por tela | Padrão único de densidade | Captura de cada trilho a 390px |
| Nenhum card tem espaço branco reservado abaixo do último elemento visível | Reclamação explícita da dona do produto em 11/09 | Inspeção visual dos cards de desconto, supermercado e Venda Futura |
| Nada muda na vitrine a partir de 768px | Escopo é só mobile | Comparar capturas antes e depois a 1280px |

### 5b. Métricas de sucesso

| Métrica | Baseline (fonte) | Meta | Prazo | Mín. aceitável | Responsável |
|---------|-------------------|------|-------|-----------------|-------------|
| Sessões mobile que chegam à seção Venda Futura | A levantar (Vercel Analytics, até 18/09) | +30% | 30 dias após o deploy | +10% | Dona do produto |
| Cliques em card de produto por sessão mobile na home | A levantar (Vercel Analytics, até 18/09) | +20% | 30 dias após o deploy | Sem queda | Dona do produto |
| Participação do mobile no tráfego da home | A levantar (pendência do PRD 003) | Só medição | Até 18/09 | — | Dona do produto |

## 6. Milestones

### Milestone 1: Vitrine mobile densa

**Por que é um marco:** o comprador passa a ver dois produtos por tela em todos os trilhos, sem
espaço desperdiçado. É a principal queixa das capturas de 11/09. Os PRs #596 e #598 entregaram
parte dele.

**Funcionalidades:** US03

**Checklist de aceite** (marcado pelo Aprovador após a implementação):
- [ ] Todo trilho de produtos da home mostra de 2 a 2,5 cards por tela a 390px
- [ ] Nenhum card tem espaço branco reservado abaixo do último elemento visível
- [ ] Nada muda na vitrine a partir de 768px

**Aprovador:** dona do produto

### Milestone 2: Navegação que sai do caminho

**Por que é um marco:** o topo e o atendimento deixam de competir com os produtos durante a
rolagem, e a busca volta com um gesto. Muda a sensação de uso da vitrine no celular.

**Funcionalidades:** US01, US04

**Checklist de aceite** (marcado pelo Aprovador após a implementação):
- [ ] Com o topo recolhido, a área útil é ≥ 85% da altura da tela
- [ ] Rolagem para cima traz o topo de volta em ≤ 300ms
- [ ] Com o foco no campo de busca, rolar não recolhe o topo
- [ ] O botão de atendimento não cobre preço nem botões durante a rolagem para baixo

**Aprovador:** dona do produto

### Milestone 3: Campanhas a um toque

**Por que é um marco:** Ofertas, Venda Futura e Compras coletivas voltam a ter porta direta na
home do celular, sem custar espaço fixo no topo.

**Funcionalidades:** US02

**Checklist de aceite** (marcado pelo Aprovador após a implementação):
- [ ] A home mostra os atalhos só das campanhas com conteúdo no CEP do comprador
- [ ] Ao tocar num atalho, o título da seção não fica escondido atrás do topo

**Aprovador:** dona do produto

## 7. Riscos e Dependências

| Risco | Impacto | Mitigação | Status |
|-------|---------|-----------|--------|
| Topo que some e reaparece irrita quem rola devagar e o topo fica "piscando" | Médio | Tolerância mínima de rolagem, validar no celular antes do merge | Pendente |
| Sem baseline de analytics, não há como provar ganho | Médio | Levantar as métricas de §5b antes do deploy do Milestone 2 | Pendente |
| Campanhas perdem visibilidade entre o #598 e o Milestone 3 | Médio | Priorizar o Milestone 3 logo após o 1. O hambúrguer cobre o acesso nesse intervalo | Monitorando |

**Dependências:**

| Dependência | Tipo | Status | Impacto se bloqueado |
|-------------|------|--------|----------------------|
| Deploy de produção do master com #596 e #598 (bloqueado pelo limite diário da Vercel em 11/09) | Interna | Pendente | Milestone 1 não pode ser aprovado em produção |
| Vitrine por CEP (regra de a campanha "ter conteúdo" no CEP) | Interna | Em produção | US02 |

## 8. Referências

- [PR #596](https://github.com/Schneider-Gr/industria24hIA/pull/596): cards da Venda Futura a 45% no mobile (parte do Milestone 1)
- [PR #598](https://github.com/Schneider-Gr/industria24hIA/pull/598): busca mais baixa, chips fora do topo mobile, selo de envio e título de banner (parte do Milestone 1)
- [PRD 003](003-banners-destaque-admin-e-gap-ux-mobile.md): registrou a lacuna de UX mobile que este PRD especifica
- [PRD 004](004-continuacao-redesign-vitrine-header-venda-futura-lp-seller.md): decisão 6 (chips no topo mobile), revisada aqui
- `web/DESIGN.md`: tokens e padrões visuais da vitrine

## 9. Registro de Decisões

- **2026-09-11:** a tab bar inferior é a navegação primária do mobile e nunca recolhe. Motivo: ela
  já cobre os destinos de primeiro nível, o que permite recolher o topo sem perder navegação.
- **2026-09-11:** a faixa de chips sai do topo fixo do mobile (#598), e o acesso às campanhas passa
  para o hambúrguer e para um atalho na home (US02). Motivo: a dona do produto pediu para ocultá-la
  por espaço, e o hambúrguer (`MenuMais`) já tinha os três links. Não reabre o bug de acessibilidade
  do PRD 004.
- **2026-09-11:** `depends_on: ["004"]`. Critério: este PRD altera o comportamento do topo mobile
  definido na decisão 6 do PRD 004. O PRD 003 fica só em referências, porque registrou a necessidade
  mas não define comportamento do qual este dependa.
