# Modelo de Dados — Industria24h

> **Fonte: extração real do editor Bubble** (ver `bubble-export/data-types/extracao-2026-07.md`).
> Substitui a versão anterior baseada só no PDF de engenharia reversa inicial.
> Status: nomes de tipos e visibilidade (Público/Privado) **confirmados**.
> Campos detalhados de cada tipo **majoritariamente pendentes** (ver nota técnica
> no final) — apenas `acessos` tem campos totalmente confirmados.

O app tem **70+ Data Types ativos**, divididos entre Públicos (sem Privacy Rule restritiva) e Privados (com Privacy Rules aplicadas). Há também tipos arquivados/excluídos, restauráveis.

---

## Tipos Públicos (visibilidade pública, sem Privacy Rule restritiva)

| Tipo | Observação |
|---|---|
| `acessos` | Único com campos confirmados — ver seção "Campos confirmados" abaixo |
| `Cep Estados` | Apoio a endereço |
| `cep-temp` | Apoio a endereço (temporário) |
| `consig.cxs.pedido` | Módulo Consignado — ver `consignado-module.md` |
| `Consig.Oferta` | Módulo Consignado |
| `Consig_Check_in` | Módulo Consignado |
| `Consig_Check_out` | Módulo Consignado |
| `credenciaisAPIs` | Armazenamento de credenciais de API — **sensível**, revisar Privacy Rule real mesmo estando marcado como "Público" |
| `CSVTransportadora` | Logística |
| `ecom.relacao_promotor_loja` | Afiliados/promotores |
| `empresa_solicitacao_credito` | Módulo de crédito |
| `envio_msg` | Comunicação |
| `erro` | Log de erros |
| `FaixaDeCEP` | ⚠️ **VESTIGIAL (confirmado Data API 2026-07-07)**: 13 regs, 10 micro-faixas Rio Branco/AC (AdValorem=32, resto 0) + 3 amplas sem valor; sem campo de valor-base/categoria — NÃO sustenta o frete vivo. Campos: CepInicial, CepFinal, ICMS, AdValorem, KgAdicional, PesoFinal |
| `fornecedor` | Fornecedores |
| `imgBanner` | Banners do marketplace |
| `Interesses` | Perfil de compra do usuário |
| `item_para_compra` | Carrinho/lista de compras |
| `marketplace` | Configuração visual global (equivalente ao `Marketplace` do doc anterior) |
| `mensagens_gpt` | Integração GPT Assistant |
| `notificacao` | Notificações |
| `novo_aparelho_BubbleWhats` | Integração WhatsApp |
| `perfil_de_compra` | Perfil do comprador |
| `quem_somos` | Conteúdo institucional |
| `Relacao_Afiliado.transporte_Loja` | Afiliados + logística |
| `relacao_produto_CD` | Produto x Centro de Distribuição |
| `Rota_transportadora` | Logística |
| `SubCategoria` | Categorização de produto |
| `temp` | Genérico temporário |
| `venda.futura` | Venda futura (equivalente ao `VendaFutura` do doc anterior) |

> ⚠️ "Público" no Bubble significa que não há Privacy Rule restringindo acesso — não necessariamente que o dado deve ser exposto publicamente na nova arquitetura. Cada um destes precisa de uma decisão consciente de RLS na migração (ver `privacy-rules.md`).

## Tipos Privados (Privacy Rules aplicadas)

| Tipo | Observação |
|---|---|
| `AgendaLoja` | Agenda da loja |
| `avaliacaoProduto` | Avaliações de produto |
| `Cards` | Possivelmente cartões de pagamento — **sensível, confirmar urgente** |
| `CardTime` | Apoio a `Cards`? |
| `Carrinho 0.1` | Carrinho de compras. **Campos confirmados via Data API 2026-07-07** (334 regs, dump `bubble-export/data/CarrinhoV01.json`): Comprador (User), itens_para_compra (lista), pedidoVendedor (245 viraram pedido, 89 abandonados) |
| `carrossel_icones` | UI |
| `CategoriaProdutos` | Categoria de produto |
| `Centrodedistribuicao` | Centro de distribuição (equivalente ao `CentroDistribuicao`) |
| `ComentEpergProduto` | Comentários e perguntas de produto |
| `comp_transferencia` | Comprovante de transferência (financeiro) |
| `consig.%.promotor_produto` | Módulo Consignado |
| `consig.avaria` | Módulo Consignado |
| `consig.corte_pedido` | Módulo Consignado |
| `Consig.desconto` | Módulo Consignado |
| `Consig.destino` | Módulo Consignado |
| `Consig.origem` | Módulo Consignado |
| `consig.pdtEstoq` | Módulo Consignado |
| `Consig.PDV` | Módulo Consignado |
| `Consig.Percentual` | Módulo Consignado |
| `Consig.Produto` | Módulo Consignado |
| `Consig.Promotor` | Módulo Consignado |
| `consig.rel_promotor.pdv` | Módulo Consignado |
| `consig.relacao.pdv.produto` | Módulo Consignado |
| `consig.resp_troca` | Módulo Consignado |
| `Consig.solici.Transfer` | Módulo Consignado |
| `consig.solici.troca` | Módulo Consignado |
| `consig.transacao` | Módulo Consignado |
| `Consig.Transfer` | Módulo Consignado |
| `consig.valorAtualProduto` | Módulo Consignado |
| `Consig.Venda.direta` | Módulo Consignado |
| `Consig.Venda.teorica` | Módulo Consignado |
| `Consig.Vendas.pdv` | Módulo Consignado |
| `endereco_user` | ⚠️ **VAZIO em produção (0 registros, confirmado via Data API 2026-07-07)** — endereço de entrega vive em `item_para_compra` |
| `LinhaItem` | ⚠️ **VAZIO em produção (0 registros, confirmado via Data API 2026-07-06)**. O item de venda real é `item_para_compra` — ver `data-api-reconciliation.md` |
| `Loja_ecommerce` | Loja (equivalente ao `Empresa` do doc anterior) |
| `mensagem` | Mensagens internas |
| `mensagens_enviadas_whats` | Log de mensagens WhatsApp enviadas |
| `PDV.Cliente` | Módulo Consignado — cliente de PDV |
| `PedidosVendedor` | Pedidos do vendedor/lojista |
| `Produto_ecommerce` | Produto (equivalente ao `Produto` do doc anterior) |
| `Promocaoprogressiva` | Promoção progressiva (equivalente ao `Promocao` do doc anterior, mais específico) |
| `Relacao_Afiliado_Loja` | Relação afiliado-loja |
| `Representantes` | Representantes comerciais |
| `socio_empresa_solicitacao_credito` | Módulo de crédito — sócio |
| `solicitacao_de_credito` | Módulo de crédito |
| `Transportadora` | Transportadora |
| `User` | Usuário (mesmo do doc anterior) |

