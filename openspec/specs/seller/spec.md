# Seller (Painel do Lojista) Specification

## Purpose
Ciclo de vida do lojista, do cadastro à primeira venda, e o painel `/seller` com paridade validada em relação ao Bubble legado. Estado: ✅ produção. Fonte: skill `onboarding-seller`; código em `(seller)/seller/*` (ads, afiliados, analise-geral, central-de-duvidas, centros, coletivas, credito, leiloes, mensagens, minha-loja, parceiro-logistica, pedidos, produtos, promocoes, reputacao, rotas, tutoriais, venda-futura).

## Requirements

### Requirement: Fluxo de onboarding do lojista
O sistema SHALL seguir a sequência Cadastro → Onboarding (dados da loja) → Aprovação → Chave PIX cadastrada → Aceite de termos → Produtos em curadoria → Primeira venda → Repasse.

#### Scenario: Novo lojista completa onboarding
- GIVEN um usuário concluindo o cadastro de loja
- WHEN ele passa por aprovação, cadastro de chave PIX e aceite de termos
- THEN só então pode cadastrar produtos que entram em fila de curadoria

### Requirement: Cadastro de chave PIX com trilha de auditoria
O sistema SHALL registrar toda mudança de chave PIX do lojista em trilha de auditoria, tratando o evento como sensível (potencial indicador de conta comprometida).

#### Scenario: Lojista altera a chave PIX
- GIVEN uma loja com chave PIX já cadastrada
- WHEN o lojista altera a chave
- THEN a mudança é registrada em trilha de auditoria com quem alterou e quando

### Requirement: Produto do seller entra em curadoria
O sistema SHALL manter todo produto cadastrado pelo seller em fila de curadoria até o admin aprovar (`StatusProduto = Aprovado`); somente então o produto aparece na vitrine.

#### Scenario: Produto recém-cadastrado
- GIVEN um seller cadastrando um novo produto
- WHEN o produto é salvo
- THEN ele entra na fila de curadoria do admin e não aparece na vitrine até ser aprovado

### Requirement: Painel com 13 seções em paridade Bubble
O sistema SHALL manter as 13 seções do painel `/seller` (produtos, promoções, venda futura, pedidos com repasse e transferência, centros, afiliados, tour guiado, entre outras) sem remover funcionalidade validada como paridade Bubble sem pedido explícito.

#### Scenario: Tela de pedidos do seller mostra repasse
- GIVEN um pedido pago vinculado à loja do seller
- WHEN o seller acessa a tela de pedidos
- THEN a tela exibe o Repasse Ind (5%), o badge de Transferência e a coluna de Venda Futura quando aplicável

### Requirement: Gate B2B para Mercado Futuro
O sistema SHALL exigir CNPJ/IE validados (migration 0036) do seller/comprador antes de liberar operações de Mercado Futuro.

#### Scenario: Seller sem CNPJ/IE tenta usar Mercado Futuro
- GIVEN um seller sem CNPJ/IE validados
- WHEN ele tenta cadastrar ou operar produto de venda futura
- THEN o sistema bloqueia até o CNPJ/IE ser validado

## Known Gaps
- Loja pode nascer "Ativa" sem completar onboarding — bug conhecido, causa raiz não corrigida no código; qualquer trabalho em cadastro de loja deve considerar corrigir isso.
- DICT lookup de chave PIX ainda pendente.
- Crédito/Parceiro logística (PR #35) não mergeado — não tratar como existente.
- `preco_faixa` (desconto B2B por faixa de quantidade no cadastro do seller) ainda pendente.
