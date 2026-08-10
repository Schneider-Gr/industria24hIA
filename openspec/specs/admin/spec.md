# Admin Specification

## Purpose
Painel administrativo: curadoria, moderação, CMS, financeiro e mediação. Estado: ✅ produção. Fonte: skills `industria24-marketplace`, `asaas-pagamentos`, `regras-de-negocio`; código em `(admin)/admin/*` (afiliados, analise-geral, auditoria, categorias, coletivas, destaques, editar-marketplace, entregas, galerias, leads, lojas, lotes, paginas, parceiros, pedidos, perfil, produtos, promocoes, repasses, usuarios, disputas — este último confirmado em `master`, não necessariamente no worktree local em uso).

## Requirements

### Requirement: Curadoria de produto com parecer
O sistema SHALL permitir que o admin aprove ou rejeite produtos submetidos pelo seller, registrando parecer; somente produtos com `StatusProduto = Aprovado` ficam visíveis na vitrine.

#### Scenario: Admin rejeita produto
- GIVEN um produto pendente de curadoria
- WHEN o admin rejeita com um parecer
- THEN o produto permanece fora da vitrine e o seller vê o motivo da rejeição

### Requirement: Fila de lotes de consolidação de carga
O sistema SHALL expor em `/admin/lotes` os lotes de pedidos elegíveis para frete consolidado (mesma loja, mesmo corredor de CEP), permitindo despacho manual do lote — nenhum lote consolidado é despachado automaticamente.

#### Scenario: Admin despacha um lote
- GIVEN um lote formado por pedidos elegíveis à consolidação
- WHEN o admin aciona o despacho em `/admin/lotes`
- THEN a corrida consolidada é criada para aquele lote

### Requirement: Ledger de repasses restrito a admin
O sistema SHALL restringir leitura e escrita da tabela `repasses` exclusivamente ao papel admin via RLS (`repasses_admin_all`); seller e afiliado não têm visão própria do ledger.

#### Scenario: Admin marca repasse como transferido
- GIVEN um repasse com status `pendente` após o PIX manual ter sido feito fora do sistema
- WHEN o admin marca o repasse como `transferido` em `/admin/repasses`
- THEN o status muda de `pendente` para `transferido`, sem nenhuma chamada à API do Asaas

### Requirement: Estorno de pedido pelo admin
O sistema SHALL permitir que o admin rode `admin_estornar_pedido(pedido_id, motivo)`, cancelando o pedido, liberando estoque de itens não transferidos e marcando repasses pendentes como `estornado`.

#### Scenario: Admin estorna pedido com problema
- GIVEN um pedido pago com repasses `pendente`
- WHEN o admin executa o estorno com um motivo
- THEN o pedido é cancelado e os repasses pendentes viram `estornado`

### Requirement: Tema visual do marketplace editável
O sistema SHALL permitir que o admin edite as cores do marketplace (`CorBotao`, `CorCards`, `CorFundo`, `CorHeader`, `CorTextoBotao`) em "Editar marketplace", tratando tema como dado configurável, não código fixo — hoje convive com a identidade fixa "Aço & Sinal".

#### Scenario: Admin altera cor do botão
- GIVEN a tela "Editar marketplace"
- WHEN o admin altera `CorBotao`
- THEN a nova cor é refletida no marketplace sem necessidade de deploy de código

### Requirement: CMS de páginas
O sistema SHALL permitir que o admin crie e edite páginas via `paginas_cms`, exibidas publicamente sem deploy de código.

#### Scenario: Admin publica nova página institucional
- GIVEN o admin criando uma página em `paginas_cms`
- WHEN ele publica
- THEN a página fica acessível publicamente sem qualquer deploy de código

### Requirement: Mediação de disputas de pós-venda
O sistema SHALL permitir que o admin visualize motivo, descrição, fotos do comprador e histórico de mensagens de uma disputa escalada, e registre decisão de reembolso — ver spec `pos-venda-disputas` para o fluxo completo.

#### Scenario: Reembolso parcial não pode exceder o valor do item
- GIVEN uma disputa em mediação pelo admin
- WHEN o admin tenta registrar uma decisão de reembolso parcial maior que o valor do item disputado
- THEN o sistema bloqueia a submissão e nenhuma decisão é gravada no banco

## Known Gaps
- Curadoria por IA (score de qualidade de anúncio) está em construção (MPDD-44), não confundir com aprovação manual já em produção.
- Auditoria de segurança (rotação de segredos, hardening) é tratada na skill `rls-seguranca`, fora do escopo funcional deste domínio.
