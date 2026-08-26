## 1. Schema

- [ ] 1.1 Checar colisão de número de migration (`cd supabase/migrations && ls | grep -oE '^[0-9]{4}' | sort | uniq -d`) antes de criar o arquivo.
- [ ] 1.2 Migration: estender `check` de `transportadoras.fonte` para incluir `'tabela_importada'`; criar `transportadora_faixas_frete` (`id`, `transportadora_id`, `cep_destino_inicial`, `cep_destino_final`, `peso_min`, `peso_max`, `valor`, `loja_id` nullable, `criado_em`), índices em `(transportadora_id, cep_destino_inicial, cep_destino_final)` e `loja_id`, RLS (leitura pública das faixas de transportadora ativa; escrita admin tudo; escrita seller só `loja_id` da própria loja — mesmo padrão de `transportadoras`/`faixas_cep`).
- [ ] 1.3 Testar em `begin;...rollback;` via `supabase db query --linked --file` (insert de faixa global, insert de override de loja, select simulando prioridade override>global).
- [ ] 1.4 Aplicar em produção e confirmar objeto real via `db query --linked` (migration list não é confiável sob drift).

## 2. Parser e loop de validação (upload 2 — tabela de frete)

- [ ] 2.1 `src/lib/transportadoras/parser-tabela-frete.ts` + `.test.ts`: lê CSV/XLSX no formato da planilha modelo (CEP origem, CEP destino, Volume, Peso, Altura, Largura, Comprimento, Valor declarado, Valor do Frete), normaliza CEP, converte cada linha em candidata a faixa.
- [ ] 2.2 Loop de validação (LangGraph, ver skill `langgraph-loop`): gera faixas candidatas → valida (CEP válido, sem sobreposição de faixa, peso presente) → corrige o que é determinístico (ex.: CEP com máscara errada) → para em erro que exige decisão humana (ex.: duas linhas com faixas conflitantes) com mensagem clara.
- [ ] 2.3 Preview das faixas geradas antes de confirmar o import (tela de revisão, não grava direto).
- [ ] 2.4 `npm run test` cobrindo parser + casos de erro do loop.

## 3. Upload 1 — cadastro em massa de transportadoras

- [ ] 3.1 `src/lib/transportadoras/parser-lista.ts` + `.test.ts`: nome/fonte/prazo, valida `fonte` contra o enum, relatório de linhas rejeitadas.
- [ ] 3.2 Action de import (admin: `loja_id=null`; seller: `loja_id=<loja do usuário>`, reaproveitando RLS existente).

## 4. Cálculo no checkout

- [ ] 4.1 Estender `src/lib/checkout/opcoes-frete.ts`: para transportadora `fonte='tabela_importada'`, buscar faixa em `transportadora_faixas_frete` cobrindo CEP+peso, priorizando `loja_id` da loja sobre `loja_id is null`; sem faixa aplicável, delega para o cálculo `%` existente da mesma transportadora/loja.
- [ ] 4.2 `.test.ts` cobrindo: faixa global usada, faixa de loja sobrepõe faixa global equivalente, fallback para `%` sem cobertura.

## 5. Painel admin

- [ ] 5.1 `/admin/transportadoras`: botões "Cadastrar Transportadoras" (upload 1) e "Subir Transportadoras" (upload 2, por transportadora selecionada), tela de preview do import 2.
- [ ] 5.2 View das faixas importadas por transportadora (listar/editar/desativar faixa).

## 6. Painel seller

- [ ] 6.1 Nova rota `/seller/transportadoras`: lista transportadoras globais (faixas somente leitura) + próprias da loja.
- [ ] 6.2 Upload da tabela própria (reaproveita 2.1-2.3, `loja_id` da loja).
- [ ] 6.3 Ação de sobrescrever faixa específica de uma transportadora global (grava faixa equivalente com `loja_id` preenchido).
- [ ] 6.4 Item de navegação em `src/components/seller/Sidebar.tsx`.

## 7. Verificação ponta a ponta

- [ ] 7.1 Import de tabela de frete real (planilha de teste) no admin, confirmar faixas geradas via `db query --linked`.
- [ ] 7.2 Seller sobrescreve uma faixa de transportadora global, confirmar que o checkout de um pedido daquela loja usa o valor sobrescrito, e que outra loja continua vendo o valor global.
- [ ] 7.3 CEP fora de qualquer faixa da tabela: confirmar fallback para `%` no checkout, sem sumir a opção.
