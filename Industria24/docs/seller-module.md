# Módulo Seller — engenharia reversa da UI real

> Fonte: navegação autenticada no painel `industria24h.com.br/seller` (2026-07-06,
> sessão do seller `vivahidroponicos.vendas@gmail.com`). Campos abaixo são os
> **labels/placeholders reais dos formulários** — confiança mais alta que a inferência
> por canvas de `database.md`, mas ainda a reconciliar com a Data API (tipos exatos,
> relações e campos não-visíveis na UI).

## Contexto que os docs anteriores erraram

- O app **é um marketplace B2B geral**, não hortifruti nem "industrial/supermercado".
  As categorias de produto reais são: **Supermercado, Pet Shop, Material de
  Construção, Verduras, Legumes, Madeira, Agro, Combustíveis, Eletrodomésticos**.
  Este seller (`vivahidropônicos`) é de hortaliças; é um caso de uso, não a plataforma.
- **O app está transacionando de verdade** (não "piloto parado"): pedidos reais
  diários em jul/2026, "Pagamento Realizado", repasses calculados. Migração tem
  risco de regressão real; tratar como sistema vivo.

## Inventário de telas (menu lateral do seller)

| Menu | Estado interno | Função |
|---|---|---|
| Dashboard | `pedidos` | Visão geral de pedidos + contador |
| Análise Geral | `analisegeral` | KPIs de venda + tabela "Vendas Geral" com repasse |
| Produtos | `produtos` | CRUD de produtos, KPIs de estoque |
| Afiliados produtos | `representantes` | Gestão de afiliados/representantes por produto |
| Centro de distribuição | `centro` | CRUD de centros de distribuição |
| Promoções | `progressivo` | Descontos progressivos por produto |
| Venda Futura | `vendafutura` | Produtos com previsão de disponibilidade |
| Pedidos | `pedidos` | Lista de pedidos com status/entrega |
| Minha Loja | `minhaloja` | Dados cadastrais + branding da loja |
| Dados | (analytics) | (mesma base de Análise Geral) |
| Tutoriais / Central de Dúvidas | — | Conteúdo estático |

## Entidades e campos reais (derivados dos formulários)

### `Loja_ecommerce` (Minha Loja → Dados Cadastrais / Editar Loja)
- Branding: `logotipo` (upload), `banner` (upload, 1580x450), `nome`, `descricao`
- Cadastrais: `nome` *, `cnpj` *, `whatsapp`, `chave_pix`, `tipo_chave_pix`
  (enum: CNPJ | CPF | EMAIL | PHONE), `email`
- Endereço: `cep`, `cidade`, `bairro`, `rua`, `numero`, `estado` (UF, 27 opções),
  `complemento`
- Config: `permite_retirada_na_loja` (bool)

### `Produto_ecommerce` (Produtos → Cadastrar Novo)
- `imagem(ns)` (upload, provável lista), `nome`, `valor` (preço), `descricao`
- Estoque: `quantidade_minima`, `estoque_atual`, `sku`
- Localização: `cep_produto` ("onde o produto se encontra")
- Afiliação: `permite_afiliacao` (SIM/NÃO), `porcentagem_afiliado` (default 5)
- Taxonomia: `categoria` (→ CategoriaProdutos), `subcategoria` (→ SubCategoria)
- Logística/frete: `altura`, `comprimento`, `largura`, `peso`
- Distribuição: `centros_distribuicao` (multi, "seus" + "outros")
- KPIs derivados na tela: Total Produtos (27), Valor total em estoque
  (R$15.455,50), Estoque Crítico (2 = quantos abaixo do mínimo)

### `Centrodedistribuicao` (Centro de distribuição)
- `nome`, `localizacao` (ex.: "Manaus, Rua Marapatá"), `data_cadastro`, `status`
  (Ativo/…), relação com o seller (dono)

### `PedidosVendedor` + `LinhaItem` (Pedidos / Análise Geral)
- Pedido: `id_venda` (ex.: `3F9U882N5J`, alfanum. 10 chars), `cliente` (→ User),
  `data`, `quantidade`, `status_pedido` (ex.: "Pagamento Realizado"),
  `valor_pedido`
- Contadores de fulfillment: `transferidos` ("0 de 1"), `entregues` ("1 de 1")
  → indica itens/linhas por pedido com estados próprios
- Linha/analytics: `item` (nomes dos produtos), `valor`, **`repasse_ind`**
  (= 5% do valor; confirmado: R$1,50 sobre R$30, R$62,25 sobre R$1.245)

### `venda.futura` (Venda Futura)
- `produto` (→ Produto_ecommerce), `previsoes` (datas de disponibilidade), ações

### `Promocaoprogressiva` (Promoções)
- Por produto: `descontos_aplicados` (lista de faixas de desconto progressivo)

### Afiliados / `Representantes` (Afiliados produtos)
- `nome_representante` (email ou nome), `produto` (→ Produto), `porcentagem`
  (0,5%–2%), `data`, `status` (Aprovada | Suspensa | Pendente)
- KPIs: Pedidos afiliação (37), Pedidos Pendentes (1)

### Taxonomia real
- `CategoriaProdutos`: Supermercado, Pet Shop, Material de Construção, Verduras,
  Legumes, Madeira, Agro, Combustíveis, Eletrodomésticos
- `SubCategoria` (exemplos vistos): hortaliças, Ração, Fertilizante, Tijolo
- Filtro de loja usa outra taxonomia (Frutas Cítricas, Folhas Verdes, Vegetais de
  Raiz…) — provável campo separado ou taxonomia legada. **A confirmar.**

## Regras de negócio confirmadas pela UI

- Repasse plataforma = **5%** por linha (coluna "Repasse Ind" bate em todos os
  pedidos amostrados). Confirma `business-rules.md`.
- Afiliação por produto com percentual próprio (`porcentagem_afiliado`), aprovável
  /suspensável pelo seller.
- Estoque crítico = itens com `estoque_atual < quantidade_minima`.
- Pedido tem estados de pagamento e de fulfillment separados (transferido vs
  entregue), contados por linha.

## Bloqueios / pendências

- **Painel `/admin` inacessível** nesta sessão: a conta logada é seller, não admin;
  `/admin` redireciona para a home da loja. Reverter o admin exige login numa conta
  admin no Chrome do usuário.
- Tipos de dado exatos, campos não-expostos na UI, e as relações (FKs) só se
  confirmam cruzando com a Data API (`/api/1.1/obj/<tipo>`) ou o editor Bubble.
- Detalhe de pedido (modal por linha), forms de Venda Futura / Promoção / Centro
  não foram abertos campo-a-campo ainda; próxima passada.
