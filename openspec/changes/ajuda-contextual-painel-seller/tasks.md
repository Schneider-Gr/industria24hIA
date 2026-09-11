## 1. Fonte de dicas

- [ ] 1.1 Ler a migration 0095 e o código de disputas para resolver `permite_logistica_afiliado` × `parceiro_logistico_habilitado` e o efeito de `perecivel` na janela de disputa
- [ ] 1.2 Escrever `src/components/seller/dicas.test.ts` (Red): campo crítico sem dica falha; dica `rascunho` sem marcação falha
- [ ] 1.3 Criar `src/components/seller/dicas.ts` com as dicas de Produto e Minha Loja, marcando origem (`manual` / `rascunho`) e peso (`fixa` / `sob-demanda`)
- [ ] 1.4 Completar com Venda Futura, Promoções e Pedidos

## 2. Componente de dica

- [ ] 2.1 `src/components/seller/Dica.tsx` com as variantes texto fixo e ícone acionável
- [ ] 2.2 Verificar abertura e fechamento por toque a 390px e por teclado (Tab + Enter)

## 3. Aplicação aos formulários do caminho do dinheiro

- [ ] 3.1 `ChavePixForm` e `LojaForm` (chave PIX, tipo de chave, ticket mínimo como texto fixo)
- [ ] 3.2 `ProdutoForm` (peso e dimensões, quantidade mínima e porcentagem de afiliado como texto fixo)
- [ ] 3.3 `VendaFuturaForm` e faixa de desconto progressivo
- [ ] 3.4 Tela de Pedidos: dicas das colunas e do código de entrega
- [ ] 3.5 Conferir a altura do formulário de produto a 390px depois das dicas fixas

## 4. Central de Dúvidas por tópico

- [ ] 4.1 Rota `[topico]` consumindo `manual-seller.ts`, com navegação anterior/próximo
- [ ] 4.2 Raiz vira índice
- [ ] 4.3 Redirect das âncoras publicadas no PR #600 para a rota do tópico
- [ ] 4.4 "Saiba mais" nas telas cobertas pelo manual

## 5. Mascote e tour por tela

- [ ] 5.1 A partir de `docs/assets/mascote-origem.png`, gerar busto e corpo inteiro com fundo removido; PNG em `public/`, cada um abaixo de 40 kB
- [ ] 5.2 Agrupar `PASSOS` do `TourGuiado` por rota
- [ ] 5.3 Gatilho de tour em cada tela do escopo
- [ ] 5.4 Convite de primeira visita, com preferência no navegador e degradação silenciosa quando o armazenamento estiver bloqueado
- [ ] 5.5 Mascote no balão e no convite; conferir que não aparece junto às dicas

## 6. Fechamento

- [ ] 6.1 `npm run lint`, `npm run test` e `npm run build`
- [ ] 6.2 Revisão da equipe sobre as dicas marcadas como rascunho, removendo a marcação das aprovadas
