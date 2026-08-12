# Engenharia reversa — Checkout Mercado Livre (paridade estrutural)

> Status: análise concluída, sem gap de implementação encontrado no ponto pedido (paridade estrutural). Ver "Resultado" no fim.

## Fonte

Gravação de vídeo (Jam, 1m26s) de compra real no `mercadolivre.com.br`, conta `andreiaschneider@gmail.com`, produto `MLB-5936490982`, 11/08/2026. Sem áudio de decisão de UX, apenas narração factual da jornada.

## Fluxo observado

| # | Etapa | URL | Conteúdo da tela |
|---|-------|-----|-------------------|
| 1 | Home → PDP | `mercadolivre.com.br` → `produto.mercadolivre.com.br/MLB-...` | Clique em produto listado, scroll em características/descrição |
| 2 | Adicionar ao carrinho | mesma PDP | Botão "Adicionar ao carrinho" → modal de confirmação com cashback → "Entendi" |
| 3 | Carrinho | `mercadolivre.com.br/gz/cart/v2` | Lista de itens, resumo de valor, seleção de item(ns) → "Continuar (N)" |
| 4 | Revisão única | `mercadolivre.com.br/checkout/review/onestep` | **Endereço + frete + meios de pagamento na mesma tela** (não paginado) |
| 5 | Seleção de pagamento | `mercadolivre.com.br/checkout/payments?step_id=options&payment_config_id=...` | Radio de forma de pagamento (Pix, Mercado Pago, Cartões) → "Continuar" |
| 6 | Tela final | `mercadolivre.com.br/checkout/finisher/congrats?purchaseId=...` | **QR code Pix inline na própria página**, texto "pague e será creditado na hora" |

Detalhes técnicos observados nas URLs: `session_id` persiste como query param em toda a jornada de checkout; `purchaseId` já existe antes da confirmação do pagamento (Pix fica pendente); `payment_config_id` e `launch_mode=deeplink` aparecem como parâmetros de sessão do sub-passo de pagamento.

Nenhum erro de aplicação, edge case ou fricção foi capturado no vídeo — é uma jornada feliz sem obstáculos, então não há bug ou UX ruim do ML para evitar replicar.

## Escopo desta spec (paridade estrutural)

Definido pelo usuário: comparar apenas a **estrutura de etapas** do checkout — revisão única (endereço+frete+pagamento numa tela) vs. fluxo fragmentado — não o QR Pix (que é escopo separado, já também coberto, ver abaixo).

## Comparação com `industria24.com.br`

| Ponto da spec | Mercado Livre | Indústria24h (atual) | Gap? |
|---|---|---|---|
| Revisão em etapa única (endereço + frete + pagamento juntos) | `checkout/review/onestep`, uma tela | `src/app/checkout/page.tsx` — form único: seção Entrega (retirada/entrega+CEP), seção Pagamento (PIX/Boleto/Cartão), Resumo, tudo na mesma página/submit | **Não há gap** — já é etapa única |
| QR Pix inline na tela final | `checkout/finisher/congrats`, QR renderizado na página | `src/app/pedido/[id]/page.tsx:279-294` — `getPixQrCode` + `<img>` com QR + payload copia-e-cola, na página do pedido pós-checkout | **Não há gap** — já existe |

## Resultado

A comparação estrutural pedida (revisão em etapa única) já é verdade no código atual do `industria24.com.br` — o checkout não é fragmentado em múltiplas telas como o brief presumia. Não há mudança de código a fazer neste ponto: implementar "por cima" duplicaria a seção já existente em `checkout/page.tsx` ou quebraria o formulário atual.

Nenhum worktree foi tocado além da criação desta spec (`feat/checkout-paridade-onestep`, isolado, sem alterações em código).

## Diferenças reais observadas (fora do escopo pedido, registradas para referência)

Estas existem mas não foram pedidas como escopo — citadas aqui só para não se perderem, não implementadas:

- ML tem sub-etapa dedicada de seleção de pagamento (`checkout/payments`) separada da revisão; industria24h resolve tudo no mesmo submit. Isso é uma escolha de UX diferente, não um gap objetivo — mudar exigiria decisão de produto sobre trade-off de fricção vs. clareza.
- ML mostra frete/entrega já calculado e não editável nesta etapa (o endereço vem de cadastro prévio); industria24h coleta CEP/endereço no próprio checkout quando `tipo_entrega=entrega`. Também decisão de produto, não bug.
