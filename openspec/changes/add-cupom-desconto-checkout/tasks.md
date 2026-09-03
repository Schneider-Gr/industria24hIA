## 1. Schema e migration

- [x] 1.1 Checar colisão de número de migration (`ls supabase/migrations | grep -oE '^[0-9]{4}' | sort | uniq -d` e `git log --all` do próximo número — 0155)
- [x] 1.2 Criar tabela `cupons` (código único case-insensitive, `dono` com CHECK só `plataforma` no MVP, `loja_id` nullable, `validade_inicio`, `validade_fim`, `valor_minimo_pedido` nullable, `limite_global` nullable, `limite_por_cliente` default 1, `usos` default 0, `ativo`)
- [x] 1.3 Criar tabela `cupom_regras` (`cupom_id`, `alvo` produto|categoria|loja|tudo, `alvo_id` nullable, `tipo` percentual|valor_fixo, `valor` > 0; CHECK: percentual em (0,100], `alvo_id` obrigatório para produto/categoria/loja)
- [x] 1.4 Criar tabela `cupom_usos` (`cupom_id`, `user_id`, `checkout_ref`, `pedido_id`, `criado_em`) com unique `(cupom_id, checkout_ref)`
- [x] 1.5 Adicionar colunas `cupom_id` (fk `cupons`) e `desconto_cupom` numeric(12,2) (nullable, default null) em `linha_itens`
- [x] 1.6 RLS deny-by-default nas 3 tabelas novas + policies: só admin gerencia `cupons`/`cupom_regras`; `cupom_usos` legível por admin, sem acesso para comprador. Conferir se o guard financeiro de `linha_itens` (0031/0038/0109) precisa liberar `desconto_cupom`/`cupom_id` para o path `app.checkout_rpc`
- [x] 1.7 Testar a migration inteira em `begin; ... select <verificações>; rollback;` via `supabase db query --linked`, incluindo um checkout simulado com cupom que exercite o piso de `repasse_ind`

## 2. Função de aplicação do cupom (SQL + TS, TDD)

- [x] 2.1 Escrever `src/lib/cupom-desconto.test.ts` (red): precedência de alvo (produto>categoria>loja>tudo); `valor_fixo` > preço unitário; não-acumulação progressivo↔cupom nos dois sentidos; piso `desconto ≤ repasse_ind` da linha; linha com `repasse_ind` zero; item sem regra casando
- [x] 2.2 Implementar `aplicarCupom` puro em `src/lib/cupom-desconto.ts` (flat, mesmo padrão de preco-faixa.ts — não existe módulo pagamentos-financeiro/ no repo) até o teste passar (green), com comentário `ponytail:` apontando `cupom_aplicar` SQL como réplica autoritativa
- [x] 2.3 Criar função SQL `cupom_aplicar(p_codigo, p_itens)` na migration, espelhando a lógica TS (comentário cruzado); retorna por item `{produto_id, desconto}` já com piso aplicado
- [x] 2.4 Validação de cadastro de regra reforçada nos CHECKs da 1.3 e no server action do admin

## 3. Validação no checkout (preview)

- [x] 3.1 RPC `cupom_validar(p_codigo, p_itens, p_user)` retornando elegibilidade + desconto por item, sem criar pedido; rejeita inexistente, fora de validade, teto global esgotado, teto por cliente atingido, abaixo do valor mínimo (conferido sobre mercadoria pré-desconto)
- [x] 3.2 Campo de cupom em `src/app/checkout/page.tsx` com ação de verificar que chama `cupom_validar` e exibe preview do desconto e novo total
- [x] 3.3 Tratar erro de cupom inválido na UI sem bloquear o checkout sem cupom

## 4. Aplicação autoritativa na finalização

- [x] 4.1 Gerar `checkout_ref` único por checkout em `finalizarCompra` e anexar `cupom_codigo` + `checkout_ref` ao objeto `entrega` de cada chamada de RPC
- [x] 4.2 Em `checkout_criar_pedido` (base 3 args): ler `entrega->>'cupom_codigo'`/`checkout_ref`, chamar `cupom_aplicar` por item, gravar `linha_itens.valor` **cheio** (inalterado), `linha_itens.desconto_cupom`, `linha_itens.cupom_id`; **não tocar `repasse_ind`/`repasse_afiliado`/`repasse_vendedor`**
- [x] 4.3 `pedidos.valor_pedido` gravado como `Σ(linha_itens.valor) + frete − Σ(desconto_cupom)`; ignorar qualquer valor de desconto vindo do client
- [x] 4.4 Consumo atômico: `insert cupom_usos on conflict (cupom_id, checkout_ref) do nothing` + `update cupons set usos = usos + 1 where id = ? and (limite_global is null or usos < limite_global)`; se 0 linhas afetadas, criar o pedido sem desconto do cupom
- [x] 4.5 Teto por cliente: contar `checkout_ref` distintos em `cupom_usos` por `user_id` antes de aplicar
- [x] 4.6 Verificar que `criarCobrancaPedido` cria a cobrança Asaas sobre `pedido.valor_pedido` já líquido
- [x] 4.7 Confirmar que `repasses_recalcular_pedido` (0111) segue correto — soma `repasse_vendedor`/`repasse_afiliado` que não mudaram

## 5. Liberação de uso em cancelamento

- [x] 5.1 No fluxo de cancelamento pré-pagamento (expiração/cancelamento de cobrança, cancelamento pelo comprador): `delete from cupom_usos where pedido_id = ?` e decrementar `cupons.usos`
- [x] 5.2 Teste da rotina de cancelamento: pedido com cupom cancelado antes de pagar devolve o uso; pedido pago não devolve

## 6. UI de gestão (admin)

- [x] 6.1 Rota admin `src/app/(admin)/admin/cupons/` — listar, criar, editar, ativar/desativar cupons; editor de regras (adicionar/remover linhas alvo→tipo→valor); server actions com gate `is_admin`
- [ ] 6.2 Histórico de uso do cupom (lista de pedidos) visível para admin
- [ ] 6.3 Exibir `desconto_cupom` na página do pedido e nos painéis admin/seller que já mostram o breakdown; conferir dashboard de KPIs (#490) e "GMV a receber" para subtrair `desconto_cupom` de forma consistente

## 7. Verificação e deploy

- [x] 7.1 `npm run test` verde (função pura + rotina de cancelamento)
- [x] 7.2 `npm run lint` e `npm run build` verdes
- [x] 7.3 Re-checar colisão de migration antes de abrir o PR
- [x] 7.4 Aplicar migration em produção, regenerar `database.types.ts` com token e conferir diff
- [ ] 7.5 QA E2E em preview: cupom multiloja, piso de `repasse_ind` limitando o desconto de uma linha, não-acumulação com progressivo, teto de uso concorrente, cancelamento devolvendo uso, cobrança Asaas sobre valor líquido
- [ ] 7.6 PR referenciando a issue (`Closes #491`); confirmação do dono antes do merge (caminho do dinheiro + migration)
- [ ] 7.7 Atualizar `docs/business-rules.md` com a regra de custeio (Opção C) e não-acumulação; `openspec archive` após deploy
