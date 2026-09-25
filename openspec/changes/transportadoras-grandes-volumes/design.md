## Context

Motivação em proposal.md. Estado verificado em `database.types.ts` e em produção (`tiwdqgyeyvceaiqqwitc`, 24 e 25/09/2026):

- `transportadoras` (0099, 0139, 0145): `nome, fonte, prazo_dias, logo_url, loja_id` (null = global), `ativo`, `fake`. 2 linhas, ambas globais.
- `transportadora_faixas_frete` (0145, 0147): `loja_id` (null = global, preenchido = override), `cep_destino_inicial/final integer, peso_min, peso_max, valor, ativo`. 0 linhas.
- `cotar_frete_tabela` (0146, 0148) e o checkout (0150) só leem faixas de transportadora com `fonte = 'tabela_importada'`, e leem por RPC `security definer`.
- `produtos.cep_produto` (texto, 0002): 76 de 127 aprovados preenchidos, em formatos misturados (`69005-000`, `92.711-000`, `69903012`); a 0167 já usa "CEP do produto, senão CEP da loja".
- `produtos.taxonomia_no_id → taxonomia_nos(id, parent_id)` (PRD 041).
- Policy `transportadoras_read` (0099): `ativo or admin or dono` expõe transportadora própria ativa a qualquer usuário.
- Upload em duas etapas da change `transportadoras-tabela-frete-followup` (PR #457): `arquivo.ts` → `csv.ts` / `xlsx.ts` → parser → preview → confirmar.

## Goals / Non-Goals

**Goals:** cadastro e tabela de transportadora formal prontos para a próxima change calcular o frete no checkout sem mudar o modelo; isolamento por loja corrigido no banco.

**Non-Goals:** mudar `cotar_frete_tabela`, `checkout_criar_pedido` ou o checkout; normalizar `cep_produto` gravado (a leitura normaliza); desativar a "Entrega Rápida I24"; modal por API; freteiro pequeno (PRD 054).

## Decisions

**D1. Estender as tabelas existentes.** `transportadoras` ganha `codigo_referencia, peso_min, peso_max, valor_min, valor_max, altura_max, largura_max, comprimento_max, fator_cubagem, url_rastreio, desativada_por_admin, motivo_desativacao, encerra_em, tabela_atualizada_em, revisar_categorias`. `transportadora_faixas_frete` ganha `cep_origem_inicial, cep_origem_final, prazo_min, prazo_max, ad_valorem, kg_adicional, icms, frete_minimo, taxa_fixa`. Descartado: tabela versionada nova; a dona decidiu substituir a tabela inteira, sem histórico.

**D2. Nome único por loja** por índice `(loja_id, lower(nome)) where loja_id is not null`.

**D3. Ativação de global em `loja_transportadoras`** `(loja_id, transportadora_id, codigo_cliente, contrato_aceito_em, ativo)`. Trigger exige global ativa e não encerrada e grava `contrato_aceito_em = now()` para quem não é admin.

**D4. Substituição atômica** pela RPC `substituir_faixas_transportadora(p_transportadora_id, p_faixas jsonb)`, `security definer`, `search_path = public, pg_temp`: confere dono (ou admin para global) e moderação, recusa `p_faixas` nulo ou vazio e mais de 15.000 linhas, apaga e insere na mesma transação, valida CEP e peso, recusa sobreposição e marca `fonte = 'tabela_importada'` (exceto `mercado_envios` e `uber_direct`), que é o que a cotação lê.

**D5. Sobreposição validada duas vezes**: no parser (aponta as linhas no preview) e na RPC (garantia), com `int4range`/`numrange` inclusivos e origem vazia cruzando qualquer origem. Consequência aceita: tabela contígua "0 a 10" e "10 a 20" é recusada; o modelo usa "10,001". O update direto do seller numa faixa só liga e desliga, e religar revalida (trigger).

**D6. Sem override.** `loja_id` da faixa passa a ser sempre o da transportadora (trigger). A prioridade por `loja_id` da 0148 fica sem efeito prático.

**D7. RLS de leitura corrigida**: transportadora `(global e ativa) or admin or dono`; faixa de global ativa legível por autenticado, faixa própria só pelo dono e admin. Tabelas novas negam por padrão.

**D8. Moderação no banco**: trigger impede o seller de mexer em moderação ou encerramento, de trocar a loja, de reativar a desativada pelo admin e de apagá-la (apagar e recriar furava a regra).

**D9. Categorias** em `transportadora_nos (transportadora_id, taxonomia_no_id)`; contador por CTE recursiva sobre `parent_id`; nó removido marca `revisar_categorias`, exibido no painel de pendências.

**D10. CEP de origem do produto normalizado na leitura**: `cep_produto` só com dígitos; 7 dígitos ganham o zero à esquerda; 8 dígitos valem; o resto, e a falta dele, cai no `lojas.cep`; sem nenhum dos dois, o produto é pendência. Função pura em `src/lib/transportadoras/`, com teste. Não reescreve o dado gravado.

**D11. Avisos por e-mail** no padrão do PRD 047 (Vercel Cron diário, idempotência em `alertas_enviados`): "tabela atualizada" às lojas que ativaram a global, na confirmação; encerramento 7 dias antes, por cron. A global com `encerra_em <= hoje` deixa de valer pelo trigger de ativação e pelas consultas.

## Risks / Trade-offs

- [51 produtos sem CEP próprio] → caem no CEP da loja; sem os dois, viram pendência.
- [Remover o override] → 0 faixas em produção em 25/09/2026; conferir de novo antes de aplicar.
- [Trocar a RLS esconde dado que alguma tela lia direto] → leituras diretas só nas telas de seller e admin (grep em 24/09); o checkout usa RPC.
- [Tabela contígua de transportadora recusada] → mensagem de sobreposição aponta as linhas; instrução no modelo.

## Migration Plan

1. `scripts/proximo-migration.sh --checar` antes do push (0195 a 0198 estavam em uso por outros worktrees em 25/09).
2. Testada em `begin … rollback` contra produção como seller real (19 verificações).
3. Aplicar com a confirmação da dona **antes** do merge: preview e produção usam o mesmo banco, e as telas novas leem as colunas novas.
4. Rollback: colunas e tabelas são aditivas; policies antigas estão na 0099 e na 0145.
