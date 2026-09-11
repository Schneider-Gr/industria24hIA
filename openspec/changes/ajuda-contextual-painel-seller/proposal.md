## Why

O painel do seller tem 22 telas e um único tour guiado de 7 passos (`src/components/seller/TourGuiado.tsx`), disparado só por um botão em `/seller/tutoriais` — onde quase nenhum seller chega. Os formulários não têm nenhuma ajuda ao lado dos campos, e vários deles travam dinheiro quando preenchidos errado: sem chave PIX o repasse fica inelegível e não sai (Manual do Seller, seção 12); sem peso o frete é cotado com 1 kg de placeholder (seção 16); ticket mínimo alto demais bloqueia o checkout do comprador (seção 05).

O Manual do Seller virou página em `/seller/central-de-duvidas` (PR #600, em produção), mas vive isolado do ponto onde a dúvida nasce, que é o campo do formulário. Brainstorm de 11/09/2026 registrado em `docs/brainstorm-mascote-dicas-seller.md` consolidou o desenho: ajuda contextual ao lado da configuração, tour curto por tela em vez de um tour único longo, e a Central quebrada em uma rota por tópico para servir de destino do "saiba mais".

A dona do produto autorizou o uso da imagem de uma pessoa real como mascote guia (autorização declarada em 11/09/2026).

## What Changes

- **Fonte única de dicas** (`src/components/seller/dicas.ts`): texto indexado por tela e por nome de campo, com dois atributos por dica — peso (`fixa` para campo cujo erro custa dinheiro, `sob-demanda` para o resto) e origem (`manual` quando o texto vem do Manual do Seller, `rascunho` quando foi escrito a partir do comportamento do código e ainda aguarda revisão da equipe). A mesma fonte alimenta o tooltip, os passos do tour e o conteúdo da Central.
- **Componente de dica** com duas variantes: texto fixo abaixo do label, e ícone "?" que abre no clique. Sem depender de hover, porque boa parte dos sellers opera no celular.
- **Aplicação aos cinco formulários do caminho do dinheiro**: Produtos (`ProdutoForm`, 21 campos), Minha Loja (`LojaForm` + `ChavePixForm`, 19 campos), Venda Futura (`VendaFuturaForm`, 4 campos), Promoções (faixa de desconto progressivo) e Pedidos (colunas da lista e o código de entrega, que não é formulário).
- **Central de Dúvidas por tópico**: `/seller/central-de-duvidas/<slug>` para cada um dos 16 tópicos do manual, com a raiz virando índice. As âncoras publicadas no PR #600 (`#repasse`, `#cadastrar-produto`, …) continuam funcionando.
- **Tour por tela**: `PASSOS` do `TourGuiado` deixa de ser uma lista única e passa a ser agrupado por rota. Cada tela do escopo ganha um botão de início próprio e um convite na primeira visita, com a preferência guardada no navegador do seller.
- **Mascote** no balão do tour e no convite inicial, a partir da ilustração 3D aprovada (`docs/assets/mascote-origem.png`): recorte de busto para o balão, corpo inteiro para o convite, fundo removido nos dois. Não aparece ao lado dos campos.

**Fora de escopo:**
- As outras 17 telas do painel (ads, coletivas, crédito, disputas, entregas, leilões, mensagens, reputação, rotas, transportadoras, centros, afiliados, parceiro-logistica, carrinhos-abandonados, análise-geral, dashboard, tutoriais). Entram depois que o padrão estiver validado nas cinco primeiras.
- Reescrita do conteúdo do manual. O texto já publicado no PR #600 é a fonte.
- Tradução ou versão em outro idioma.

## Capabilities

### New Capabilities
- `seller-ajuda-contextual/dicas-campo`: ajuda ao lado de cada configuração nos formulários do caminho do dinheiro, com distinção entre texto revisado e rascunho pendente.
- `seller-ajuda-contextual/tour-por-tela`: tour guiado curto iniciado de dentro de cada tela, com mascote, substituindo o tour único disparado só em Tutoriais.
- `seller-central-duvidas/navegacao-por-topico`: uma rota por tópico do Manual do Seller, preservando as âncoras já publicadas.

### Modified Capabilities
(nenhuma — não existe spec arquivada para Tutoriais nem para a Central de Dúvidas; o comportamento atual do `TourGuiado` é descrito nas capabilities novas acima.)

## Impact

- `src/components/seller/dicas.ts` (novo) + `dicas.test.ts`: fonte de dados e teste de integridade.
- `src/components/seller/Dica.tsx` (novo): as duas variantes do componente.
- `src/components/seller/TourGuiado.tsx`: `PASSOS` agrupado por rota, gatilho por tela, mascote no balão.
- `src/components/seller/ProdutoForm.tsx`, `LojaForm.tsx`, `ChavePixForm.tsx`, `VendaFuturaForm.tsx` e a tela de Promoções: aplicação das dicas.
- `src/app/(seller)/seller/central-de-duvidas/`: raiz vira índice, nova rota `[topico]`, redirect das âncoras.
- `src/components/seller/manual-seller.ts`: já existe (PR #600), passa a ser consumido também pela rota por tópico.
- `public/`: dois PNG do mascote (busto e corpo inteiro) com fundo removido.
- Nenhuma migration, nenhuma mudança de schema, nenhuma RLS nova.

## Pendências que travam parte da execução

- **`permite_logistica_afiliado` × `parceiro_logistico_habilitado`**: não são o mesmo campo, embora o manual trate ambos como "o ícone do avião". O primeiro fica no produto; o segundo é gravado numa tabela de revisão à parte e é o que a tela do afiliado logístico lê para liberar a corrida (migration 0095). A dica desses dois campos só pode ser escrita depois de ler a 0095.
- **`perecivel`**: o manual liga perecível à janela de disputa de 24h. Confirmar no código antes de afirmar isso numa dica.
