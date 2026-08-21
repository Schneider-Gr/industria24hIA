## Context

Ver `proposal.md` — Why. Ponto técnico relevante: `checkout_criar_pedido` é `plpgsql`, sem acesso a rede, então a cotação Uber Direct (que exige HTTP) não pode acontecer dentro do RPC de criação de pedido. O mecanismo de `transportadoras`/`faixas_cep` (migration 0099/0101) já resolve seleção de transportadora no checkout para o caso interno; este design estende esse mesmo mecanismo em vez de reintroduzir a cascata backend (afiliado → parceiro → Uber Direct) desenhada originalmente no PRD 008, que exigiria tocar checagens de disponibilidade que hoje não existem de forma consultável no schema.

## Goals / Non-Goals

**Goals:**
- Cotar Uber Direct fora do RPC (rota de API dedicada), gravando o resultado para o RPC consumir sem confiar em input do client.
- Reaproveitar 100% do código de despacho pós-pagamento já existente (`despacharUberDirectSeElegivel`) — só mudar o sinal que decide chamá-lo.

**Non-Goals:**
- Reimplementar a cascata de disponibilidade afiliado→parceiro→Uber Direct do fluxo de negócio original do PRD (§4) — substituída pela reconciliação com `transportadoras` já registrada no próprio PRD (§2).
- Refund API e correção do valor real da signing key do webhook — dependências externas, ver proposal.md.

## Decisions

- **Cotação Uber Direct só quando não há cobertura interna** (não como opção sempre visível ao lado das outras). Alternativa considerada: sempre oferecer as duas — descartada porque o PRD enquadra Uber Direct como "fallback" (título do próprio documento) e cobrar a via terceirizada nos casos já resolvidos internamente não tem motivação de produto registrada.
- **Tabela `cotacoes_frete_externo` para guardar a cotação antes do pagamento**, em vez de reaproveitar `linha_itens` ou confiar no client. Alternativa considerada: passar `fee_centavos` direto do client para o RPC — rejeitada por permitir ao comprador manipular o valor do frete (risco financeiro direto).
- **Sinal explícito de despacho pós-pagamento via `linha_itens.transportadora_id`**, não uma nova coluna. Alternativa considerada: coluna dedicada `usa_uber_direct` — rejeitada porque `transportadora_id` já carrega essa informação desde a escolha no checkout; duplicar o dado criaria uma segunda fonte de verdade para a mesma decisão.
- **`cotar_frete_interno` como função SQL `stable`** extraindo a lógica de match já existente dentro de `checkout_criar_pedido`, em vez de duplicar a query em TypeScript na rota de API — evita duas implementações divergentes da mesma regra de negócio (uma em SQL, outra em JS).

## Risks / Trade-offs

- [Cotação Uber Direct exposta à rota de API pode ser chamada repetidamente pelo mesmo usuário, gerando custo] → Mitigado com rate limit (20/min por usuário, `checarLimite`), mesmo padrão já usado no checkout.
- [Multi-loja: a estimativa de frete exibida antes da cotação real completar ainda usa o percentual flat de 10%, que pode divergir do valor real por loja] → Aceito como limitação pré-existente (a estimativa antiga já não distinguia lojas); a cotação real substitui a estimativa assim que completa.
- [`UBER_DIRECT_WEBHOOK_SIGNING_KEY` com valor errado (client_secret em vez da signing key dedicada) significa que a validação de assinatura do webhook de status Uber Direct está efetivamente sempre rejeitando ou sempre aceitando de forma incorreta hoje] → Fora do escopo deste change corrigir o valor (exige acesso ao painel Uber Direct); documentado como pendência operacional explícita no código e no proposal.
- [Reembolso Uber Direct não implementado] → Bloqueado por acordo comercial + contrato de API não confirmado; nenhum código especulativo foi escrito para não inventar schema/contrato externo (regra do projeto).

## Migration Plan

1. Aplicar `0139_uber_direct_transportadora.sql` → `0140_checkout_cotacao_uber_direct.sql` → `0141_corridas_seller_read.sql`, cada uma testada em `begin;...rollback;` via `supabase db query --linked --file` antes de aplicar de verdade (dado real em produção).
2. Deploy do código (`vercel --prod`), confirmado via `vercel inspect`.
3. Teste ponta a ponta com pedido sintético (ver proposal.md/tasks.md) antes de considerar o milestone fechado.
4. Rollback: as três migrations são aditivas (novas colunas/tabela/policy/função, nenhum `drop`/`alter` destrutivo em dado existente) — reverter é remover o código novo; não é necessário reverter schema em caso de rollback de código.

## Open Questions

- Uber Direct sempre visível ao lado das transportadoras internas (em vez de só fallback) é uma decisão de produto explicitamente deixada em aberto no PRD 008 §2.5 — resolvida aqui por assunção (fallback estrito), documentada no proposal; confirmar com o dono do produto se a intenção for diferente.
