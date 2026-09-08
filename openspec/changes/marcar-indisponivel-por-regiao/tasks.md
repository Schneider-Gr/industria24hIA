## 1. Regra e leitura

- [ ] 1.1 Trocar `filtrarPorFaixaCep` por `marcarPorFaixaCep` em `faixa-cep-produto.ts`, devolvendo `indisponivelRegiao`
- [ ] 1.2 Teste do módulo puro cobrindo dentro, fora, sem CEP e sem faixa

## 2. Vitrine

- [ ] 2.1 `ProdutoCard`: rótulo vermelho, sem botões de compra
- [ ] 2.2 `ProdutoDescontoCard`: rótulo no lugar do preço promocional
- [ ] 2.3 Home, categoria e busca marcando em vez de filtrando
- [ ] 2.4 Copy do `CardLocalizacao`

## 3. Verificação

- [ ] 3.1 `tsc --noEmit` e vitest
- [ ] 3.2 Teste em produção por HTTP com cookie `cep_comprador`: CEP de Manaus e de Porto Alegre no mesmo produto
