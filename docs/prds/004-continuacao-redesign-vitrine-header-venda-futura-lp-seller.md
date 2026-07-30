---
prd_number: "004"
status: implementado
priority: alta
created: 2026-07-30
issue: ""
depends_on: ["002", "003"]
references:
  - "web/DESIGN.md"
  - "docs/prds/002-redesign-pdp-carrinho-multiloja-paleta-leroy-merlin.md"
  - "docs/prds/003-banners-destaque-admin-e-gap-ux-mobile.md"
  - "docs/prd/compra-coletiva.md"
---

# PRD 004: Continuação do redesign de vitrine — header, Venda Futura, LP de vendedor

## 1. Contexto

Sequência direta do PRD 002 (redesign PDP/carrinho/paleta Leroy Merlin) e do PRD 003
(banners de destaque). Nesta sessão o dono pediu, em ordem: ícones por categoria e nos
banners, cores/ícones dos botões da PDP, cross-sell/upsell com oferta de Venda Futura na
página de produto, galeria de compras coletivas, menu superior com submenus recolhíveis
inspirado no Mercado Livre, paleta própria para as seções de Venda Futura (referência
visual `fresh-harvest-reserve.lovable.app`, **escopo explicitamente restrito** pelo dono a
"só nas seções de Venda Futura" quando questionado sobre reintroduzir roxo — cor já
descontinuada duas vezes antes, ver `DESIGN.md`), um banner institucional de recrutamento
de vendedores (copy fornecida literalmente pelo dono) e, por fim, uma landing page para o
CTA desse banner falar das vantagens da plataforma.

## 2. Solução implementada

### Decisões de produto

1. **Ícones por categoria real**: `icones-categoria.tsx` casa por palavra-chave contra os
   9 nomes de categoria confirmados no banco de produção (Agro, Combustíveis,
   Eletrodomésticos, Legumes, Madeira, Material de Construção, Pet Shop, Supermercado,
   Verduras), com fallback genérico — usado no mega-menu e nos cards de categoria.
2. **Correção de bug real**: os 3 passos de `VendaFuturaPassos` compartilhavam o mesmo
   ícone copiado; cada passo recebeu um SVG distinto (calendário/checklist, cadeado,
   caminhão).
3. **PDP compacta**: espaçamento e grid reduzidos para caber o CTA de compra sem rolagem
   na composição de conteúdo testada (1 imagem, 1 faixa de promoção, sem coletiva/venda
   futura) — não é garantia universal para produtos com mais conteúdo.
4. **Cross-sell na PDP**: `CrossSellRail` (existente, só no carrinho) reaproveitado na PDP
   passando um item sintético de 1 produto.
5. **Galeria de compras coletivas** (`/coletivas`): página nova, server component, lê
   `compras_coletivas` com status `Aberta`/`Viavel` e prazo não vencido, reaproveitando
   `BarraProgresso` já usado no detalhe da coletiva.
6. **Menu superior recolhível**: `LINKS_SECUNDARIOS` (Ofertas, Venda Futura, Compras
   coletivas) ficavam em `hidden md:flex` sem alternativa abaixo de 768px — **bug real de
   acessibilidade**, esses links eram inacessíveis no mobile. Corrigido com uma linha de
   chips roláveis (`lg:hidden`) mais chevron no botão "Categorias".
7. **Paleta `vf-roxo`/`vf-vermelho` escopada a Venda Futura**: tokens novos em
   `globals.css`, aplicados só em `MercadoFuturo.tsx` e `VendaFuturaPassos.tsx`. Não
   substituem `lm-*`/`verde-24h`/`sinal` em nenhum outro componente — decisão confirmada
   pelo dono via pergunta direta, não inferência.
8. **Cores de ação por contexto**: "Falar com vendedor" → `verde-24h` (era outline azul),
   "Adicionar ao carrinho" → `sinal`/laranja (era azul), com ícones SVG mais específicos
   (bolha de chat com reticências; carrinho de compras com duas rodas) no lugar de ícones
   genéricos.
9. **Banner de recrutamento de vendedores** (`BannerRecrutamentoSeller`): copy fornecida
   literalmente pelo dono. Estatísticas (+5.000 produtores, 98% satisfação, +40% margem)
   são claim de marketing, não dado consultado ao vivo — mesmo tratamento já dado à copy
   estática de `CestasBanner`/`VendaFuturaPassos`. Inserido no final da home, como o dono
   escolheu ao ser perguntado "no meio ou no final".
10. **Landing `/seja-fornecedor`**: o CTA do banner e o botão "Vender no 24h" do header
    apontavam para `/vender`, que é só um *gate* de roteamento por auth (sem conteúdo de
    marketing) — o comprador deslogado caía direto no formulário de cadastro sem entender
    a proposta de valor. Criada landing pública com vantagens **apenas de features já
    implementadas**: venda direta sem intermediário, alcance nacional, painel de gestão,
    Venda Futura com preço travado, desconto progressivo por volume, compra coletiva.
    Ambos os CTAs agora apontam para `/seja-fornecedor`, cujo botão interno segue para
    `/vender` (mantém o roteamento por auth existente).

