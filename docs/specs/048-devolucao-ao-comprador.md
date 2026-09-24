# Spec técnica: PRD 048 (devolução de dinheiro ao comprador)

Status: proposta, 24/09/2026. Nada disto está no banco.

Estado medido em produção (`tiwdqgyeyvceaiqqwitc`) em 23–24/09:

- `disputas` existe, com 3 registros. Funções relacionadas: `admin_abrir_disputa`,
  `eh_participante_disputa`, `eh_participante_mediacao_disputa`. **Nenhuma move dinheiro.**
- `repasses(id, pedido_id, destino, loja_id, afiliado_id, valor, status, criado_em, transferido_em)`,
  com `status` em `pendente | estornado | inelegivel | transferido`. Hoje: 4 estornados, 1 inelegível.
- `pedidos` guarda a cobrança em `asaas_cobranca_id`, mais `link_cobranca`, `forma_pagamento`,
  `dt_pagamento`, `valor_pedido`, `id_venda`.

## Restrições herdadas (não reabrir)

- **`repasses.status = 'estornado'` é contabilidade interna**, não devolução ao comprador. As duas
  coisas coexistem e não devem ser fundidas numa só coluna: uma responde "o seller recebe?", a
  outra "o comprador recebeu de volta?".
- **Dinheiro não se move por gatilho automático** (a 0191 barrou cancelar pedido entregue
  justamente por isso). Aprovação humana é requisito de produto, não detalhe de implementação.
- Funções que mexem em dinheiro são `security definer`, com `revoke` de `anon` e checagem de
  papel dentro — mesmo padrão de `pedido_cancelar` e das RPCs de repasse.
- O ambiente Asaas ainda é **sandbox**. O envio real só pode ser habilitado depois de confirmar
  produção, e isso é pré-requisito do Milestone 2.

## Tabelas novas

`devolucoes` (uma linha por devolução; um pedido pode ter várias)
- `id`, `pedido_id` fk, `valor` numeric(12,2) `check (valor > 0)`, `motivo` text not null,
  `origem` text `check in ('disputa', 'cancelamento', 'atraso_venda_futura', 'outro')`,
  `disputa_id` fk nullable, `status` text
  `check in ('pendente', 'aprovada', 'enviada', 'concluida', 'falha', 'cancelada')`,
  `criado_por`, `criado_em`, `aprovado_por`, `aprovado_em`, `enviado_em`, `concluido_em`,
  `falha_motivo` text, `asaas_refund_id` text unique nullable.
- RLS ligada. Admin lê e escreve via RPC; comprador dono do pedido lê somente as colunas que a
  US04 expõe (valor, status, datas) — `falha_motivo` e ids externos não são dele. Escrita direta
  negada para todos.

`seller_debitos` (o que o seller deve por devolução paga depois do repasse)
- `id`, `loja_id` fk, `devolucao_id` fk unique, `pedido_id` fk, `valor` numeric(12,2),
  `status` text `check in ('aberto', 'compensado', 'perdoado')`, `criado_em`,
  `resolvido_em`, `resolvido_por`, `observacao`.
- Unique em `devolucao_id`: uma devolução nunca gera dois débitos, nem no retry.

## Invariantes (onde o dinheiro se perde se falhar)

1. **`sum(devolucoes.valor) where status <> 'cancelada'` nunca excede o valor pago do pedido.**
   Trava por trigger, não por validação de aplicação: o checkout já provou que a regra tem que
   estar no banco.
2. **Uma devolução só sai uma vez.** A transição para `enviada` é feita com `update ... where
   status = 'aprovada'` e conferência de linhas afetadas; zero linhas significa que outra
   requisição já enviou, e o chamador aborta sem reenviar.
3. **Idempotência no Asaas por `asaas_refund_id` unique.** Se a resposta se perder depois do
   envio, a reconciliação encontra o refund pelo id da cobrança em vez de mandar de novo.
4. **Débito e devolução nascem na mesma transação.** Gerar o débito depois, em outra chamada,
   abre a janela em que o dinheiro saiu e ninguém deve nada.

## RPCs

1. `devolucao_registrar(p_pedido_id, p_valor, p_motivo, p_origem, p_disputa_id default null)`
   — admin. Recusa pedido não pago, valor acima do saldo devolvível e pedido já devolvido por
   inteiro. Nasce `pendente`.
2. `devolucao_aprovar(p_devolucao_id)` — admin, distinto de quem registrou quando possível
   *(a definir com a dona: exigir dois pares de olhos ou não)*. Faz, numa transação:
   marca `aprovada`; para cada repasse do pedido, estorna o que está `pendente` e cria
   `seller_debitos` para o que está `transferido`.
3. `devolucao_marcar_enviada(p_devolucao_id, p_asaas_refund_id)` e
   `devolucao_marcar_falha(p_devolucao_id, p_motivo)` — chamadas pelo backend depois da resposta
   do Asaas. A transição de `enviada` usa a trava do invariante 2.
4. `devolucao_cancelar(p_devolucao_id, p_motivo)` — só enquanto `pendente` ou `aprovada`;
   desfaz o débito correspondente.

Nenhuma delas chama o Asaas: o banco não faz rede. O envio fica no backend, entre
`devolucao_aprovar` e `devolucao_marcar_enviada`.

## Fluxo no backend

```
POST /api/admin/devolucoes/[id]/enviar
  → lê devolução `aprovada`
  → POST refund no Asaas (asaas_cobranca_id do pedido, valor da devolução)
  → sucesso: devolucao_marcar_enviada(id, refund_id)
  → falha:   devolucao_marcar_falha(id, motivo legível)
```

Confirmação assíncrona: o webhook do Asaas já recebido em produção passa a reconhecer os eventos
de refund e move `enviada → concluida`. Sem webhook, a devolução fica `enviada` e aparece na fila
de conciliação — estado honesto, não um "concluída" otimista.

## Telas

- `/admin/devolucoes` — lista com filtro por estado, falhas em destaque, totais por período para
  bater com o extrato do Asaas.
- Ação de registrar e aprovar dentro do pedido e dentro da disputa, para a decisão e a execução
  não viverem em lugares diferentes.
- `/meus-pedidos/[id]` — bloco de devolução para o comprador: valor, estado e datas. Sem
  `falha_motivo`, sem ids externos.
- `/seller/financeiro` — débitos abertos da loja, com pedido e motivo.

## Testes planejados

Vitest (regras puras):
- saldo devolvível: total, parcial, soma de parciais, tentativa de estourar;
- decisão entre estornar repasse e gerar débito, incluindo repasse dividido entre seller e afiliado.

SQL em `begin … rollback` via `db query --linked`:
- devolução acima do valor pago é recusada;
- duas aprovações concorrentes: só uma passa para `enviada`;
- repasse `pendente` vira `estornado` e não gera débito;
- repasse `transferido` gera exatamente um `seller_debitos`, e o retry não gera o segundo;
- cancelar devolução aprovada desfaz o débito;
- RLS: comprador de outro pedido não lê a devolução; `anon` não executa nenhuma RPC.

## Bloqueios antes de implementar

- **Asaas em sandbox**: o Milestone 2 não pode ser validado com dinheiro real.
- **Prazos por meio de pagamento não verificados.** Não prometer prazo na tela do comprador antes
  de confirmar o comportamento real de PIX, boleto e cartão no Asaas.
- **Decisões da dona**: comissão da plataforma na devolução (proporcional ou retida), compensação
  automática do débito no próximo repasse, e se aprovar exige pessoa diferente de quem registrou.
