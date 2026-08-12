# PRD - Redesign da navegação mobile (industria24.com.br)

> Escrito a partir de sessão de implementação real (worktree `web-vitrine-mobile-ml`,
> branch `feat/vitrine-mobile-ml`, ainda não mesclada/deployada em produção) em
> 01/08/2026. Documenta decisões e trabalho já concluído, não é planejamento do zero.

### Product overview

| Target date | A definir |
|---|---|
| Document status | IN PROGRESS |
| Team members | Andreia Schneider |

### Objective

Refazer a navegação mobile do comprador (home, produto, carrinho, checkout) usando a
estrutura de interação do Mercado Livre como referência, sem copiar a identidade
visual — corrigindo, no processo, um sistema de design que estava em drift ativo
(6+ tentativas de paleta em 3 semanas) e bugs reais de sobreposição entre elementos
fixos que já afetavam a experiência de compra em produção.

### Problem statement

O rebuild Next.js do industria24h.com.br (Bubble) tinha navegação mobile básica
(tab bar de 3 ícones, sem seleção de faixa de desconto clicável no mobile, sem
confirmação de carrinho, cortes de layout entre 768-1024px) e um sistema de cor
inconsistente entre componentes (Aço&Sinal na tab bar, tokens "Leroy Merlin" no
resto, resíduos de outras 2 paletas). Compradores no mobile tinham menos recursos
de compra que no desktop (ex.: faixas de desconto progressivo só eram clicáveis em
telas ≥768px) e o board de identidade visual não tinha decisão estável o bastante
para construir em cima sem retrabalho.

### Success metrics

| Goal | Metric |
|---|---|
| Paridade mobile-desktop na jornada de compra | 100% das ações de compra (faixa de desconto, favoritar, avaliar, adicionar ao carrinho) disponíveis e clicáveis no mobile |
| Redução de retrabalho de design | Zero reversão de paleta/fonte após esta sessão fechar a decisão Leroy Merlin + Sora *(premissa — confirme ou corrija)* |
| Compra completa sem fricção | Simulação end-to-end (produto → carrinho → checkout → pedido) sem erro, validada com conta de teste |

### Requirements

| Requirement | Importance |
|---|---|
| Paleta oficial única (Leroy Merlin `lm-*`) e tipografia única (Sora + Inter) aplicadas de forma consistente em todos os componentes tocados | HIGH |
| Tab bar mobile fixa com 5 destinos (Início/Categorias/Carrinho/Ofertas/Mais), sem sobrepor outros elementos fixos da tela | HIGH |
| Seleção de faixa de desconto progressivo clicável no mobile (paridade com desktop) | HIGH |
| Confirmação visível e acionável ao adicionar produto ao carrinho (CTA para carrinho ou continuar comprando) | HIGH |
| Botão de adicionar ao carrinho direto da listagem (sem abrir a página do produto) | MEDIUM |
| Favoritar produto (persistido, exige login) | MEDIUM |
| Avaliar produto com nota e comentário (persistido, exige login, média pública) | MEDIUM |
| Compartilhar produto (link nativo do sistema ou copiar link) | LOW |
| Header responsivo sem cortar conteúdo em nenhuma largura entre 375px e 1440px | HIGH |
| Galeria de produto navegável por gesto de swipe no mobile | MEDIUM |
| Carrossel de categorias com auto-rotação, pausando em interação manual | LOW |

### Out of Scope

- Mudança de identidade visual (paleta/fonte) além da decisão Leroy Merlin + Sora já
  fechada nesta sessão — qualquer nova proposta de reskin é uma decisão de produto
  separada, não parte deste PRD *(premissa — confirme ou corrija)*.
- Página de "Meus Pedidos"/conta do comprador — não existe ainda no rebuild Next.js
  (só no Bubble legado); é pré-requisito de engenharia à parte, tratado como aba
  "Mais" com item desabilitado ("em breve") até ser especificado.
