# Reconciliação Data API ↔ schema Supabase

> **Extração real** via Bubble Data API (live) em **2026-07-06**. Dump completo em
> `bubble-export/data/*.json` (fora do repo git; contém PII — não versionar).
> Inventário campo-a-campo com ocorrências em `bubble-export/data/_inventario_campos.json`.

## Contagens (live, 06/07/2026)

| Data Type | n | Tabela Supabase (0002) |
|---|---|---|
| `User` | 158 | `auth.users` (+ perfil) |
| `Loja_ecommerce` | 19 | `lojas` |
| `Produto_ecommerce` | 358 | `produtos` |
| `PedidosVendedor` | 251 | `pedidos` |
| `item_para_compra` | **253** | `linha_itens` |
| `venda.futura` | 18 | `vendas_futuras` |
| `Promocaoprogressiva` | 46 | `promocoes_progressivas` |
| `CategoriaProdutos` | 9 | `categorias` |
| `SubCategoria` | 4 | `subcategorias` |
| `Centrodedistribuicao` | 5 | `centros_distribuicao` |
| `Relacao_Afiliado_Loja` | 51 | `afiliacoes` (revisar: é por LOJA, não por produto) |
| `FaixaDeCEP` | 13 | — (frete, sem tabela ainda) |
| `marketplace` | 1 | — (config global, sem tabela ainda) |

## Descobertas que mudam o plano

1. **`LinhaItem` está VAZIO (0 registros).** O item de venda real é
   **`item_para_compra`** (253 registros; 233 referenciados por pedidos, 20 órfãos
   = carrinhos abandonados). O doc `database.md` listava `LinhaItem` como
   equivalente de `LinhaDoItem` — na prática não é usado.
2. **Pedido multi-vendedor: estrutura permite, produção tem ZERO casos.**
   `PedidosVendedor.vendedores` é lista, mas nos 251 pedidos nenhum tem mais de
   1 vendedor distinto → migrar 1:1 para `pedidos.loja_id` é seguro.
3. **Repasse, entrega e endereço vivem no ITEM, não no pedido.**
   `item_para_compra` carrega `repasse_ind24`, `repasse_vendedor`,
   `repasse_afiliado`, `PAGO`, `Entregue`, `Lojista ja recebeu`, `cod_entrega`,
   endereço de entrega completo e `comprovante_pagamento_lojista`. Nosso
   `linha_itens` cobre os repasses/flags, mas **não tem endereço de entrega nem
   comprovante** — campos a adicionar em migration futura.
4. **Admin real = `User.SuperADM = true` → 6 contas.** Seed da tabela `admins`
   (migration 0004) sai daí. Outros papéis: `Lojista` (11), `afiliado` (21),
   `PromotorADM`, `expedicao` (34), `adm_dev` (1).
5. **Preço do produto tem 2 campos redundantes**: `PrecoProduto` (143) e
   `ValorProduto` (110); nos 70 produtos com ambos, **0 divergências** →
   `valor = coalesce(PrecoProduto, ValorProduto)`. ⚠️ **175/358 produtos não têm
   preço nenhum** (rascunhos / "Em analise") — decidir: importar com `valor=0`
   ou não importar (nosso `produtos.valor` é `not null`).
6. **Status com valores reais confirmados:**
   - `StatusProduto`: `Aprovado` 95, `Em analise` 182, `Recusado` 8, ausente 73.
   - `statusLoja`: `Ativa` 15, `Inativa` 4.
   - `Status` (pedido): `Pagamento Realizado` 133, `Aguardando Pagamento` 115, ausente 3.
7. **`endereco_user` está vazio**; endereço do comprador vive em campos `End*`
   direto no `User` (e no item, no momento da compra).
8. **Afiliação em produção é por LOJA** (`Relacao_Afiliado_Loja`, 51 registros);
   nossa tabela `afiliacoes` é por produto — reconciliar antes de migrar.
9. **Asaas**: `User."ID cliente Asaas"` (51), pedido tem `ID Cobrança_asaas`,
   `LinkCobranca`, `valor_recebido_pelo_industria` — preservar na migração para
   não perder rastro financeiro.

