## 1. Migrations: coleção do afiliado

- [x] 1.1 Checar colisão de número de migration em todas as branches/worktrees (skill `migrations-industria24`) antes de numerar
- [x] 1.2 Criar migration com tabela `afiliado_vitrines` (id, afiliado_id, nome, slug único, criado_em) — RLS deny-by-default, policy de leitura pública só por `slug`, policy de escrita restrita ao próprio `afiliado_id`
- [x] 1.3 Criar migration com tabela de junção `afiliado_vitrine_produtos` (vitrine_id, produto_id, afiliacao_id) com constraint garantindo que `afiliacao_id` pertence ao mesmo `afiliado_id` da vitrine
- [x] 1.4 Testar as duas migrations em `begin; ...; select` de verificação `; rollback;` via `supabase db query --linked` antes de aplicar
- [x] 1.5 Aplicar migrations e confirmar via `db query --linked` que tabelas, constraints e policies existem no schema real (não confiar em `migration list`)

## 2. Frontend: seleção na vitrine pública

- [x] 2.1 Adicionar checkbox de seleção no card de produto da vitrine, condicionado a `permite_afiliacao = true`
- [x] 2.2 Criar estado client-side de seleção em `localStorage`, seguindo o padrão de `src/components/carrinho/carrinho.tsx` (hidratação só no client, múltiplas lojas/produtos suportados)
- [x] 2.3 Adicionar contador de itens selecionados ao menu de conta existente no header (sem criar ícone novo)
- [x] 2.4 Botão "Afiliar selecionados": se não autenticado, aciona o fluxo de login existente preservando a seleção; se autenticado, vai direto para a tela de revisão

## 3. Backend: resolução de duplicidade e efetivação em lote

- [x] 3.1 Nova Server Action de consulta: dado um conjunto de `produto_id`, retornar quais já têm afiliação do usuário autenticado (status e id), para popular a tela de revisão
- [x] 3.2 Nova Server Action de efetivação em lote em `src/app/(afiliado)/afiliado/actions.ts`, reaproveitando a lógica de derivação de `loja_id`/`porcentagem_afiliado`/`identificador`/aceite de termos já usada em `solicitarAfiliacao` (linhas 36-92) em vez de duplicá-la
- [x] 3.3 Garantir que a Server Action ignore silenciosamente, na criação, qualquer `produto_id` que já tenha afiliação do usuário (defesa em profundidade — a tela de revisão já filtra, mas o servidor não deve confiar só no client)
- [x] 3.4 Validar `permite_afiliacao = true` para cada produto no momento da efetivação (não só na hora de exibir o checkbox)

## 4. Frontend: tela de revisão pós-login

- [x] 4.1 Página/modal de revisão: lista os produtos do lote, com nome, loja e comissão
- [x] 4.2 Exibir status de itens já afiliados (bloqueados para reenvio) separados dos itens novos
- [x] 4.3 Permitir remover item da revisão antes de confirmar
- [x] 4.4 Checkbox único de aceite dos Termos do Afiliado de Vendas cobrindo o lote inteiro; bloquear confirmação sem aceite
- [x] 4.5 Ao confirmar, chamar a Server Action de efetivação em lote e limpar a seleção do `localStorage`

## 5. Vitrine curada: montagem e publicação

- [x] 5.1 Server Actions de CRUD da coleção (`afiliado_vitrines`): criar, renomear, adicionar produto, remover produto — todas restritas ao `afiliado_id` do usuário autenticado
- [x] 5.2 Geração de slug único para a URL pública da coleção
- [x] 5.3 Tela dentro do painel do afiliado para nomear a coleção e escolher quais afiliações (existentes ou recém-criadas) entram nela
- [x] 5.4 Nova rota pública (`/vitrine-afiliado/[slug]` — nome final escolhido na implementação: `/afiliado/vitrine/[slug]` colidiria com o gate de login do layout de `/afiliado`) que lista os produtos da coleção sem exigir login
- [x] 5.5 Cada produto listado na página da coleção usa seu link individual (`?ref=<identificador>`) já existente — reaproveitar `CapturaRef`/cookie `afiliado_ref` sem alteração
- [x] 5.6 Copiar/compartilhar o link único da coleção a partir do painel do afiliado

## 6. Verificação

- [x] 6.1 Rodar os cenários dos dois specs manualmente — QA ao vivo na preview do PR #286 (conta de teste `industria24hs+qafiliadovitrine3@gmail.com`, produto real "Pao Italiano"/Loja Teste Tour QA): seleção anônima na vitrine → contador no header → `/afiliado/lote` bloqueia sem login → login → revisão mostra produto/loja/comissão → confirmação cria afiliação `Pendente` → coleção criada em `/afiliado/vitrines` → produto pendente listado como elegível e adicionado → página pública `/vitrine-afiliado/[slug]` lista o produto sem login. **Bug achado e corrigido nesta rodada**: o link do produto na página pública saía sem `?ref=` (client anon não lê `afiliacoes.identificador` por RLS) — corrigido com coluna `identificador` desnormalizada em `afiliado_vitrine_produtos` (migrations 0121/0122, commit 5bfad91); revalidado após redeploy: `?ref=N9TZ3R62AD` presente no link e cookie `afiliado_ref=N9TZ3R62AD` gravado ao abrir o PDP a partir da coleção. Falta apenas a compra real (6.4/6.5).
- [x] 6.2 Confirmar que a moderação existente do seller (`seller-afiliados`) continua funcionando sem alteração sobre as afiliações criadas em lote — nenhum arquivo de `seller/afiliados` foi tocado por este change; afiliações do lote usam a mesma tabela/status que o fluxo individual
- [x] 6.3 Confirmar com conta de teste que um usuário não consegue montar coleção com produto de afiliação que não é dele (tentativa direta via Server Action, não só pela UI) — validado via SQL direto em transaction/rollback: trigger `afiliado_vitrine_produtos_valida_dono` bloqueou com "Afiliação não pertence ao dono da vitrine."
- [ ] 6.4 Teste ponta a ponta de repasse: criar afiliação via lote, comprar o produto (conta de teste), confirmar entrega, e checar via `db query --linked` que `repasses` grava a linha `destino = 'afiliado'` com o `valor` e `porcentagem` corretos (migration 0111, `repasses_recalcular_pedido`) — sem transferência PIX automática, D-E4.1 confirma repasse ao afiliado feito pelo lojista fora da plataforma
- [ ] 6.5 Repetir 6.4 clicando a partir da página da coleção (não do link individual) e confirmar que o cookie `afiliado_ref` capturado foi o do produto comprado, não um identificador da coleção
- [ ] 6.6 Lote/coleção com produtos de `porcentagem_afiliado` diferentes: confirmar que cada repasse gerado usa o percentual do produto vendido, nunca um percentual de outro item do mesmo lote/coleção
- [ ] 6.7 Confirmar em `seller/pedidos` que o lojista vê o `repasse_afiliado` de uma venda originada por afiliação em lote/coleção, igual já vê hoje para afiliação individual (sem UI nova, só sem regressão)
