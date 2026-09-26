## Why

O seller não tem noção do custo real de entregar um produto por parceiro nem
de qual pedido mínimo torna essa entrega viável. Brainstorm com a dona em
25/09/2026 (após três versões descartadas do avião: custo declarado pelo
parceiro, bandas sem região, R$/km único sem veículo) fechou o desenho: o
seller define o custo por veículo e vê, por região, o custo total da entrega,
incluindo a balsa quando a rota atravessa o rio, e quanto isso pesa no pedido.

Fatos verificados em 25/09/2026:
- A Routes API do Google marca trecho de barco com a manobra `FERRY`
  (Centro → Manaquiri: 157,8 km, sendo 11,9 km de barco). Para Careiro da
  Várzea, Careiro, Autazes e Parintins ela devolve "sem rota".
- A distância da rota inclui o trecho de barco: sem tratamento, o simulador
  cobraria km de rio como km de estrada.
- A travessia Manaus (Ceasa) ↔ Careiro da Várzea é regulada pela ANTAQ; na
  Chamada Pública nº 1/2026 a vencedora (J Cruz) propôs R$ 30,67 por veículo
  equivalente, operação prevista desde 28/08/2026. A ANTAQ não publica tarifas
  em arquivo importável; o fator de equivalência por categoria está no edital
  (anexo com login) e não foi confirmado.
- Frete de carga por barco para o interior não tem tabela pública (página da
  ARSEPAM "em andamento").

## What Changes

Spec: `docs/prds/054-entregador-afiliacao-por-produto-e-tarifa-por-veiculo.md`
(US05 e decisão 8 revistas nesta change).

- **Bandas por veículo no produto**: tarifa mínima e R$/km para moto (até
  20 kg), carro (até 300 kg) e caminhão (acima), com piso por km de R$ 6 / 8 /
  20 (check da migration 0201, já aplicada). Veículo definido só pelo peso.
- **Quantidade mínima por pedido** salva junto com as bandas (uma por produto
  nesta fase).
- **Simulador por região** (perto, médio, longe; destinos editáveis): custo
  total do frete = maior entre tarifa mínima e km de estrada × R$/km da banda +
  balsa; % sobre o pedido; até 10% ótimo, até 20% viável; quantidade viável e
  ideal, recalculando o frete a cada quantidade (troca de veículo). Quando a
  viabilidade "fura" por troca de veículo, mostra as duas faixas (ex.: "6 un.
  (carro) ou 20 un.").
- **Grade quantidade × R$/km** do veículo, por região, com ✓ viável e ★ ideal;
  clicar numa célula preenche R$/km da banda e quantidade mínima.
- **Travessia**: campo por região só na simulação (`nenhuma`, `detectada`,
  `sem_rota`, `manual`). Com `FERRY`, o km de barco sai do km cobrado e soma a
  balsa **só de ida**, valor da tabela × fator do veículo, editável. Com "sem
  rota", aviso "pode exigir barco" e opções informar travessia ou entrega a
  combinar (PRD 050).
- **Tabela de travessias da plataforma**: nova tabela com linha, categoria,
  fator de equivalência, valor, fonte (link) e data; carga inicial com
  Ceasa–Careiro (ANTAQ, 1/2026) e Porto de Manaus (operador); tela do admin
  para manter. Fatores ainda não oficiais aparecem como estimativa.
- **Sem ajudante** (decisão da dona) e sem transportadora de tabela ou Melhor
  Envio no avião.

Fora do escopo (fase 2, PRD próprio): pedido mínimo por faixa de distância
aplicado no carrinho e no checkout.

## Impact

- `src/lib/logistica-parceiro/simulador-km.ts` (+ teste): bandas, frete por
  região, travessia, grade, quantidades viável/ideal.
- `src/lib/geo.ts`: `calcularTrajeto` passa a devolver os trechos `FERRY`
  (FieldMask com `routes.legs.steps.navigationInstruction`, `distanceMeters`).
- `src/app/(seller)/seller/produtos/km-actions.ts`, `AviaoKm.tsx`,
  `ProdutoLinha.tsx`, `page.tsx`.
- Migration nova: tabela `travessias` com RLS (leitura para autenticados,
  escrita só admin) + carga inicial.
- `src/app/(admin)/admin/...`: tela da tabela de travessias.
- PR #803 (Issue #802) é substituído por esta change.
