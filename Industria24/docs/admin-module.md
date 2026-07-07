# Módulo Admin — engenharia reversa da UI real

> Fonte: navegação autenticada em `industria24h.com.br/admin` (2026-07-06, conta
> admin `andreiaschneider`). Mesma regra de confiança do `seller-module.md`.

## Posicionamento do negócio (confirmado pela página QUEM SOMOS)

Marketplace B2B industrial do Norte/Amazônia (Manaus). Conecta fabricantes,
produtores e prestadores de serviço a compradores. **Criar loja é grátis; a
plataforma cobra "uma pequena comissão por item vendido"** (os 5% vistos como
`repasse_ind`). Oferece centros de distribuição + fulfillment e intermedia
pagamentos.

## Números reais da plataforma (dashboard admin, jul/2026)

- 158 usuários criados · 17 lojas · 358 produtos · 250 pedidos · 21 afiliados.
- App em operação ativa (pedidos diários, pagamentos realizados).

## Inventário de telas (menu admin)

| Menu | Função |
|---|---|
| Dashboard | KPIs do mês (Valor, Produtos Vendidos), Vendas do mês (cross-seller), Vendas por categoria, Top Produtos |
| Análise Geral | Analytics agregada |
| Usuários | CRUD de usuários, "Criar usuário", "Subir usuários" (import) |
| Afiliados | Gestão global de afiliados, "Habilitar usuário" |
| Produtos | Todos os produtos, aprovação (Aprovado/Recusado), "Cadastrar Produto" |
| Lojas | Todas as lojas, aprovação (Ativa/Inativa/EmAnalise) |
| Categorias | CRUD da taxonomia (categorias + subcategorias) |
| Promoções | Gestão de promoções global |
| Editar Marketplace | Banners da home (desktop 1460x482, mobile 892x817) |
| Páginas | CMS de páginas institucionais (QUEM SOMOS etc.) |
| Pedidos | Todos os pedidos, status de pagamento |
| Entregas | Gestão de entregas/fulfillment |

## Campos reais por entidade (visão admin)

### `User` (Usuários)
- `name`, `email`, `data_criacao`, `is_lojista` (Sim/Não), `loja` (→ Loja)
- Ações admin: criar, importar em massa. 158 registros.
- (de `database.md`) também: `senha`, `perfil`, `endereço`. **Papéis reais**
  observados: admin, lojista/seller, afiliado, comprador, entregador,
  transportadora, fulfillment (6 fluxos de login).

### `Loja_ecommerce` (Lojas — visão admin)
- `nome`, `data_criacao`, `email`, `proprietario` (→ User), `status`,
  `situacao` (**Ativa | Inativa | EmAnalise**) → fluxo de aprovação de loja
- Campos de cadastro completos: ver `seller-module.md`.

### `Produto_ecommerce` (Produtos — visão admin)
- `nome`, `valor`, `data_criacao`, `status` (**Aprovado | Recusado | rascunho/
  Pendente**), `estoque_atual`, ações de moderação
- Regra confirmada: produto precisa de aprovação do admin para ir ao ar.

### `marketplace` (Editar Marketplace)
- Banners desktop (lista, 1460x482) e banners mobile (lista, 892x817). É a
  configuração visual global da home.

### Afiliados (visão global)
- `nome`, `email`, `produtos_afiliados` (count), `primeiro_vinculo` (data).
  21 afiliados. Admin pode habilitar usuário como afiliado.

### `PedidosVendedor` (Pedidos — visão admin)
- `comprador` (→ User), `data`, `total_itens`, `valor_pedido`, `repasse_ind`
  (5%), `status_pedido` (**Pagamento Realizado | Aguardando Pagamento**).
- Mesmo pedido pode aparecer em múltiplos estados (por linha / tentativa de
  pagamento) — modelar status por linha, não só por pedido.

### Páginas (CMS)
- Conteúdo institucional editável (QUEM SOMOS, e provavelmente termos, política,
  etc.). Modelar como tabela `paginas_cms(slug, titulo, conteudo_rich)`.

### Entregas
- Menu dedicado a fulfillment/entregas (não aberto campo-a-campo ainda).

## Diferenças chave admin vs seller (para RLS/roles)

- Admin enxerga **cross-seller** (coluna Vendedor em todas as tabelas). O seller
  só vê o próprio escopo. Isto define duas camadas de policy: `is_admin` libera
  leitura global; seller é escopado por `loja.owner_id`.
- Moderação (aprovar produto, ativar loja, habilitar afiliado) é exclusiva do
  admin → policies de UPDATE em `status`/`situacao` restritas a admin.

## Pendências (próxima passada)

- Forms campo-a-campo: "Criar usuário", "Cadastrar Produto" (admin), Categorias
  CRUD, Entregas, Análise Geral admin.
- Papéis/roles exatos e como o Bubble decide o painel de destino no login.
