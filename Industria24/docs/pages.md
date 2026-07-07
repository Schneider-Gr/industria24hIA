# Páginas — Industria24h

> **Fonte: extração real do editor Bubble.** Substitui a lista simplificada
> anterior. O app tem páginas para **quatro fluxos de autenticação
> separados** (marketplace, seller, consignado, fulfillment), além de
> versões mobile dedicadas de várias páginas — isso não estava capturado
> na documentação anterior.

## Marketplace Público

| Página | Uso |
|---|---|
| `index` | Home |
| `index_nova` | Versão nova da home (A/B ou migração em andamento?) |
| `indexmobile` | Home mobile |
| `categorias` | Listagem de categorias |
| `loja` | Página da loja |
| `lojas` | Listagem de lojas |
| `produto` | Página do produto |
| `produtomobile` | Produto mobile |
| `produtocategoria` | Produto por categoria |
| `produtos_relacionados` | Produtos relacionados |
| `produto_futuro` | Produto futuro / venda futura |
| `ofertadodia` | Oferta do dia |
| `supermercado` | Supermercado (linha de produto específica?) |
| `carrinho` | Carrinho de compras |
| `checkout` | Processo de checkout |
| `historico` | Histórico de pedidos |
| `meuspedidos` | Meus pedidos |
| `perfil` | Perfil do usuário |
| `perfilmobile` | Perfil mobile |
| `login` | Login |
| `login_marketplace` | Login específico do marketplace |
| `conectar_telefone` | Conectar telefone (verificação/2FA?) |
| `reset_pw` | Reset de senha |
| `contato` | Contato |
| `quem_somos` | Quem somos |
| `politica-de-privacidade` / `politica_de_privacidade` | Política de privacidade (duas versões — confirmar qual está ativa) |
| `termos_de_uso` | Termos de uso |
| `precisa-de-ajuda` | Suporte |
| `tira_duvida` | Tira dúvidas |
| `404` | Página de erro |
| `pagina_de_testes` | Página de testes (não deve ir para produção) |

## Seller

| Página | Uso |
|---|---|
| `seller` | Painel seller/vendedor |
| `login_seller` | Login seller |
| `promotor_ecommerce` | Painel promotor e-commerce |
| `supervisor_ecommerce` | Painel supervisor e-commerce |

## Admin

| Página | Uso |
|---|---|
| `admin` | Painel administrativo |

## Consignado (módulo novo — ver `consignado-module.md`)

| Página | Uso |
|---|---|
| `consignado` | Módulo consignado |
| `cadastro_consignado` | Cadastro de consignado |
| `login_consignado` | Login consignado (separado!) |

## Logística / Fulfillment

| Página | Uso |
|---|---|
| `entregador` | Painel do entregador |
| `painel_transportadora` | Painel transportadora |
| `painel_fulfillment` | Painel fulfillment |
| `login_fulfillment` | Login fulfillment |
| `cadastro_centro` | Cadastro de centro de distribuição |

## Afiliados

| Página | Uso |
|---|---|
| `afiliadologistica` | Painel do afiliado logístico |
| `painelafiliado` | Painel do afiliado |
| `loja_afiliado` | Loja do afiliado |

## Crédito

| Página | Uso |
|---|---|
| `analise_de_credito` | Análise de crédito |

## Login Journal (páginas de auth — resumo)

O app tem **6 pontos de login distintos**: `login` (genérico), `login_marketplace`, `login_seller`, `login_consignado`, `login_fulfillment`, mais `conectar_telefone` como possível segunda etapa. Isso é um sinal forte de que os papéis de usuário (`lojista`, `superadm`, `promotoradm`, `afiliado` — ver `database.md`) na prática se comportam como **aplicações distintas** com pontos de entrada próprios, mesmo compartilhando o mesmo `User` como Data Type.

> **Implicação para a migração:** o desenho de `apps/web`, `apps/seller`, `apps/admin` (ver `architecture.md`) provavelmente precisa virar `apps/web`, `apps/seller`, `apps/admin`, `apps/consignado`, `apps/fulfillment` — cada um com seu próprio fluxo de login, todos compartilhando a mesma tabela `users` no Supabase com RLS por papel.

## Página de testes

`pagina_de_testes` — confirmar que não é referenciada por nenhum fluxo de produção antes de excluir da migração.
