## 1. Regra

- [x] 1.1 `esconderForaDaFaixa` no módulo puro, com checks de "só quem está fora sai" e "todos fora resulta em vazio"
- [x] 1.2 `filtrarPorFaixaCep` volta a filtrar

## 2. Vitrine

- [x] 2.1 Home filtra as quatro listas com a consulta única e descarta galeria vazia
- [x] 2.2 Categoria e busca filtram
- [x] 2.3 Remover o rótulo e `indisponivelRegiao` (código morto sem a marcação)
- [x] 2.4 Copy do `CardLocalizacao`

## 3. Verificação

- [x] 3.1 `tsc --noEmit`, lint e vitest
- [ ] 3.2 Preview: contagem cai com CEP fora da cobertura e nada quebra com listagem vazia
- [ ] 3.3 Produção depois do merge
