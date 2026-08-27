---
prd_number: "029"
status: implementado
priority: alta
created: 2026-08-26
issue: ""
depends_on: ["012"]
references:
  - "https://docs.asaas.com/docs/criar-uma-cobranca-parcelada"
  - "src/lib/asaas.ts"
  - "src/app/checkout/actions.ts"
---

# PRD 029: Cartão de crédito parcelado no checkout hospedado

## 1. Contexto

- **Produto/área**: Checkout do comprador em industria24.com.br — forma de pagamento Cartão de Crédito.
- **Estado anterior**: `billingType: "CREDIT_CARD"` já existia em `createPayment` (`src/lib/asaas.ts`), mas sem `installmentCount`/`installmentValue`/`totalValue` — o comprador não tinha opção de parcelar. O PRD 012 (fluxo de checkout PIX as-is) e o PRD 014 (unificação de sessão) excluem cartão explicitamente do escopo; nenhum PRD tratava parcelamento até este documento.
- **Decisão de arquitetura mantida**: o cartão continua **não** passando pelo nosso site. O comprador escolhe a forma de pagamento e (se cartão) o número de parcelas no nosso checkout, mas os dados do cartão em si são digitados na página hospedada do Asaas (`invoiceUrl`), para a qual o comprador é redirecionado — sem captura de PAN/CVV no nosso domínio, sem escopo de PCI-DSS adicional para o projeto.

## 2. Solução Implementada

### Decisões

1. Parcelamento é feito via o mesmo endpoint `POST /payments` já usado hoje (não o endpoint separado `/v3/installments`) — a doc oficial do Asaas (`criar-uma-cobranca-parcelada`) confirma que `POST /payments` aceita `installmentCount` + `totalValue` (ou `installmentValue`) e retorna a primeira cobrança com `invoiceUrl`, mesmo contrato de resposta que o fluxo síncrono existente já trata.
2. **Nunca enviar o campo `value` junto de `installmentCount`/`totalValue`** — a doc do Asaas trata isso como erro ("os dois campos de valor não foram enviados simultaneamente"). `createPayment` decide entre os dois formatos de payload conforme `installmentCount > 1`.
3. Limite de parcelas fixado em **12x** por decisão de produto (não é limite técnico do Asaas, que permite até 21x para Visa/Mastercard) — evita parcela de valor muito baixo em produtos de menor ticket; pode ser revisitado.
4. Persistência: nova coluna `pedidos.parcelas` (smallint, 1–12, default 1, migration `0145_pedidos_parcelas_cartao.sql`). Gravada no momento da criação do pedido (update simples, fora do trigger financeiro `guard_campos_restritos` da migration 0012 — não é campo sensível), não apenas quando a cobrança é gerada — isso garante que o retry manual em `/pedido/{id}` (`gerarCobranca`) usa o mesmo número de parcelas escolhido originalmente, sem re-perguntar ao comprador.
5. Repasse (`repasses`, `calcular_repasses_pedido`) não muda: a divisão de comissão já é agnóstica à forma de pagamento — opera sobre `valor_pedido`/`valor_recebido_industria`, que chegam com o mesmo formato independente de PIX, boleto ou cartão (parcelado ou não). Não reabrir a decisão de 2026-07-25 de que split nativo do Asaas está descartado (ver skill `asaas-pagamentos`).

### Fora do escopo

- Captura de cartão embutida no nosso checkout (tokenização/creditCard direto na API) — deliberadamente descartada nesta iteração; ver histórico da conversa que originou este PRD para a decisão explícita do dono.
- Qualquer mudança na lógica de repasse/split.
- Unificação de sessão de checkout do PRD 014 (que continua cobrindo só PIX).

## 3. Implementação

| Arquivo | Mudança |
|---|---|
| `supabase/migrations/0145_pedidos_parcelas_cartao.sql` | Coluna `pedidos.parcelas smallint not null default 1 check (between 1 and 12)`. Aplicada em produção via `supabase db query --linked`, validada antes com `begin…rollback`. |
| `src/lib/checkout/schemas.ts` | `parcelasSchema` (zod, 1–12, `.catch(1)`). |
| `src/lib/asaas.ts` | `createPayment` aceita `installmentCount?: number`; quando `billingType === "CREDIT_CARD"` e `installmentCount > 1`, envia `{ installmentCount, totalValue: value }` em vez de `{ value }`. |
| `src/app/checkout/actions.ts` | `finalizarCompra` lê `parcelas` do form (só relevante se `forma_pagamento === "CREDIT_CARD"`), grava em `pedidos.parcelas` logo após criar o pedido; `criarCobrancaPedido` lê `pedido.parcelas` do banco (não do form) para funcionar tanto no fluxo automático quanto no retry manual (`gerarCobranca`). |
| `src/app/checkout/page.tsx` | `<select name="parcelas">` (1x–12x) aparece só quando "Cartão" está selecionado, com nota explicando que o cartão é digitado na página do Asaas. |

## 4. Critérios de Aceite

| Critério | Como verificar |
|---|---|
| Coluna `pedidos.parcelas` existe em produção, default 1, check 1–12 | `information_schema.columns` (verificado 2026-08-26) |
| `createPayment` nunca envia `value` e `installmentCount`/`totalValue` juntos | Leitura de `src/lib/asaas.ts` |
| Retry manual (`/pedido/{id}` → "Gerar cobrança") usa o mesmo número de parcelas da tentativa original | Forçar falha na geração automática com cartão parcelado, verificar `pedido.parcelas` antes de re-tentar |
| Compra fim-a-fim em sandbox com cartão parcelado gera `invoiceUrl` com opção de parcelamento visível na página do Asaas | Teste manual em `ASAAS_ENV=sandbox` *(pendente — ver §6)* |

## 5. Registro de Decisões

- **2026-08-26:** Optado por manter o checkout hospedado (redirect) em vez de captura embutida de cartão — decisão explícita do dono do produto, trade-off: menor esforço/PCI vs. UX (comprador sai do site). Registrado para não reabrir sem pedido explícito.
- **2026-08-26:** Limite de 12 parcelas é decisão de produto, não limite técnico — ver nota no código (`parcelasSchema`).

## 6. Pendências

- Teste de compra fim-a-fim em `ASAAS_ENV=sandbox` local (bloqueado nesta sessão: puxar a chave sandbox da Vercel para `.env.local` foi bloqueado pelo classifier de segurança do Claude Code por envolver segredo — ação delegada ao dono do projeto).
- Issue/PR no GitHub referenciando este PRD (fluxo obrigatório do repositório).
