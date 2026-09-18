## Why

Relato da dona em produção (18/09/2026, `/admin/taxonomia`, 5.595 nós importados do Google): (1) o percentual de comissão salvo por nó não fica gravado; (2) a árvore de categorias não aparece.

Causa do item 1, confirmada no banco e no browser: `taxonomia_nos` tem RLS com uma única política, de SELECT (0184). O `salvarComissaoNo` fazia o `update` com o client do usuário; o Postgres filtra as linhas pela RLS, o update casa 0 linhas e o PostgREST devolve sucesso sem erro. Salvar 7 no nó "Erótico" pela tela deixou `comissao_pct` nulo.

Item 2: em produção as 21 raízes aparecem e o clique abre os filhos (verificado em "Adultos" → "Armas", "Erótico"). O que falha é a leitura da árvore: o nome do nó não parecia link, e todo filho exibia "herda 5,00%" mesmo com percentual num ancestral, porque o efetivo exibido ignorava os pais.

## What Changes

- `salvarComissaoNo` grava pelo client service role, depois do gate `exigirAdmin()`, e falha quando nenhuma linha é atualizada.
- A listagem de filhos mostra como herdado o percentual efetivo do pai (`taxonomia_comissao_pct`), não o padrão fixo.
- O nome do nó aparece como link de navegação (cor de ação e `›`).
- Sem migration, sem mudança em `categorias`, checkout ou `comissao_pct_item`.

## Capabilities

### Modified Capabilities
- `admin-taxonomia`: gravação da comissão por nó e exibição do herdado.

## Impact

- `src/app/(admin)/admin/taxonomia/actions.ts`, `src/app/(admin)/admin/taxonomia/page.tsx`.
