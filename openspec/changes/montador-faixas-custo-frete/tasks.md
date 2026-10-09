## 1. Parte 1 — venda futura: 6 degraus e aviso por custo
- [x] 1.1 Red/Green: `MAX_DEGRAUS = 6` e testes da validação
- [x] 1.2 Migration 0219: trigger da curva com 6 degraus (a partir da 0218); rollback, aplicar e conferir
- [x] 1.3 Red/Green: `custoEquivalente` e `descontoMaximo` em `montador-faixas.ts`
- [x] 1.4 Simulador da venda futura com custo ou markup e aviso "abaixo do custo"

## 2. Parte 2 — montador nas promoções
- [x] 2.1 Red/Green: `quantidadesPropostas` e `linhaMontador` (preço, líquido, markup, frete por distância)
- [x] 2.2 Server actions: dados do montador (peso, bandas, mínima, comissão) e gravar faixas
- [x] 2.3 `MontadorFaixas.tsx` em /seller/promocoes

## 3. Parte 3 — montador na venda futura
- [x] 3.1 Montador no formulário da venda futura; simulador recarrega as faixas ao gravar

## 4. Entrega
- [ ] 4.1 tsc, vitest, lint; PR, merge e deploy; conferir em prod
