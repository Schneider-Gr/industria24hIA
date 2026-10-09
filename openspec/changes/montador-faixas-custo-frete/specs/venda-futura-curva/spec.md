## MODIFIED Requirements

### Requirement: Curva de desconto por antecedência no lote
O lote de venda futura SHALL aceitar até 6 degraus `{dias_antes, desconto_pct}`, com
`dias_antes` inteiro positivo e distinto, `desconto_pct` inteiro de 1 a 90, e desconto não
crescente em direção à entrega. Lote sem degraus SHALL manter o comportamento atual.

#### Scenario: Seis degraus
- **WHEN** o seller salva seis degraus válidos
- **THEN** o lote é gravado

#### Scenario: Sete degraus
- **WHEN** o seller tenta salvar sete degraus
- **THEN** a gravação é recusada

## ADDED Requirements

### Requirement: Aviso de margem no simulador da curva
Com custo ou markup informado, o simulador SHALL marcar cada célula cujo líquido fique
abaixo do custo e avisar "abaixo do custo". Sem custo, SHALL avisar quando o desconto total
passar de 30%.

#### Scenario: Alface a −41% acima do custo
- **WHEN** à vista R$ 4,50, desconto total 41% e custo R$ 1,80
- **THEN** não há aviso de custo
