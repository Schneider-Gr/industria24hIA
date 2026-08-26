## 1. Schema

- [x] 1.1 Checado, sem colisão (`0144` era o último; usado `0145`/`0146`/`0147`/`0148`).
- [x] 1.2 Migration `0145_transportadora_faixas_frete.sql`: `check` de `fonte` estendido, tabela `transportadora_faixas_frete`, RLS (leitura pública ativa, admin tudo, seller só `loja_id` própria), índices.
- [x] 1.3 Testadas em `begin;...rollback;` via `supabase db query --linked --file` antes de cada apply.
- [x] 1.4 Aplicadas em produção e confirmadas via `db query --linked` (tabela existe, constraint atualizada). Achado durante a implementação: `cep_destino_inicial`/`final` foram criados como `text` mascarado na 0145 (erro de projeto — a convenção real do schema, `faixas_cep.cep_inicial/final`, é `integer` sem máscara); corrigido em `0147_fix_cep_destino_tipo_int.sql`, sem impacto porque a tabela ainda não tinha dado real.

## 2. Parser e loop de validação (upload 2 — tabela de frete)

- [x] 2.1 `src/lib/transportadoras/parser-tabela-frete.ts` + `.test.ts` (6 casos). Escopo real: CSV, não XLSX — a única lib npm mantida (`xlsx`) está travada numa versão com 2 CVEs altos sem fix publicado (GHSA-4r6h-8v6p-xvw6, GHSA-5pgg-2g8v-p4x9); decisão de não introduzir isso perto do checkout, documentada no código (`csv.ts`).
- [x] 2.2 Loop determinístico (gera candidata → valida CEP/valor → normaliza máscara/espaço automaticamente → bloqueia só a linha com erro não determinístico, sem travar as demais). Ponytail: não é um agente LangGraph real — a planilha modelo só exige normalização determinística; documentado no código como ponto de upgrade se o formato real vier mais heterogêneo (ver skill `langgraph-loop`).
- [ ] 2.3 Preview antes de confirmar o import — **não implementado nesta rodada**: o fluxo atual importa direto e devolve um relatório pós-import (ok/total + motivos das linhas rejeitadas), não um preview pré-confirmação. Simplificação deliberada para fechar o end-to-end; adicionar preview é UI incremental sobre a mesma action.
- [x] 2.4 `npm run test`: 111 testes passando (14 novos deste módulo: parser-lista 4, parser-tabela-frete 6, csv 4).

## 3. Upload 1 — cadastro em massa de transportadoras

- [x] 3.1 `src/lib/transportadoras/parser-lista.ts` + `.test.ts` (4 casos).
- [x] 3.2 Actions de import: `importarListaTransportadoras` (admin, `loja_id=null`) e `importarListaTransportadorasSeller` (seller, `loja_id=<loja>`), RLS existente sem alteração.

## 4. Cálculo no checkout

- [x] 4.1 Nova RPC `cotar_frete_tabela` (`0146`, corrigida em `0148`) em vez de estender `opcoes-frete.ts` puro — a seleção de faixa por CEP+peso é melhor feita em SQL (mesmo padrão de `cotar_frete_interno`, 0140) do que replicada em TS; `src/app/api/checkout/cotar-frete/route.ts` chama `cotar_frete_tabela` antes de `cotar_frete_interno`, delega pro `%` sem match.
- [x] 4.2 Verificação via `db query --linked --file` em `begin;...rollback;` (não `.test.ts` — é uma RPC SQL, testada com o fixture real do banco): override da loja vence a faixa global equivalente, outra loja vê a global, CEP sem cobertura não retorna linha (fallback delegado à rota). **Achado real**: a primeira versão da RPC (`0146`) tinha a faixa global vencendo o override por causa de `NULL` em `ORDER BY ... DESC` (Postgres ordena `NULL` primeiro em `DESC` por padrão) — corrigido em `0148` com `IS NOT DISTINCT FROM`, re-testado e confirmado.

## 5. Painel admin

- [x] 5.1 `/admin/transportadoras`: botões "Cadastrar Transportadoras" e "Subir Transportadoras" (`UploadTransportadoras.tsx`), com relatório pós-import (sem preview, ver 2.3).
- [ ] 5.2 View de faixas importadas por transportadora (listar/editar/desativar) — **não implementada nesta rodada**; dado já é auditável via `transportadora_faixas_frete` no Supabase, UI de gestão fica para uma próxima iteração.

## 6. Painel seller

- [x] 6.1 Nova rota `/seller/transportadoras`: lista transportadoras globais e próprias, ambas com faixas geridas via upload.
- [x] 6.2 Upload da tabela própria (`importarTabelaFreteSeller`, `loja_id` da loja).
- [x] 6.3 Sobrescrita de faixa global: subir a tabela selecionando a transportadora (própria ou global) grava com `loja_id` da loja — mecanismo simples (novo insert, sem edição in-place de faixa existente); verificado que a prioridade no cálculo funciona (ver 4.2).
- [x] 6.4 Item de navegação em `Sidebar.tsx`.

## 7. Verificação ponta a ponta

- [x] 7.1 Import testado via fixture SQL direto no banco (`transportadora_faixas_frete` populada e lida corretamente pela RPC) — não via upload de arquivo real pela UI (sem navegador neste pass); parsers cobertos por 14 testes unitários com o formato exato da planilha modelo do usuário.
- [x] 7.2 Confirmado via `db query --linked` (rollback): override da loja vence a global equivalente; outra loja não é afetada, continua vendo o valor global. Bug real encontrado e corrigido nesta verificação (ver 4.2).
- [x] 7.3 Confirmado: CEP fora de qualquer faixa da tabela não retorna nenhuma linha de `cotar_frete_tabela` — a rota (`cotar-frete/route.ts`) então tenta `cotar_frete_interno` (%), preservando o comportamento de nunca sumir a opção.

## Pendências desta rodada (fora do escopo fechado aqui)

- Preview antes de confirmar upload (2.3).
- View de gestão de faixas por transportadora no admin (5.2).
- Teste real de upload via browser (upload de arquivo por input file não foi exercitado numa sessão de navegador nesta rodada — só via parsers unitários + fixture SQL da RPC).
- `npm run lint` e `npx tsc --noEmit` rodados: lint limpo nos arquivos tocados (1 warning pré-existente não relacionado em `Sidebar.tsx`); `tsc --noEmit` tem 1 erro pré-existente em `src/app/pedido/[id]/actions.ts` (arquivo não rastreado de outra sessão no mesmo checkout compartilhado, confirmado via `git status` — não introduzido por este change).