> ⚠️ **`Cards`/`CardTime`** precisam de confirmação urgente — se armazenam dados de cartão de pagamento diretamente (em vez de apenas token/referência de um gateway), isso é um risco sério de compliance PCI-DSS que deve ser corrigido já na migração (nunca armazenar PAN/CVV; usar tokenização via Asaas/PagBank/PagSeguro).

## Correção do modelo anterior (baseado só no PDF)

O documento anterior (baseado no PDF de engenharia reversa inicial) usava nomes simplificados. Mapeamento para os nomes reais confirmados no Bubble:

| Nome no PDF inicial | Nome real no Bubble |
|---|---|
| `Empresa` | `Loja_ecommerce` |
| `Produto` | `Produto_ecommerce` |
| `LinhaDoItem` | `LinhaItem` |
| `VendaFutura` | `venda.futura` |
| `Promocao` | `Promocaoprogressiva` |
| `FaixaCEP` | `FaixaDeCEP` |
| `Marketplace` | `marketplace` |
| `CentroDistribuicao` | `Centrodedistribuicao` |

> ⚠️ `ConsorcioPromotor` do PDF inicial **não aparece com esse nome exato** na extração real — o mais próximo é o conjunto `Consig.Promotor` + `consig.rel_promotor.pdv` dentro do módulo Consignado, que é bem mais amplo do que o inicialmente mapeado. Recomenda-se tratar as regras de negócio de "Promotor" (`business-rules.md`) como pertencentes ao módulo Consignado (ver `consignado-module.md`), não como um tipo isolado.

## Módulo Consignado (nova descoberta)

Este módulo **não estava mapeado** no PDF de engenharia reversa inicial e representa mais de 20 Data Types (todos privados). Ver documento dedicado: **`consignado-module.md`**.

## Campos Confirmados

### `acessos` (Público)

| Campo | Tipo | Observação |
|---|---|---|
| `data_horario` | date | Data/hora do acesso |
| `geral` | text | Info geral |
| `pagina` | text | Página acessada |
| `user` | User | Usuário relacionado |
| `Creator` | User | Built-in |
| `Modified Date` | date | Built-in |
| `Created Date` | date | Built-in |
| `Slug` | text | Built-in |

### Demais tipos — campos inferidos por referência no canvas (não confirmados no painel Data Types)

| Tipo | Campos referenciados no canvas |
|---|---|
| `Produto_ecommerce` | `ImgProduto` (list), `nome`, `preço`, `loja`, `categoria` |
| `CategoriaProdutos` | `NomeCategoria`, `ImagemCategoria` |
| `Loja_ecommerce` | `nome`, `banner`, `localização` |
| `venda.futura` | `produto` (→ `Produto_ecommerce`), data de disponibilidade, estoque |
| `User` | `email`, `senha`, `perfil`, `endereço` |

> Todos os demais tipos possuem apenas os campos built-in do Bubble (`Creator`, `Modified Date`, `Created Date`, `Slug`) confirmados — os campos específicos ainda precisam ser extraídos clicando tipo a tipo no editor.

## Tipos Excluídos/Arquivados (restauráveis no Bubble)

Relevantes para entender a evolução do modelo de dados, especialmente onde há versionamento (ex.: `PedidosVendedor` atual vs. `PedidosVendedor (versão antiga)`):

`Carrinho`, `Carrinhos`, `CategoriaEstabelecimento`, `CategoriaProduto`, `ceps`, `Cliente`, `Compra`, `consig_processo_pedido`, `Consignado_Destino`, `Consignado_Fornecedor`, `Consignado_Origem`, `Consignado_serienota`, `Consorcio_Estoque`, `FretesRegiao`, `img`, `teste`, `PedidosVendedor (versão antiga)`, `Produto`, `Foto`, `Relacao_Afiliado.transporte_Loja (versão antiga)`

> Nota: `Carrinho 0.1` (ativo, privado) provavelmente substituiu `Carrinho`/`Carrinhos` (excluídos) — confirma padrão de versionamento manual do time no próprio nome do tipo.

## Próxima ação recomendada

1. No editor Bubble, clicar tipo a tipo (não navegar por URL) para carregar e capturar os campos customizados de cada Data Type — priorizando: `Produto_ecommerce`, `Loja_ecommerce`, `LinhaItem`, `User`, `PedidosVendedor`, e todo o módulo Consignado
2. Confirmar com urgência a natureza real de `Cards`/`CardTime` (risco de compliance)
3. Depois de completar os campos, gerar o Prisma Schema (Prioridade 3 em `migration.md`)
