## 1. Leitura dos mínimos no carrinho

- [ ] 1.1 Adicionar `valor_pedido_minimo` da loja ao `ItemCarrinho` (`src/components/carrinho/carrinho.tsx`) — hoje o tipo carrega `loja_id`/`loja_nome` e `quantidade_minima`, mas não o ticket
- [ ] 1.2 Garantir que o valor entra no carrinho no momento da adição (`BotaoAddRapido`, `BotaoComprarRapido`, página do produto) e que carrinho antigo em `localStorage` sem o campo revalida contra o servidor em vez de assumir zero
- [ ] 1.3 Revalidar `valor_pedido_minimo` e `quantidade_minima` no servidor ao renderizar o carrinho — o valor em `localStorage` é pista, nunca autoridade

## 2. Avaliação e painel de bloqueio

- [ ] 2.1 Função pura `avaliarGrupo(itens, tickeMinimoLoja)` em `src/lib/` retornando `{ apto, motivo, gap, itensAbaixoDoMinimo }`, com teste companheiro red-green
- [ ] 2.2 Casos de teste: item abaixo da quantidade mínima com subtotal acima do ticket; subtotal abaixo do ticket com itens OK; ambos; loja sem mínimo nenhum; subtotal exatamente igual ao ticket (deve liberar)
- [ ] 2.3 Painel de bloqueio no grupo em `src/app/carrinho/page.tsx` (agrupamento já existe em `agruparPorLoja`, linhas 10-16): contorno de erro, título `"[Loja] – compra mínima R$ X"`, item apontado quando a trava for quantidade
- [ ] 2.4 Substituir o acionador de fechamento do grupo pelo controle desabilitado `"Adicione mais itens ao seu carrinho!"`
- [ ] 2.5 Recalcular ao vivo quando a quantidade muda — sem recarregar a página

## 3. Fechamento parcial

- [ ] 3.1 Trocar o botão único "Fechar pedido" (hoje em `carrinho/page.tsx:307` desktop e `:357` sticky mobile) por fechamento por grupo, ou manter botão único que leva ao checkout apenas com os grupos aptos
- [ ] 3.2 Preservar os itens da loja bloqueada no carrinho após o fechamento das demais
- [ ] 3.3 Decidir e implementar o estado quando TODAS as lojas estão bloqueadas (nenhum acionador habilitado)
- [ ] 3.4 Verificar interação com a barra sticky mobile — ela cobre o botão e foi motivo de correção anterior

## 4. Sugestões de desbloqueio

- [ ] 4.1 Estender `buscarCrossSell` (`src/app/carrinho/actions.ts`) com filtro por loja única e parâmetro de gap; hoje calcula `mesmaLoja` (linha 86) e ordena por ele (linha 89), mas não filtra
- [ ] 4.2 Ordenar priorizando a faixa de 60% a 130% do gap, com fallback pela menor distância quando a faixa está vazia
- [ ] 4.3 Renderizar o rail dentro do painel do grupo bloqueado, não no rodapé genérico do carrinho
- [ ] 4.4 Bloqueio por quantidade mínima não exibe rail: exibe o ajuste da quantidade do item apontado

## 5. Guarda de cupom (migration)

- [ ] 5.1 Checar colisão de número de migration em TODAS as branches (`ls supabase/migrations | grep -oE '^[0-9]{4}' | sort | uniq -d` e `git log --all --oneline -- supabase/migrations/00XX*`) — este checkout está com a última migration em 0148 enquanto produção já tem 0171: sincronizar antes de numerar
- [ ] 5.2 Redefinir `checkout_criar_pedido` adicionando a guarda: cupom cujo desconto deixaria o subtotal da loja abaixo de `lojas.valor_pedido_minimo` é descartado, e o pedido segue pelo valor cheio
- [ ] 5.3 NÃO alterar a base de comparação do ticket mínimo (`v_total_itens`, 0140:214) — a mudança é aditiva
- [ ] 5.4 Testar a migration inteira em `begin; ... select <verificações>; rollback;` via `supabase db query --linked` antes de aplicar
- [ ] 5.5 Verificar que desconto progressivo, venda futura e frete consolidado não regridem — os três compartilham o trecho tocado

## 6. Mensagens no checkout

- [ ] 6.1 Traduzir as exceptions de quantidade mínima e ticket mínimo em `src/app/checkout/actions.ts` para mensagem que nomeia loja/produto e o mínimo exigido
- [ ] 6.2 Devolver o comprador ao carrinho com o painel de bloqueio visível
- [ ] 6.3 Mensagem de cupom recusado nomeando o cupom e o valor da compra mínima da loja

## 7. Validação

- [ ] 7.1 Testes da função pura verdes; `tsc` limpo; lint sem erro novo
- [ ] 7.2 QA manual em produção com cache-buster: loja com ticket alto, carrinho abaixo, subir até desbloquear, fechar parcial com duas lojas
- [ ] 7.3 QA a 360×800 e 412×915 — o painel de bloqueio e a barra sticky disputam espaço no mobile
- [ ] 7.4 Confirmar no banco (`supabase db query --linked`) que a guarda de cupom está no schema, não apenas no histórico de migrations