### Decisão registrada — imagem de referência do Lovable não inserida

O dono pediu para inserir, nos banners de galeria (`banners_destaque`), a imagem usada na
seção `#supermercado` de `fresh-harvest-reserve.lovable.app`. Investigação: essa seção da
referência não usa uma imagem de banner única — é uma grade de fotos de produto (alface,
manjericão, salsa, agrião). A imagem de banner mais próxima no bundle da referência
(`banner-producao-local.jpg`) tem **UI falsa desenhada dentro do próprio arquivo** (barra
de busca simulada) e a **marca antiga "Indústria24h" com "h"** (domínio Bubble legado,
não este projeto) embutida no pixel — não dá para trocar por texto/badge nosso porque o
texto já está queimado na imagem. Inserir esse arquivo como está violaria a regra de não
simular UI/dado falso (`CLAUDE.md` raiz, regra 1) e mostraria a marca errada em produção.
**Não implementado** — fica como pendência: gerar/licenciar uma imagem própria (sem UI
falsa embutida, com a marca correta ou sem marca) para o banner de "Produção Local" da
seção Supermercado, ou usar `banners_destaque` (admin já existe, PRD 003) para o dono subir
uma foto própria.

### Fora do escopo (explicitamente adiado)

- Auditoria completa de UX mobile (permanece pendência do PRD 003, não coberta aqui).
- Migração de paleta dos cards de catálogo ainda em `aco-*`/`sinal*`/`verde-24h*` (adiado
  desde o PRD 002).
- Imagem de banner para a seção Supermercado (ver decisão acima).

## 3. Arquivos alterados

- `src/app/globals.css` — tokens `vf-roxo`, `vf-roxo-claro`, `vf-vermelho`.
- `src/components/vitrine/icones-categoria.tsx` (novo) — `IconeCategoria` por nome real.
- `src/components/vitrine/MegaMenuCategorias.tsx` — ícones reais, chevron animado.
- `src/components/vitrine/CategoriaCarousel.tsx` — overlay de ícone por categoria.
- `src/components/vitrine/VendaFuturaPassos.tsx` — ícones distintos por passo, paleta `vf-roxo`.
- `src/components/vitrine/MercadoFuturo.tsx` — paleta `vf-roxo`/`vf-vermelho`, botão "Reservar" em pílula vermelha.
- `src/app/produto/[id]/page.tsx` — compactação adicional, `CrossSellRail`, botão "Falar com vendedor" em `verde-24h`.
- `src/components/carrinho/carrinho.tsx` — botão "Adicionar ao carrinho" em `sinal`, ícone de carrinho.
- `src/app/carrinho/page.tsx` — layout em colunas com resumo fixo (continuação do PRD 002).
- `src/app/coletivas/page.tsx` (novo) — galeria de compras coletivas ativas.
- `src/components/vitrine/ui.tsx` (`VitrineHeader`) — `LINKS_SECUNDARIOS`, linha de chips `lg:hidden`, CTA "Vender no 24h" → `/seja-fornecedor`.
- `src/components/vitrine/BannerRecrutamentoSeller.tsx` (novo) — banner institucional, CTA → `/seja-fornecedor`.
- `src/app/page.tsx` — banner inserido antes do footer.
- `src/app/seja-fornecedor/page.tsx` (novo) — landing de vantagens para vendedor, CTA → `/vender`.

## 4. Verificação

- `tsc --noEmit` limpo nos arquivos alterados desta rodada (erros pré-existentes em
  `src/app/api/carrinho/abandono/**` e `src/app/api/carrinho/sync/**` são de uma tabela
  fora do types gerados, de trabalho concorrente de outra sessão neste mesmo working
  tree — não relacionados a este PRD, não tocados aqui).
- `next build` limpo (produção, Vercel).
- **PR #172** (header colapsável + paleta Venda Futura + banner de recrutamento): mergeado
  2026-07-30, deploy confirmado via `vercel inspect` (aliases `industria24.com.br` e
  `www.industria24.com.br`) + `curl` 200 em home, PDP e `/coletivas`.
- **PR #173** (landing `/seja-fornecedor` + recuperação do PRD 003): mergeado 2026-07-30,
  deploy confirmado do mesmo jeito + `curl` 200 em home, `/seja-fornecedor` e `/coletivas`.
  Ambos em produção.
- Teste funcional da landing `/seja-fornecedor` e do menu recolhível em viewport mobile:
  não executado nesta sessão (browser automation indisponível — outra sessão concorrente
  usando o mesmo Chrome). Fica como pendência de QA visual manual.
