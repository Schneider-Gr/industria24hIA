## 0. Antes de escrever qualquer SQL

- [x] 0.1 Reler a definição **vigente em produção** de `checkout_criar_pedido` com `supabase db query --linked`. Confirmado: `0.05` aparece **uma vez só**, no overload `(jsonb,jsonb,text)` de 15.652 caracteres; os overloads de 4, 5 e 6 argumentos apenas delegam
- [x] 0.2 Conferir colisão de número. `0178` é o maior em master, `0179` existe em branch e em produção, `0180` está livre. Rechecar antes do push
- [x] 0.3 Baseline de produção levantado em 17/09 (`tiwdqgyeyvceaiqqwitc`): 223 produtos, **117 sem categoria**, 185 sem subcategoria, 10 categorias, 9 subcategorias, 22 lojas
- [x] 0.4 Worktree própria a partir de `origin/master`: `web-wt-comissao2`, branch `feat/comissao-por-categoria`. ⚠ O checkout principal `web/` está sujo em `fix/recentes-grade-cheia`, de outra sessão

## 1. Regra de comissão no banco (migration `0180`)

- [x] 1.1 `categorias.comissao_pct` e `subcategorias.comissao_pct`, `numeric(5,2)` anuláveis, com check de faixa 0 a 100
- [x] 1.2 `linha_itens.repasse_ind_pct`, `numeric(5,2)` anulável, como snapshot. Linha antiga fica nula e é lida como 5%
- [x] 1.3 Função `comissao_pct_item(categoria_id, subcategoria_id)`, estável, com a precedência por `coalesce` nível a nível, para que `0` não seja confundido com ausência
- [x] 1.4 Regenerar `checkout_criar_pedido` por script a partir do `pg_get_functiondef` de produção, com cinco inserções por âncora única. **Não transcrever à mão**
- [x] 1.5 Recusa quando comissão somada à do afiliado passa de 100% do item
- [x] 1.6 Testar a migration inteira em `begin; ... rollback;` antes de aplicar. Três cenários verificados em 17/09: sem taxonomia cobra 5% e grava snapshot `5.00`; subcategoria a 10% cobra `1,02` sobre `10,20` e grava `10.00`, com o afiliado intacto; subcategoria a 96% com afiliado de 5% recusa o pedido nomeando produto e percentuais
- [x] 1.7 **APLICADA em produção em 17/09.** Aplicar por `supabase db query --linked --file`. ⚠ `db push` não é confiável neste projeto, o histórico está sob drift
- [x] 1.8 Confirmado no schema em 17/09: três colunas presentes, `comissao_pct_item(null,null)` devolve 5, zero nós com percentual, `checkout_criar_pedido` chamando a função. Confirmar no schema real que as três colunas e a função existem depois de aplicar, em vez de confiar em `migration list`

## 2. Taxonomia (migration `0182`)

- [x] 2.1 Árvore e classificação homologadas pela dona em 17/09. A árvore final tem **5 categorias e 22 subcategorias**
- [x] 2.2 Criar a árvore nova com todos os `comissao_pct` em `NULL`, para que nenhum preço efetivo mude no dia do deploy
- [x] 2.3 Reclassificar os 223 produtos com casamento por **palavra inteira**. ⚠ Substring classifica hortelã como tela de sombreamento, em silêncio
- [x] 2.4 Os 7 registros de lixo vão para `status_produto = 'Recusado'`, não são apagados: **um deles tem `linha_itens`**, e apagar produto com histórico quebraria o extrato
- [x] 2.5 Remoção só de nó sem produto. Verificado em 17/09 que **nenhuma regra de cupom aponta para categoria**: `cupom_regras` usa `(alvo, alvo_id)` e só tem `loja` (2) e `produto` (7)
- [ ] 2.6 (adiado, fora desta entrega) Coluna `google_taxonomy_id` opcional por nó, preenchida onde houver equivalente na Google Product Taxonomy, para exportação futura de feed

## 3. Painel administrativo

- [x] 3.1 Campo de percentual por categoria e por subcategoria em `/admin/categorias`, um por nó, editáveis de forma independente
- [x] 3.2 Exibir a origem do percentual efetivo: próprio, herdado da categoria, ou padrão do sistema
- [x] 3.3 Exibir o repasse do seller como leitura ao lado do campo, calculado como complemento
- [x] 3.4 Exibir a contagem de produtos por nó
- [x] 3.5 Action de gravação com normalização de vírgula, espaço e símbolo de porcentagem, e com `exigirAdmin()` como as demais actions do arquivo
- [x] 3.6 Campo vazio grava `NULL` e devolve a herança; `0` grava zero

## 4. Visibilidade para quem recebe

- [x] 4.1 Exibir o percentual aplicado por item na tela de pedidos do seller, lido de `repasse_ind_pct`
- [x] 4.2 Linha sem snapshot é exibida como 5%
- [x] 4.3 Linha de pedido migrado do Bubble cujo valor não corresponde a percentual calculável exibe apenas o valor em reais

## 5. Verificação

- [x] 5.1 Precedência verificada no banco, onde a regra vive, em transação revertida: `cat10_sem_sub=10.00`, `sub0_sobrescreve=0.00`, `ambos_null_padrao=5`, `sem_taxonomia=5`. Teste em TS seria réplica da regra SQL, não verificação dela
- [x] 5.2 `npm run build` verde em 17/09. `npm run build`. ⚠ `tsc --noEmit` não substitui: coluna ausente em `database.types.ts` só quebra no build
- [x] 5.3 As três colunas entraram em `database.types.ts` à mão. O `gen types --linked` completo traz 724 linhas de churn de tabelas alheias e não cabe nesta PR
- [x] 5.4 Verificado em 17/09, pedido de teste em transação revertida cobrou 5% e gravou snapshot `5.00`. Conferir em produção, depois da aplicação, que um pedido de teste continua cobrando 5% enquanto nenhum nó tiver percentual

## 6. Pendências de decisão, fora do código

- [ ] 6.1 Definir quem classifica o produto no cadastro: seller livre, seller com homologação do admin, ou só admin. Com comissão diferenciada, declarar a categoria mais barata vira economia para o seller
- [ ] 6.2 Definir os percentuais de cada nó. A árvore nasce vazia por decisão de 17/09; enquanto ninguém digitar, tudo continua a 5%
- [ ] 6.3 Decidir se o seller é notificado quando o percentual da categoria dele muda

## 7. Achados do push

- [x] 7.1 ⚠ **Colisão evitada na recheca antes do push.** Ao criar, `0180` e `0181` estavam livres. Na recheca, a branch `origin/feat/enderecos-lote` de outra sessão já tinha publicado `0181_estoque_enderecos_lote.sql` (renumerada do `0180` dela). A migration da taxonomia virou **`0182`**; a `0180` da comissão continua válida e já está em produção
- [ ] 7.2 Aplicar a `0182` em produção. ⚠ O classifier bloqueia `db query --linked --file` com a razão "Production Deploy"; o comando precisa ser colado pela dona com prefixo `!`
