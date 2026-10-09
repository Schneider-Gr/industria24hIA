## Why

Brainstorm de 09/10/2026 com a dona, a partir da planilha do Carlos
(`Planilha de desconto progressivo industria 24hs com bandejas.xlsx`) e de um áudio dela.
O seller não consegue montar faixas de desconto progressivo sozinho: a tela de promoções
pede o resultado (quantidade mínima e preço da faixa) e a IA sugere faixas sem saber o
custo dele nem o frete. A planilha mostra a lógica que o seller experiente usa: o seller
recebe sempre o mesmo valor por unidade e o preço por unidade cai porque o frete da
viagem se divide entre mais unidades ("pulverizar o frete"). Ela também usa curvas de
venda futura com 5 e 6 degraus e chega a −41% com margem positiva, o que contradiz duas
premissas do PRD 061 M1 (máximo de 3 degraus e alerta fixo em 30%).

Verificado no código em 09/10/2026 (master `f270856`):

- O frete do afiliado logístico é cobrado do comprador no checkout pela banda do produto
  (`cotarParceiroLocal`, PRD 056), com a regra de `freteRegiao` (`simulador-km.ts`):
  maior entre a tarifa mínima e km × R$/km, classe pelo peso total.
- Bandas (`tarifa_minima_*`, `valor_km_*`), `peso` (kg) e `quantidade_minima` ficam em
  `produtos`, gravadas pelo botão avião. As distâncias das regiões do avião não são
  gravadas (o seller digita destinos e a rota sai do Google na hora).
- `produtos` não tem campo de custo.
- `promocoes_progressivas` guarda 1 linha ativa por produto com `faixas` jsonb
  `{min_qtd, valor_unitario, validade}`.

## Decisões da dona (09/10)

1. Frete continua à parte, pago pelo comprador ao afiliado logístico (Hudson é afiliado).
2. Custo ou markup é só para simular: não grava.
3. O sistema calcula o frete pelas bandas do avião e propõe as quantidades.
4. O seller ajusta o desconto de cada faixa e vê a margem; grava em
   `promocoes_progressivas` sem schema novo.
5. O montador aparece nas promoções e na venda futura.
6. Venda futura: até 6 degraus; aviso "abaixo do custo" quando houver custo ou markup.
7. Margem informada como **markup** (ex.: 1,3 = preço 30% acima do custo).
8. Produto sem peso ou sem bandas: o montador funciona sem frete e avisa.
9. Ordem: ajuste do M1, montador nas promoções, montador na venda futura.

## What Changes

- **Parte 1 (venda futura):** limite da curva sobe de 3 para 6 degraus (trigger, TS, tela).
  O simulador ganha "custo ou markup"; com ele, a célula cujo líquido fica abaixo do custo
  é marcada e o aviso passa a ser "abaixo do custo". Sem custo, continua o aviso de 30%.
- **Parte 2 (promoções):** "Montar faixas pelo meu custo e frete". Lê preço à vista, peso,
  bandas, quantidade mínima e comissão do nó; o seller informa custo ou markup; o sistema
  propõe quantidades e mostra, por faixa, preço, quanto o seller recebe, markup atingido,
  desconto máximo sem ficar abaixo do custo, frete por unidade em perto/médio/longe e o
  custo total por unidade para o comprador. Grava as faixas com desconto.
- **Parte 3 (venda futura):** o mesmo montador dentro do formulário da venda futura; ao
  gravar, o simulador da curva passa a usar as faixas novas.

## Impact

- `src/lib/catalogo-compra/montador-faixas.ts` (+ teste), `src/lib/venda-futura/preco-curva.ts`.
- Migration 0219 (trigger da curva com 6 degraus).
- `src/components/seller/MontadorFaixas.tsx`, `SimuladorVendaFutura.tsx`, `VendaFuturaForm.tsx`,
  página e actions de `/seller/promocoes`.
- Checkout, frete e repasse **não mudam**.