- Badges de negócio no card de produto — investigado nesta sessão, todos os 3
  bloqueados: "Entrega rápida" (CD/fulfillment) e "Vendedor verificado" não têm
  coluna no schema (não inventar); "Patrocinado" tem tabela real
  (`produtos_patrocinados`), mas a integração Meta Ads nunca chega a ativar nenhum
  produto (todos os registros reais em produção ficam em status `Pendente` —
  confirmado no código de `seller/ads/page.tsx`, que só trata `Pendente`/`Pausado`,
  nunca `Ativo`) — implementar o badge seria código morto até essa integração
  externa ser ligada. Compra garantida (escrow) ainda não auditada quanto a schema.
- Telas dedicadas de compra coletiva, venda futura e leilão reverso no padrão mobile
  novo — regras de negócio já auditadas, implementação ainda não iniciada.
- Checkout completo com as regras de frete individual/consolidado sem decompor
  comissão, modal de retenção de benefício, e integração com código de entrega/escrow
  — checkout atual funciona (validado em simulação de compra), mas não recebeu o
  redesign completo desta sessão.
- Deploy em produção — cada fatia aguarda aprovação manual explícita antes de
  `vercel --prod`; nada aqui é deployado automaticamente.

### Proposed solution

Sequência em fatias, cada uma validada com typecheck + teste real no browser antes
da seguinte:

1. **Paleta/tipografia** — confirmado ao vivo (screenshots comparativos + leitura do
   `globals.css` real de produção) que a paleta vigente é Leroy Merlin (`lm-*`), não
   a Vermelho&Roxo do `DESIGN.md` desatualizado. Fonte trocada de Archivo para Sora
   (títulos), mantendo Inter no corpo — confirmado por `getComputedStyle` ao vivo no
   protótipo de referência.
2. **Navegação** — tab bar de 5 abas (padrão Mercado Livre), nova página `/categoria`
   (índice), menu "Mais" em bottom sheet, header com busca mais larga em formato pill
   e hambúrguer real para categorias (corrigindo um bug pré-existente onde o botão de
   categorias desaparecia entre 768-1024px).
3. **Produto e carrinho** — swipe na galeria, chips de faixa de desconto clicáveis no
   mobile (bug real: só existiam no desktop, e a prop de dados nem chegava à versão
   mobile), confirmação de "adicionado ao carrinho" com CTAs de próxima ação, botão
   rápido de carrinho nos cards de listagem, correção de dois bugs de sobreposição
   entre a tab bar fixa e as barras de compra/checkout fixas (ambas disputavam o
   mesmo `bottom: 0`).
4. **Social** — favoritos e avaliações de produto como funcionalidades reais (tabelas
   novas `favoritos` e `avaliacoes_produto`, RLS, sem dado mockado), compartilhar via
   Web Share API.
5. **Validação** — simulação de compra completa (produto → carrinho → checkout →
   pedido criado) executada e confirmada com conta de teste do comprador.

Próximas fatias (não iniciadas): checkout completo com as regras de frete/retenção/
escrow, telas de compra coletiva/venda futura/leilão reverso, conta do comprador,
badges de negócio nos cards — cada uma como PRD ou marco separado quando entrar em
execução, para não misturar decisão de produto nova com o que já foi fechado aqui.

### Referências

- `docs/redesign-mobile-app-ml-2026-07-22.md` e `docs/redesign-vitrine-navegacao-ml-2026-07-17.md` — brainstorms anteriores sobre o mesmo tema (parcialmente desatualizados quanto à paleta, superados por esta sessão).
- `DESIGN.md` (raiz do worktree) — tabela de decisões de identidade visual, seção "Nota de consistência do documento".
- PRDs de regra de negócio ainda não implementados na UI nova: `compra-coletiva.md`, `leilao-reverso-fabricantes.md`, `compra-garantida-escrow.md`, `centro-distribuicao-fulfillment.md`, `impulsionamento-ads-internos.md`, `programa-confianca-inicial-vendedor.md`, `lote-descontos-001-confirmacao-entrega-codigo-comprador.md`, `liquidacao-relampago-excedente.md`, `bpmn-checkout-calculo-frete.md`, `consolidacao-carga-rota.md`, `contrato-fornecimento-preco-travado.md`.
