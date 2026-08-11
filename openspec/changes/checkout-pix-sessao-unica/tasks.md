## 1. Pré-condição

- [ ] 1.1 Confirmar que o PRD 013 (timeout tratado em `src/lib/asaas.ts` / `criarCobrancaPedido`) está `concluido` antes de iniciar qualquer task abaixo — não implementar por cima do bug de travamento

## 2. Migration: estado de cobrança do pedido

- [ ] 2.1 Checar colisão de número de migration em todas as branches/worktrees (skill `migrations-industria24`) antes de numerar
- [ ] 2.2 Criar migration adicionando coluna `cobranca_status` em `pedidos` (`pendente` | `processando` | `gerada` | `falhou`, default `pendente`, check constraint)
- [ ] 2.3 Incluir `cobranca_status` na lista de campos restritos do trigger `guard_campos_restritos` (mesma proteção de `asaas_cobranca_id`/`link_cobranca`)
- [ ] 2.4 Testar a migration em `begin; ...; select` de verificação `; rollback;` via `supabase db query --linked` antes de aplicar
- [ ] 2.5 Aplicar migration e confirmar via `db query --linked` que a coluna e o trigger existem no schema real (não confiar em `migration list`)

## 3. Backend: geração de cobrança dirigida por estado

- [ ] 3.1 Atualizar `criarCobrancaPedido` (`checkout/actions.ts:238-294`) para gravar `cobranca_status = 'processando'` no início da tentativa e `'gerada'`/`'falhou'` ao final, usando o service client já existente
- [ ] 3.2 Ajustar `finalizarCompra` para não deixar o pedido sem nenhum status de cobrança quando a tentativa best-effort não concluir a tempo do redirect (garantir que sempre saia como `pendente` ou `processando`, nunca indefinido)
- [ ] 3.3 Adicionar disparo automático de geração de cobrança ao carregar `/pedido/{id}?novo=1` quando `cobranca_status = 'pendente'`, sem exigir clique manual
- [ ] 3.4 Garantir idempotência: nova tentativa (automática ou por "Tentar novamente") só inicia se `cobranca_status` não for já `'processando'`
- [ ] 3.5 Reaproveitar os dados de nome/CPF/WhatsApp já coletados no checkout em toda tentativa (automática ou reinício), sem exigir novo formulário

## 4. Frontend: estados de UI

- [ ] 4.1 Página `/pedido/{id}`: renderizar estado de progresso ("gerando cobrança...") quando `cobranca_status = 'processando'`
- [ ] 4.2 Renderizar QR code/link quando `cobranca_status = 'gerada'` (comportamento já existente, apenas condicionado ao novo campo)
- [ ] 4.3 Renderizar tela de recuperação com botão "Tentar novamente" quando `cobranca_status = 'falhou'`, sem formulário de nome/CPF
- [ ] 4.4 Remover a exibição do formulário de nome/CPF como estado padrão para `cobranca_status = 'pendente'`/`'processando'` (só aparece implicitamente embutido na tentativa inicial do checkout, não mais repetido aqui)
- [ ] 4.5 Garantir que o estado de progresso permaneça perceptível mesmo em respostas muito rápidas (ex.: duração mínima de exibição)

## 5. Verificação

- [ ] 5.1 Rodar os cenários do spec (`specs/checkout-pix-cobranca-unificada/spec.md`) manualmente contra o ambiente de teste: fluxo feliz sem repetição de dados, falha tratada com recuperação, cliques repetidos sem duplicar cobrança
- [ ] 5.2 Confirmar em produção/staging que `asaas_cobranca_id`/`link_cobranca`/`cobranca_status` continuam graváveis só por service role (teste de update direto pelo client autenticado do comprador deve falhar)
- [ ] 5.3 Reexecutar a reprodução original do bug do PRD 013 (conta de teste, produto real) e confirmar que agora completa com QR exibido ou falha tratada visível, nunca travamento sem resposta
