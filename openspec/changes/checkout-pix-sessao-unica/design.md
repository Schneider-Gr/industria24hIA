## Context

Ver `proposal.md` para a motivação. Estado atual relevante para o desenho técnico:

- `finalizarCompra` (`src/app/checkout/actions.ts:19-236`) cria o pedido via RPC `checkout_criar_pedido` e tenta `criarCobrancaPedido` em best-effort — se falhar, engole o erro e redireciona mesmo assim.
- `gerarCobranca` (`checkout/actions.ts:299-334`) é uma Server Action separada, disparada por um form action direto (sem `useActionState`) na página `/pedido/{id}`, chamada só quando o comprador clica manualmente.
- `criarCobrancaPedido` (`checkout/actions.ts:238-294`) e o cliente Asaas (`src/lib/asaas.ts`) fazem até 3 chamadas HTTP sequenciais sem timeout — comportamento coberto pela correção do PRD 013, pré-requisito deste change.
- Hoje não existe nenhum campo no pedido que represente "geração de cobrança em andamento" ou "última tentativa falhou" — o estado é binário (`asaas_cobranca_id` nulo ou preenchido), e é esse binário que a UI usa para decidir se mostra formulário ou QR.

## Goals / Non-Goals

**Goals:**
- Definir como representar os três estados percebidos pelo comprador (processando / sucesso / falha) sem depender só do binário `asaas_cobranca_id`.
- Definir como a Server Action de geração de cobrança se conecta ao carregamento inicial da página do pedido, para o progresso aparecer imediatamente após a confirmação, sem exigir um clique manual do comprador no caminho feliz.
- Manter a garantia de segurança existente: `asaas_cobranca_id`/`link_cobranca` continuam graváveis só por service role (trigger `guard_campos_restritos`).

**Non-Goals:**
- Não decide a implementação da correção do PRD 013 (timeout no `fetch` do Asaas) — esse design assume que ela já existe e falha de forma tratada (erro ou timeout distinguível), não que trava.
- Não introduz suporte a Boleto/Cartão nesta sessão unificada — mesmo escopo do PRD 014 (só PIX).
- Não decide biblioteca de state machine ou padrão de streaming/polling específico — só a forma observável do comportamento.

## Decisions

1. **Novo campo de status de cobrança no pedido, além do binário atual.** Introduzir uma coluna (ex.: `cobranca_status`, valores `pendente` | `processando` | `gerada` | `falhou`) em vez de inferir o estado só de `asaas_cobranca_id` nulo/preenchido.
   - Alternativa considerada: manter o binário atual e inferir "falhou" de um timestamp de última tentativa. Rejeitada porque não distingue "nunca tentou" de "tentou e falhou", que é exatamente a distinção que a US04/Requirement "Formulário de recuperação manual como caminho de exceção" precisa fazer.

2. **Geração de cobrança disparada automaticamente ao carregar `/pedido/{id}?novo=1` quando `cobranca_status = 'pendente'`, não só por clique manual.** A tentativa automática de `finalizarCompra` continua existindo, mas se ela não concluir a tempo de redirecionar, a própria página do pedido assume a geração em vez de esperar um clique — fechando a lacuna que hoje faz o comprador cair direto numa tela de formulário sem nenhuma tentativa visível ter ocorrido.
   - Alternativa considerada: manter geração 100% síncrona dentro de `finalizarCompra` antes do redirect. Rejeitada porque prende a resposta da confirmação do pedido à latência do gateway de pagamento, contrariando a garantia do PRD 012 de que o pedido é sempre criado independentemente do resultado da cobrança.

3. **Idempotência por pedido usando o próprio `cobranca_status`.** Uma tentativa só é iniciada se o status não for já `processando` — isso cobre o requisito de não duplicar cobrança em cliques repetidos (US03 do PRD 014) sem precisar de lock externo.
   - Alternativa considerada: lock distribuído (ex.: advisory lock do Postgres). Rejeitada por desnecessária — o próprio campo de status no pedido, lido/escrito pela service role protegida pelo trigger existente, já serve como guarda.

## Risks / Trade-offs

- [Nova coluna de status exige migration e trigger/check constraint adicionais, área sensível de `pedidos` já protegida por `guard_campos_restritos`] → Migration deve seguir o processo da skill `migrations-industria24` (checagem de colisão de número, teste em `begin; ...; rollback;` antes de aplicar), e o novo campo deve entrar na mesma lista de campos restritos a service role, não ficar gravável pelo client do comprador.
- [Disparo automático de geração ao carregar a página pode competir com a tentativa best-effort de `finalizarCompra` se ambas rodarem quase ao mesmo tempo] → Mitigado pela idempotência da Decisão 3: a segunda tentativa vê `processando` e não duplica.
- [Se a correção do PRD 013 não estiver completa antes deste change ser implementado, o novo estado "processando" pode ficar preso do mesmo jeito que o botão trava hoje] → Este design depende explicitamente do PRD 013; não deve ser implementado antes dele estar concluído (ver `proposal.md`).

## Open Questions

- Nome final da coluna de status e se ela deve ser um enum Postgres dedicado ou um `text` com check constraint (segue o padrão já usado em `status_pedido`, que é `text` com check) — decisão de baixo risco, adiável para a implementação.
