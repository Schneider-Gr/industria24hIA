## 1. Schema e migration

- [ ] 1.1 Checar colisão de número de migration (`ls supabase/migrations | grep -oE '^[0-9]{4}' | sort | uniq -d` e `git log --all` do próximo número)
- [ ] 1.2 Criar tabela `cupons` (código único case-insensitive, `dono` plataforma|loja, `loja_id` nullable, `validade_inicio`, `validade_fim`, `valor_minimo_pedido` nullable, `limite_global` nullable, `limite_por_cliente` default 1, `usos` default 0, `ativo`)
- [ ] 1.3 Criar tabela `cupom_regras` (`cupom_id`, `alvo` produto|categoria|loja|tudo, `alvo_id` nullable, `tipo` percentual|valor_fixo, `valor` > 0)
- [ ] 1.4 Criar tabela `cupom_usos` (`cupom_id`, `user_id`, `checkout_ref`, `pedido_id`, `criado_em`) com unique `(cupom_id, checkout_ref)`
- [ ] 1.5 Adicionar colunas `cupom_id` e `desconto_cupom` (nullable, default null) em `linha_itens`
- [ ] 1.6 Verificar se `linha_itens` tem `check (repasse_ind >= 0)` e `repasse_vendedor >= 0`; adicionar se faltar
- [ ] 1.7 RLS deny-by-default nas 3 tabelas novas + policies: admin gerencia cupom de plataforma; seller gerencia cupom da própria loja; `cupom_usos` legível por admin e seller dono, sem escrita por comprador
- [ ] 1.8 Testar a migration inteira em `begin; ... select <verificações>; rollback;` via `supabase db query --linked`

## 2. Função de aplicação do cupom (SQL + TS, TDD)

- [ ] 2.1 Escrever `src/lib/pagamentos-financeiro/aplicar-cupom.test.ts` (red): precedência de alvo, valor_fixo > preço unitário, não-acumulação progressivo↔cupom nos dois sentidos, piso de plataforma com afiliado reservado, piso de seller, item de preço cheio
- [ ] 2.2 Implementar `aplicarCupom` puro em `src/lib/pagamentos-financeiro/aplicar-cupom.ts` até o teste passar (green), com comentário `ponytail:` apontando a função SQL como réplica autoritativa
- [ ] 2.3 Criar função SQL `cupom_aplicar(p_codigo, p_loja_id, p_itens)` na migration, espelhando a lógica TS (comentário cruzado)
- [ ] 2.4 Validação de cadastro de regra: percentual em (0,100], valor_fixo > 0, alvo_id obrigatório para produto/categoria/loja

## 3. Validação no checkout (preview)

- [ ] 3.1 RPC `cupom_validar(p_codigo, p_itens, p_user)` retornando elegibilidade + desconto por item, sem criar pedido; rejeita inexistente, fora de validade, teto global esgotado, teto por cliente atingido, abaixo do valor mínimo (conferido sobre mercadoria pré-desconto)
- [ ] 3.2 Campo de cupom em `src/app/checkout/page.tsx` com ação de verificar que chama `cupom_validar` e exibe preview do desconto e novo total
- [ ] 3.3 Tratar erro de cupom inválido na UI sem bloquear o checkout sem cupom

## 4. Aplicação autoritativa na finalização

- [ ] 4.1 Gerar `checkout_ref` único por checkout em `finalizarCompra` e anexar `cupom_codigo` + `checkout_ref` ao objeto `entrega` de cada chamada de RPC
- [ ] 4.2 Em `checkout_criar_pedido`: ler `entrega->>'cupom_codigo'`/`checkout_ref`, chamar `cupom_aplicar` por item, gravar `linha_itens.valor` líquido, `desconto_cupom`, `cupom_id`, e `repasse_vendedor`/`repasse_ind` ajustados; ignorar qualquer valor de desconto vindo do client
- [ ] 4.3 Consumo atômico: `insert cupom_usos on conflict (cupom_id, checkout_ref) do nothing` + `update cupons set usos = usos + 1 where id = ? and (limite_global is null or usos < limite_global)`; se 0 linhas afetadas, criar o pedido sem desconto do cupom
- [ ] 4.4 Teto por cliente: contar `checkout_ref` distintos em `cupom_usos` por `user_id` antes de aplicar
- [ ] 4.5 Garantir que `pedidos.valor_pedido` e a cobrança Asaas usam o valor já líquido (verificar `criarCobrancaPedido`)
- [ ] 4.6 Confirmar que `repasses_recalcular_pedido` (0111) continua correto somando `linha_itens` já líquidos

## 5. Liberação de uso em cancelamento

- [ ] 5.1 No fluxo de cancelamento pré-pagamento (expiração/cancelamento de cobrança, cancelamento pelo comprador): `delete from cupom_usos where pedido_id = ?` e decrementar `cupons.usos`
- [ ] 5.2 Teste da rotina de cancelamento: pedido com cupom cancelado antes de pagar devolve o uso; pedido pago não devolve

## 6. UI de gestão

- [ ] 6.1 Rota admin `src/app/(admin)/admin/cupons/` — listar, criar, editar, ativar/desativar cupons de plataforma; editor de regras (adicionar/remover linhas alvo→tipo→valor)
- [ ] 6.2 Seção seller `src/app/(seller)/seller/cupons/` — mesmo editor, travado à própria loja, `dono=loja` forçado no server action
- [ ] 6.3 Histórico de uso do cupom (lista de pedidos) visível para admin e seller dono
- [ ] 6.4 Exibir `desconto_cupom` na página do pedido e nos painéis seller/admin que já mostram o breakdown

## 7. Verificação e deploy

- [ ] 7.1 `npm run test` verde (função pura + rotina de cancelamento)
- [ ] 7.2 `npm run lint` e `npm run build` verdes
- [ ] 7.3 Re-checar colisão de migration antes de abrir o PR
- [ ] 7.4 Aplicar migration em produção, regenerar `database.types.ts` com token e conferir diff
- [ ] 7.5 QA E2E em preview: cupom de seller 1 loja, cupom de plataforma multiloja, piso de repasse bloqueando item, não-acumulação com progressivo, teto de uso concorrente, cancelamento devolvendo uso
- [ ] 7.6 PR referenciando a issue (`Closes #<n>`); confirmação do dono antes do merge (caminho do dinheiro + migration)
- [ ] 7.7 Atualizar `docs/business-rules.md` com a regra de custeio e não-acumulação; sincronizar specs OpenSpec (`openspec archive` após deploy)
