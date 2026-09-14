## 1. Pesquisa antes do texto

- [ ] 1.1 Ler `src/lib/coletiva.ts` e testes para descrever lote, meta e fechamento sem inventar regra
- [ ] 1.2 Ler o fluxo de leilão (quem vence, o que o prazo do lance obriga)
- [ ] 1.3 Ler `AdsForm` e a action de campanha: o que o orçamento diário significa na prática e se há teto
- [ ] 1.4 Crédito: identificar o que é regra do código e o que é regra comercial não documentada; o que não estiver confirmado não vira dica

## 2. Fonte e teste

- [ ] 2.1 Estender `dicas.test.ts` com os novos campos críticos (Red)
- [ ] 2.2 Acrescentar as telas `coletiva`, `leilao`, `ads`, `credito`, `centro` em `dicas.ts`, marcando origem e peso
- [ ] 2.3 Acrescentar as entradas de ação (`produto-linha`, `afiliados`, `parceiro-logistica`) e de indicador (telas de leitura)

## 3. Aplicação

- [ ] 3.1 `ColetivaRegraForm` (lotes, meta, prazo)
- [ ] 3.2 Leilões: campos do lance
- [ ] 3.3 `AdsForm` e `CreditoForm`
- [ ] 3.4 `CentroForm` e `ProdutoLinha`
- [ ] 3.5 Status em Afiliados e Parceiro logística
- [ ] 3.6 Indicadores de Análise Geral, Reputação, Entregas, Transportadoras e Carrinhos abandonados
- [ ] 3.7 Conferir a 390px que nenhuma tela de lista ficou com ajuda repetida linha a linha

## 4. Divergência de interface

- [ ] 4.1 Nota no tópico 05 de `manual-seller.ts`: os seis ícones são do painel legado; a lista atual usa Editar, Solicitar aprovação e Excluir
- [ ] 4.2 Levantar se há outras telas em que o manual descreve a interface do Bubble e não a atual, e listar para decisão do dono

## 5. Fechamento

- [ ] 5.1 `npm run lint`, `npm run test`, `npm run build`
- [ ] 5.2 Revisão da equipe nas dicas marcadas como rascunho, aqui e as da entrega anterior
