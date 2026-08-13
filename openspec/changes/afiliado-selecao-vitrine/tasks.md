## 1. Migrations: coleção do afiliado

- [ ] 1.1 Checar colisão de número de migration em todas as branches/worktrees (skill `migrations-industria24`) antes de numerar
- [ ] 1.2 Criar migration com tabela `afiliado_vitrines` (id, afiliado_id, nome, slug único, criado_em) — RLS deny-by-default, policy de leitura pública só por `slug`, policy de escrita restrita ao próprio `afiliado_id`
- [ ] 1.3 Criar migration com tabela de junção `afiliado_vitrine_produtos` (vitrine_id, produto_id, afiliacao_id) com constraint garantindo que `afiliacao_id` pertence ao mesmo `afiliado_id` da vitrine
- [ ] 1.4 Testar as duas migrations em `begin; ...; select` de verificação `; rollback;` via `supabase db query --linked` antes de aplicar
- [ ] 1.5 Aplicar migrations e confirmar via `db query --linked` que tabelas, constraints e policies existem no schema real (não confiar em `migration list`)

## 2. Frontend: seleção na vitrine pública

- [ ] 2.1 Adicionar checkbox de seleção no card de produto da vitrine, condicionado a `permite_afiliacao = true`
- [ ] 2.2 Criar estado client-side de seleção em `localStorage`, seguindo o padrão de `src/components/carrinho/carrinho.tsx` (hidratação só no client, múltiplas lojas/produtos suportados)
- [ ] 2.3 Adicionar contador de itens selecionados ao menu de conta existente no header (sem criar ícone novo)
- [ ] 2.4 Botão "Afiliar selecionados": se não autenticado, aciona o fluxo de login existente preservando a seleção; se autenticado, vai direto para a tela de revisão

## 3. Backend: resolução de duplicidade e efetivação em lote

- [ ] 3.1 Nova Server Action de consulta: dado um conjunto de `produto_id`, retornar quais já têm afiliação do usuário autenticado (status e id), para popular a tela de revisão
- [ ] 3.2 Nova Server Action de efetivação em lote em `src/app/(afiliado)/afiliado/actions.ts`, reaproveitando a lógica de derivação de `loja_id`/`porcentagem_afiliado`/`identificador`/aceite de termos já usada em `solicitarAfiliacao` (linhas 36-92) em vez de duplicá-la
- [ ] 3.3 Garantir que a Server Action ignore silenciosamente, na criação, qualquer `produto_id` que já tenha afiliação do usuário (defesa em profundidade — a tela de revisão já filtra, mas o servidor não deve confiar só no client)
- [ ] 3.4 Validar `permite_afiliacao = true` para cada produto no momento da efetivação (não só na hora de exibir o checkbox)

## 4. Frontend: tela de revisão pós-login

- [ ] 4.1 Página/modal de revisão: lista os produtos do lote, com nome, loja e comissão
- [ ] 4.2 Exibir status de itens já afiliados (bloqueados para reenvio) separados dos itens novos
- [ ] 4.3 Permitir remover item da revisão antes de confirmar
- [ ] 4.4 Checkbox único de aceite dos Termos do Afiliado de Vendas cobrindo o lote inteiro; bloquear confirmação sem aceite
- [ ] 4.5 Ao confirmar, chamar a Server Action de efetivação em lote e limpar a seleção do `localStorage`

## 5. Vitrine curada: montagem e publicação

- [ ] 5.1 Server Actions de CRUD da coleção (`afiliado_vitrines`): criar, renomear, adicionar produto, remover produto — todas restritas ao `afiliado_id` do usuário autenticado
- [ ] 5.2 Geração de slug único para a URL pública da coleção
- [ ] 5.3 Tela dentro do painel do afiliado para nomear a coleção e escolher quais afiliações (existentes ou recém-criadas) entram nela
- [ ] 5.4 Nova rota pública (ex.: `/afiliado/vitrine/[slug]`) que lista os produtos da coleção sem exigir login
- [ ] 5.5 Cada produto listado na página da coleção usa seu link individual (`?ref=<identificador>`) já existente — reaproveitar `CapturaRef`/cookie `afiliado_ref` sem alteração
- [ ] 5.6 Copiar/compartilhar o link único da coleção a partir do painel do afiliado

## 6. Verificação

- [ ] 6.1 Rodar os cenários dos dois specs (`specs/afiliado-selecao-lote/spec.md`, `specs/afiliado-vitrine-curada/spec.md`) manualmente: seleção anônima, login preservando seleção, revisão com item duplicado, efetivação em lote, montagem e publicação da coleção, compra a partir da página da coleção creditando o produto correto
- [ ] 6.2 Confirmar que a moderação existente do seller (`seller-afiliados`) continua funcionando sem alteração sobre as afiliações criadas em lote
- [ ] 6.3 Confirmar com conta de teste que um usuário não consegue montar coleção com produto de afiliação que não é dele (tentativa direta via Server Action, não só pela UI)
- [ ] 6.4 Teste ponta a ponta de repasse: criar afiliação via lote, comprar o produto (conta de teste), confirmar entrega, e checar via `db query --linked` que `repasses` grava a linha `destino = 'afiliado'` com o `valor` e `porcentagem` corretos (migration 0111, `repasses_recalcular_pedido`) — sem transferência PIX automática, D-E4.1 confirma repasse ao afiliado feito pelo lojista fora da plataforma
- [ ] 6.5 Repetir 6.4 clicando a partir da página da coleção (não do link individual) e confirmar que o cookie `afiliado_ref` capturado foi o do produto comprado, não um identificador da coleção
- [ ] 6.6 Lote/coleção com produtos de `porcentagem_afiliado` diferentes: confirmar que cada repasse gerado usa o percentual do produto vendido, nunca um percentual de outro item do mesmo lote/coleção
- [ ] 6.7 Confirmar em `seller/pedidos` que o lojista vê o `repasse_afiliado` de uma venda originada por afiliação em lote/coleção, igual já vê hoje para afiliação individual (sem UI nova, só sem regressão)
