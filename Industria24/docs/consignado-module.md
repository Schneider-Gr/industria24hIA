# Módulo Consignado — Industria24h

> ⚠️ **Descoberta nova.** Este módulo inteiro não constava no PDF de
> engenharia reversa inicial nem nos docs anteriores. Foi identificado na
> extração real do editor Bubble (Data Types + componentes reutilizáveis).
> É um dos maiores módulos do sistema em número de Data Types (20+) e
> parece implementar um fluxo de **venda consignada com PDV (ponto de
> venda) físico**, distinto do fluxo de marketplace e-commerce já mapeado.

## O que é (hipótese a validar)

"Consignado" sugere um modelo de negócio onde produtos são entregues a um promotor/PDV para venda física, com controle de estoque consignado, check-in/check-out, avarias, trocas e apuração de comissão — em paralelo ao marketplace online. Precisa ser validado com o time de negócio, mas os nomes dos Data Types e componentes reutilizáveis sugerem fortemente esse fluxo.

## Data Types do módulo

| Tipo | Visibilidade | Papel provável |
|---|---|---|
| `consig.cxs.pedido` | Público | Caixa/pedido consignado |
| `Consig.Oferta` | Público | Oferta disponível para consignação |
| `Consig_Check_in` | Público | Entrada de produto no PDV |
| `Consig_Check_out` | Público | Saída de produto do PDV |
| `consig.%.promotor_produto` | Privado | Percentual de comissão do promotor por produto |
| `consig.avaria` | Privado | Registro de produto avariado |
| `consig.corte_pedido` | Privado | Corte/cancelamento parcial de pedido |
| `Consig.desconto` | Privado | Desconto aplicado |
| `Consig.destino` | Privado | Destino da mercadoria (PDV/loja) |
| `Consig.origem` | Privado | Origem da mercadoria (fornecedor/CD) |
| `consig.pdtEstoq` | Privado | Estoque de produto consignado |
| `Consig.PDV` | Privado | Ponto de venda físico |
| `Consig.Percentual` | Privado | Percentual geral (comissão/desconto) |
| `Consig.Produto` | Privado | Produto no contexto consignado |
| `Consig.Promotor` | Privado | Promotor responsável pelo PDV |
| `consig.rel_promotor.pdv` | Privado | Relação Promotor × PDV |
| `consig.relacao.pdv.produto` | Privado | Relação PDV × Produto (estoque alocado) |
| `consig.resp_troca` | Privado | Responsável pela troca |
| `Consig.solici.Transfer` | Privado | Solicitação de transferência (entre PDVs/CDs?) |
| `consig.solici.troca` | Privado | Solicitação de troca |
| `consig.transacao` | Privado | Transação consignada |
| `Consig.Transfer` | Privado | Transferência efetivada |
| `consig.valorAtualProduto` | Privado | Valor atual do produto (precificação dinâmica?) |
| `Consig.Venda.direta` | Privado | Venda direta (sem consignação) |
| `Consig.Venda.teorica` | Privado | Venda teórica (projeção/meta?) |
| `Consig.Vendas.pdv` | Privado | Vendas agregadas por PDV |
| `PDV.Cliente` | Privado | Cliente do PDV |

## Tipos excluídos relacionados

Sinal de que o módulo já passou por refatoração: `consig_processo_pedido`, `Consignado_Destino`, `Consignado_Fornecedor`, `Consignado_Origem`, `Consignado_serienota`, `Consorcio_Estoque` foram excluídos/arquivados — provavelmente substituídos pelos tipos com prefixo `Consig.` (nomenclatura mais recente e consistente).

## Componentes Reutilizáveis (Reusables) do módulo

| Componente | Função provável |
|---|---|
| `afiliadoSlogistica` | Afiliado de logística |
| `cons.analise.comparativa` | Análise comparativa consignado |
| `cons.relatorio.geral` | Relatório geral consignado |
| `cons_avarias` | Gestão de avarias |
| `cons_avarias_pedidos_cortes` | Avarias/pedidos/cortes |
| `cons_checkin` | Check-in |
| `cons_comissao` / `cons_comissoes` | Comissão(ões) |
| `cons_embalagem` | Embalagem |
| `cons_loja` | Loja consignado |
| `cons_oferta` | Oferta |
| `cons_pedidos` | Pedidos |
| `cons_Promotor` | Promotor |
| `cons_vendas` | Vendas |
| `espelho.pagamento` | Espelho de pagamento (financeiro) |
| `financeirotransporte` | Financeiro de transporte |

## Páginas relacionadas

- `consignado` — Módulo consignado (página principal)
- `cadastro_consignado` — Cadastro de consignado
- `login_consignado` — Login consignado (login separado do marketplace!)

> O login separado (`login_consignado` vs. `login_marketplace` vs. `login_seller` vs. `login_fulfillment`) sugere que o Consignado é tratado como uma **aplicação praticamente independente** dentro do mesmo app Bubble, com seu próprio fluxo de autenticação.

## Vistas de Dados (App Data Views) relacionadas

Confirma o volume de dados real já em uso neste módulo:

`consig_PdtEstoq`, `Consignado_Lojas`, `All Consig.Produtos / Consignado_Produtos modified 2`, `Consignado_Promotor`, `consig.rel.promotor.pdv`, `consig.rel.pdv.produto`, `consig.resposta_trocas modified`, `solictiacao_Transferencias`, `consig_solici_trocas`, `cons_trans avulsas / consig.trans ñ salva / consig.trans salva`, `transferencias.app / transferencias.upload`, `All consignado_valorAtualProdutos modified`, `venda_direta`, `Vendas.pdvs / Vendas.pdvs upload`

## Impacto na migração

Isso muda a estimativa de esforço do projeto:

1. **Escopo maior do que estimado.** O PDF inicial estimava 85-90% mapeado — mas isso não incluía o módulo Consignado, que é essencialmente um segundo sistema dentro do app. Recomenda-se **recalcular o percentual geral do projeto** considerando este módulo.
2. **Decisão de arquitetura necessária:** migrar o Consignado junto com o marketplace num único monorepo (como já planejado em `architecture.md`, com um novo app tipo `apps/consignado`), ou tratá-lo como fase separada do roadmap?
3. **Prioridade:** como não estava no radar até agora, sugerimos manter o foco atual (marketplace + seller + admin) como Fase 1, e tratar Consignado como **Fase 2 explícita** no roadmap (`18-roadmap.md` / a criar), evitando que ele "vaze" para dentro do escopo do MVP sem planejamento.

## Pendências

- [ ] Validar com o time de negócio se o Consignado está ativo em produção hoje ou é legado
- [ ] Mapear Backend Workflows específicos do Consignado (check-in, check-out, troca, avaria, transferência)
- [ ] Mapear Privacy Rules específicas (provavelmente `Consig.Promotor` só vê seu próprio PDV)
- [ ] Confirmar se há Data API/Workflow API expostos especificamente para este módulo (ex.: app de PDV mobile separado consumindo a API?)
