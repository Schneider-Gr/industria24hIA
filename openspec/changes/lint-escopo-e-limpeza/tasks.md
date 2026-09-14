## 1. Escopo do lint

- [x] 1.1 Confirmar que nenhum dos diretórios candidatos tem `.ts`/`.tsx`/`.js` rastreado (`git ls-files`)
- [x] 1.2 Adicionar os quatro diretórios ao `globalIgnores` do `eslint.config.mjs`, com comentário explicando o motivo
- [x] 1.3 Confirmar a queda do ruído: de 7.304 erros / ~90 mil avisos para 0 erros

## 2. Script

- [x] 2.1 Adicionar `lint:fix` ao `package.json` sem alterar o `lint` existente

## 3. Achados no código da aplicação

- [x] 3.1 `TurnstileWidget.tsx`: `siteKey` nas dependências do efeito
- [x] 3.2 `bot/ChatWidget.tsx`: remover o estado `conversaId` não lido
- [x] 3.3 `carrinho/carrinho.tsx`: remover o `eslint-disable` inútil
- [x] 3.4 `seller/ProdutoForm.tsx`: remover o componente `Num` sem referência

## 4. Verificação

- [x] 4.1 `npm run lint` sem erro
- [x] 4.2 `tsc --noEmit` limpo
- [x] 4.3 `npm run test` verde (213 testes)