## Mapeamento core (campos com dados reais)

### `Loja_ecommerce` → `lojas`
`NomeFantasia`→nome · `CNPJ`→cnpj · `DescricaoLoja`→descricao · `Logotipo`→logotipo_url ·
`Banner`→banner_url · `Whatsapp`→whatsapp · `Email`→email · `ChavePix`→chave_pix ·
`TipoChavePix`→tipo_chave_pix · `Cep`→cep · `Cidade`→cidade · `EndBairro`→bairro ·
`endRua`→rua · `endNUM`→numero · `Estado`→estado · `complementoEND`→complemento ·
`RetiradaNaLoja`("Ativo"/"Inativo")→permite_retirada_na_loja · `statusLoja`→situacao ·
`_Dono_Proprietario`→owner_id (via mapa User→auth.users).
Sem destino ainda: `ValorPedidoMinimo`, `Promotor`, `ID_LOJA`, `transfere_pelo_painel`, `RazaoSocial`.

### `Produto_ecommerce` → `produtos`
`NomeDoProduto`→nome · `DescricaoDoProduto`→descricao · coalesce(`PrecoProduto`,`ValorProduto`)→valor ·
`Referencia_SKU`→sku · `Quantidade_Minima`→quantidade_minima · `Estoque_Atual`→estoque_atual ·
`ceptext`/`ProdutoCEP`→cep_produto · `CategoriaProduto`→categoria_id · `SubCategoria`→subcategoria_id ·
`permiteAfiliacao`→permite_afiliacao · `%afiliado`→porcentagem_afiliado · `AlturaProduto`→altura ·
`Comprimento_do_Produto`→comprimento · `LarguraDoProduto`→largura · `PesoDoProduto`→peso ·
`StatusProduto`→status_produto · `ImgProduto`(lista)→`produto_imagens` · `Cds_disponiveis`→`produto_centros`.
Sem destino ainda: `EmOferta`, `ValorCusto`, `*FaixaDeCEP`, `FreteGratis`, `valor.minimo.frete`,
`peso_cubado`, `contagem.cliques`, `permite.consignado` (Fase 2), `permiteVendaFutura`, `excluido`.

### `PedidosVendedor` → `pedidos`
`id_cobranca`→id_venda · `vendedores[0]`→loja_id (via mapa Loja) · `Created By`→cliente_id ·
`Created Date`→data · `Status`→status_pedido · `Total`→valor_pedido.
Preservar (campos a criar): `ID Cobrança_asaas`, `LinkCobranca`, `forma_pagamento`,
`Dt.Pagamento`, `repasse_ind24`, `valor_recebido_pelo_industria`.

### `item_para_compra` → `linha_itens`
Ligação: `PedidosVendedor.itens[]` contém `_id` do item (também `idcompra`↔`id_cobranca`).
`Produto`→produto_id · `Qntd`→quantidade · `Valortotal`→valor · `repasse_ind24`→repasse_ind ·
`repasse_afiliado`→repasse_afiliado · `Lojista ja recebeu`→transferido · `Entregue`→entregue ·
`PAGO`→pago.
Campos a criar em migration futura: endereço de entrega do item (`EntregaCep`, `rua_entrega`,
`Entregabairro`, `entregaNUM`, `complemento`, `cidadeEntrega`), `cod_entrega`, `data_entrega`,
`ValorFrete`, `retirar_na_loja`, `repasse_vendedor`, `comprovante_pagamento_lojista`,
`dt_pagamento_pelo_cliente`, `Cd_selecionado`, `vendaFutura`, `DescontoProgressivoPassado`.

## Decisões pendentes (user)

- D-mig1: produtos sem preço (175) — importar com `valor=0` ou excluir?
- D-mig2: itens órfãos (20, carrinho abandonado) — descartar?
- D-mig3: afiliação por loja vs por produto — qual modelo fica no novo app?
- D-mig4: users — migrar como? (Supabase Auth exige convite/reset de senha; hash do Bubble não exporta)
