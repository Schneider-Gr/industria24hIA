## 1. Schema (migration nova)

- [ ] 1.1 Checar colisão de número em todas as branches (`git log --all --oneline -- 'supabase/migrations/015*'`) e rodar a regra do CI (`cd supabase/migrations && ls | grep -oE '^[0-9]{4}' | sort | uniq -d`). Hoje o último é `0149` (PR #454); usar `0150`.
- [ ] 1.2 `0150_confiabilidade_repasse_pos_pagamento.sql`:
  - Índice parcial `create unique index if not exists repasses_seller_por_pedido_ux on public.repasses (pedido_id, destino) where afiliado_id is null`.
  - `alter table public.repasses drop constraint repasses_status_check`, recriar com `processando` no `in (...)`.
  - `create or replace function public.repasses_recalcular_pedido`: bloco de seller com `on conflict (pedido_id, destino) where afiliado_id is null do update set valor = excluded.valor where public.repasses.status = 'pendente'`; bloco de afiliado inalterado.
  - `create or replace function public.checkout_criar_pedido(itens jsonb, entrega jsonb, forma_pagamento text)` (BASE, a partir da versão de `0140`): branch `tabela_importada` (chama `cotar_frete_tabela`, seta `v_frete`, erro específico sem match); loop de `linha_itens` acumulando frete rateado e atribuindo o resto à última linha.
- [ ] 1.3 Testar a migration inteira em `begin; ... rollback;` via `supabase db query --linked --file` antes de aplicar, com os cenários dos specs (seller duplicado, override de tabela, rateio de 3 linhas).
- [ ] 1.4 Testar em `begin;` que o `create or replace function checkout_criar_pedido` não quebra a cadeia de overloads (4/5/6 args continuam resolvendo): rodar uma chamada de 6 args de exemplo dentro do bloco.
- [ ] 1.5 Aplicar em produção e confirmar via `db query --linked` (índice existe, `check` atualizado, funções com o novo corpo).

## 2. Repasse: claim atômico (`src/lib/repasses.ts`)

- [ ] 2.1 Em `transferirRepasse`, antes de `createPixTransfer`: `update repasses set status = 'processando' where id = r.id and status = 'pendente'` e checar linhas afetadas. Zero linhas: outra execução pegou, `return` sem transferir.
- [ ] 2.2 Sucesso da transferência: `status = 'transferido'` (como hoje). Erro: `status = 'falhou'` (como hoje). Não há caminho que volte de `processando` para `pendente`.
- [ ] 2.3 `dispararRepasseAutomaticoComCliente` continua selecionando só `status = 'pendente'` (linhas `processando` ficam de fora automaticamente).
- [ ] 2.4 Teste (`repasses.test.ts` ou novo): duas chamadas concorrentes simuladas para a mesma linha resultam em uma única chamada de `createPixTransfer` (mock).

## 3. Confirmação de pagamento (`src/lib/asaas-confirmar.ts`)

- [ ] 3.1 Trocar o guard `status_pedido in [...]` por `pedido.dt_pagamento != null` → `return { ok: true, ja_estava_pago: true }`.
- [ ] 3.2 A gravação de `status_pedido = 'Pagamento Realizado'` + `dt_pagamento` vira update condicionado a `.is("dt_pagamento", null)` com `.select("id")`; se voltou vazio, tratar como já pago e não rodar efeitos colaterais.
- [ ] 3.3 Confirmar que nenhum outro caminho (RPC de disputa, admin, etc.) seta status de pago sem gravar `dt_pagamento`. `grep` por `status_pedido.*Pagamento Realizado` em migrations e `src`.
- [ ] 3.4 Teste: evento reenviado com pedido em `Entregue` não dispara `notificarPagamento` nem despacho (mock dos side effects, asserção de zero chamadas).

## 4. Checkout frete tabela (coberto por 1.2, verificação end-to-end)

- [ ] 4.1 Verificação E2E no browser (não só SQL): loja de teste com faixa em `transportadora_faixas_frete`, comprador escolhe a opção de tabela, pedido criado com o valor da faixa, `pedidos.valor_pedido` e `sum(linha_itens.valor_frete)` batem. Ver credenciais em memória (`industria24h-loja-teste-tour-qa-credenciais`).
- [ ] 4.2 Caso negativo E2E: CEP fora da tabela mostra a mensagem específica, não a genérica.
- [ ] 4.3 Confirmar o placeholder de peso: `cotar-frete/route.ts` e `checkout_criar_pedido` passam o mesmo `p_peso` para `cotar_frete_tabela`, senão nenhuma faixa casa (bug latente P2 do relatório original, resolver junto).

## 5. Painel admin de repasses

- [ ] 5.1 `/admin/repasses`: `processando` aparece como coluna/badge distinta de `pendente` e `falhou`, com o id da linha (`externalReference`) visível.
- [ ] 5.2 Ação de admin: "reprocessar" (volta para `pendente` após confirmar na Asaas que não saiu) e "marcar transferido" (se saiu). Sem automação, decisão humana.

## 6. Regressão e verificação

- [ ] 6.1 `npm run test` verde (novos testes de 2.4 e 3.4 incluídos).
- [ ] 6.2 Checar colisão de migration DE NOVO antes de abrir o PR (regra da auditoria: outra sessão pode ter publicado o mesmo `0150` depois de 1.1).
- [ ] 6.3 Fluxo feliz de checkout + pagamento + confirmação de entrega + repasse continua funcionando (E2E ou verificação manual em prod após deploy).
