## Why

A change `ajuda-contextual-painel-seller` entregou a ajuda contextual nas cinco telas do caminho do dinheiro (PR #610, `src/lib/seller/dicas.ts` + `Dica.tsx`). Sobraram as demais telas do painel, e um censo do código em 14/09/2026 mostra que a maior parte do dinheiro que ainda está sem ajuda não estava no escopo inicial:

| Tela | Campos hoje | Ajuda |
|---|---|---|
| Compras coletivas (`ColetivaRegraForm`) | 9 (lotes: quantidade e preço por lote, meta, prazo) | nenhuma dica; os `text-xs text-muted` do arquivo são classe de label, não ajuda |
| Leilões (`leiloes/page.tsx`) | 3 no lance (preço, prazo, condições) | nenhuma |
| Mídia paga (`AdsForm`) | 4 (produto, orçamento diário, data início, data fim) | nenhuma |
| Crédito (`CreditoForm`) | 3 (valor solicitado, prazo em meses, finalidade) | nenhuma |
| Centro de distribuição (`CentroForm`) | 2 (nome, localização) | nenhuma |
| Lista de produtos (`ProdutoLinha`) | edição inline de quantidade mínima + ações | nenhuma |
| Afiliados e Parceiro logística | só `status` (aprovar/ajustar) | nenhuma |
| Entregas, Transportadoras, Reputação, Carrinhos abandonados, Análise Geral, Mensagens | nenhum campo: são telas de leitura | nenhuma |

Quatro dessas telas movimentam dinheiro do seller (lote de coletiva, lance de leilão, orçamento de anúncio, pedido de crédito) e nenhuma tem uma linha de ajuda. O padrão e a fonte de dados já existem; falta cobertura.

O censo também revelou uma divergência que muda o conteúdo: **a lista de produtos do painel atual não tem os seis ícones que o Manual do Seller descreve** (lápis, lixeira, caminhão, avião, documento, círculo com "+"). O `ProdutoLinha` tem botões de texto — Editar, Solicitar aprovação, Excluir — e um campo inline de quantidade mínima. O manual descreve a tela do Bubble legado; o painel reconstruído é outro. A ajuda do painel precisa descrever a tela real, e o tópico 05 da Central de Dúvidas precisa registrar a diferença.

## What Changes

- **Cobertura das telas com campo financeiro**: coletiva (lotes, meta, prazo), leilão (preço, prazo, condições do lance), mídia paga (orçamento diário e janela da campanha), crédito (valor, prazo, finalidade) e centro de distribuição (nome, localização), usando a mesma fonte `src/lib/seller/dicas.ts` e o mesmo componente `Dica`.
- **Ajuda em ação, não só em campo**: a lista de produtos ganha ajuda nos botões de ação e no campo inline de quantidade mínima; as telas de Afiliados e Parceiro logística ganham ajuda no controle de status, explicando o que cada status significa e o que acontece ao aprovar.
- **Telas de leitura ganham ajuda de indicador**, não de campo: Análise Geral, Reputação, Entregas, Transportadoras e Carrinhos abandonados recebem ajuda nos indicadores e colunas que o seller interpreta errado com mais frequência (por exemplo, "Transferidos" e faturamento por regime de data).
- **Registro da divergência de interface**: o tópico 05 da Central de Dúvidas passa a dizer que os seis ícones descritos no manual são do painel legado e que a lista atual usa botões de texto.
- **Extensão do teste de integridade** para cobrir os novos campos críticos, mantendo a regra de que campo cujo comportamento não foi confirmado fica sem dica.

**Fora de escopo:**
- Tour por tela e Central de Dúvidas por tópico, que continuam na change `ajuda-contextual-painel-seller` e na Issue #608.
- Mudança de comportamento de qualquer uma dessas telas. Esta change só acrescenta ajuda.
- Reescrever o Manual do Seller para o painel novo. Aqui só se registra a divergência encontrada; a reescrita é decisão do dono do produto.

## Capabilities

### New Capabilities
- `seller-ajuda-contextual/dicas-telas-restantes`: cobertura da ajuda nas telas fora do caminho do dinheiro inicial, incluindo ajuda em ações e em indicadores de telas de leitura.

### Modified Capabilities
(nenhuma — a capability `seller-ajuda-contextual/dicas-campo` ainda está na change `ajuda-contextual-painel-seller`, não arquivada em `openspec/specs/`; esta change acrescenta uma capability irmã em vez de alterar um delta ainda não arquivado.)

## Impact

- `src/lib/seller/dicas.ts` e `dicas.test.ts`: novas telas na fonte e no teste de integridade.
- `src/components/seller/ColetivaRegraForm.tsx`, `AdsForm.tsx`, `CreditoForm.tsx`, `CentroForm.tsx`, `ProdutoLinha.tsx`.
- `src/app/(seller)/seller/leiloes/page.tsx`, `afiliados/page.tsx`, `parceiro-logistica/page.tsx`, `analise-geral/`, `reputacao/`, `entregas/`, `transportadoras/`, `carrinhos-abandonados/`.
- `src/components/seller/manual-seller.ts`: nota sobre os ícones do painel legado no tópico 05.
- Nenhuma migration, nenhuma mudança de schema, nenhuma RLS.

## Pendências

- O conteúdo das dicas de crédito e de mídia paga depende de regra comercial que o Manual do Seller não cobre (custo do programa de mídia paga, condições do crédito). Onde a regra não estiver no código nem confirmada, a dica descreve só o efeito mecânico do campo, ou não é publicada.
