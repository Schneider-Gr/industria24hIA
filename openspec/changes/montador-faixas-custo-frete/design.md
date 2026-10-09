## Context

Ver `proposal.md`. Exemplo de referência: aba "CRESPA eXPRESS" da planilha. Portão R$ 4,50,
frete da viagem R$ 20 (10 un.) a R$ 170 (1000 un.), cliente paga R$ 6,93 → R$ 5,14 por
unidade com o seller recebendo sempre R$ 4,50.

## Decisions

### D1. O que o seller recebe é a base

`liquido_avista = valor_avista × (1 − comissao/100)`, com `comissao_pct_produto`. É o
"preço de portão" da planilha; não é pedido de novo ao seller.

### D2. Custo ou markup (só simulação)

- Custo informado: usa direto.
- Markup informado (> 1): `custo = liquido_avista / markup` (ex.: 4,50 / 1,3 = 3,46).
- Nenhum: sem margem; vale o aviso de 30% de desconto total.

### D3. Preço e margem da faixa

- `preco = round_half_up(valor_avista_cents × (100 − desconto_pct) / 100)` (mesma conta de
  centavos do PRD 061), desconto inteiro de 0 a 90.
- `liquido = preco × (1 − comissao/100)`, em centavos.
- `markup_atingido = liquido / custo`; abaixo de 1 = abaixo do custo (aviso, não bloqueia).
- `desconto_max`: o maior desconto inteiro (0..90) em que o líquido, recalculado em
  centavos, não fica abaixo do custo.

### D4. Frete por unidade

Para cada distância de referência (perto 5 km, médio 15 km, longe 30 km, editáveis na
tela): `frete = freteRegiao({ distanciaM: km × 1000, pesoKg: peso × q, bandas }).total`;
`frete_un = frete / q`; `comprador_un = preco + frete_un`; `frete_pct = frete / (preco × q)`.
Sem balsa (travessia fica no avião).

ponytail: distância fixa editável em vez de rota do Google; quando o seller quiser
destinos reais, reaproveitar `simularAviao`.

### D5. Quantidades propostas

Com peso e bandas: `quantidade_minima` (ou 1), a menor quantidade estável viável (frete
≤ 20% do pedido) e a ideal (≤ 10%) na distância "médio" (`simularRegiao`), e
10 × mínima; sem repetição, crescente, até `MAX_QTD`. Sem peso ou bandas: mínima, 3× e
10×. O seller pode editar qualquer quantidade.

### D6. Gravação

Substitui as `faixas` da linha ativa por `{min_qtd, valor_unitario, validade: null}` das
faixas com desconto > 0 e `min_qtd` > 1 (faixa sem desconto não muda preço). Mantém
`max_participantes`. Cria a linha se não houver. A tela avisa que substitui as faixas atuais.

### D7. Venda futura

- Limite de degraus = 6 no trigger (migration 0219 recria `vendas_futuras_curva_valida`
  a partir da 0218, só troca o número) e em `MAX_DEGRAUS`.
- Simulador da curva: campo custo ou markup (D2); célula com `liquido < custo` em
  vermelho; aviso "abaixo do custo" substitui o de 30% quando há custo.
- O montador entra no formulário; ao gravar, o simulador recarrega as faixas.

## Risks

- Distância de referência não representa todos os compradores: o frete real do checkout
  pode ser maior para quem mora longe (a coluna "longe" mostra isso).
- Markup derivado do preço atual: se o à vista já está abaixo do markup desejado, todo
  desconto aparece abaixo do custo. É o comportamento correto (avisa).
