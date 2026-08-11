---
prd_number: "012"
status: rascunho
priority: alta
created: 2026-08-11
issue: ""
depends_on: []
references:
  - "https://jam.dev/c/91830ec8-a9f2-4a11-b4ca-986fcb145a9e"
---

# PRD 012: Fluxo de Checkout PIX (as-is)

## 1. Contexto

- **Produto/área**: Checkout do comprador no marketplace industria24.com.br — jornada de compra de um produto até a criação do pedido e a geração da cobrança PIX.
- **Estado atual**: Este PRD documenta o comportamento **como ele existe hoje em produção**, levantado por engenharia reversa (navegação ao vivo com conta de teste `comprador-teste-i24` + leitura do código do repositório). Não é uma proposta de mudança — é a fonte de verdade do fluxo atual, para servir de base de comparação a mudanças futuras (inclusive à correção documentada no PRD 013, que nasce diretamente desta investigação).
- **Problema**: A criação do pedido e a geração da cobrança PIX são duas etapas desacopladas em duas telas diferentes, cada uma com seu próprio formulário de identificação do comprador (nome + CPF/CNPJ pedidos duas vezes). Esse desenho é a causa raiz de a jornada poder terminar com um pedido criado mas sem cobrança gerada — comportamento que hoje é tratado como best-effort aceitável, mas que colide com a expectativa do comprador de "comprei e vou pagar". Ver PRD 013 para o incidente concreto onde essa lacuna trava a jornada por completo.

## 2. Solução Proposta

### Visão de produto

- Documentar o fluxo de checkout PIX ponta a ponta como ele se comporta hoje, incluindo os dois passos desacoplados (criação do pedido e geração da cobrança).
- Servir de linha de base para qualquer decisão futura de unificar ou não essas duas etapas.
- Registrar o comparativo de UX com o fluxo de checkout PIX do Mercado Livre, observado ao vivo, como referência de mercado.

### Decisões de produto

1. Este PRD é declarativo (as-is), não prescritivo — não introduz nenhuma US de mudança de comportamento. *(premissa — confirme ou corrija: se a intenção for também propor a unificação das duas telas de pagamento, isso deveria virar uma US nova aqui ou um PRD separado de melhoria de UX, não misturado com o registro do estado atual)*
2. Pedido é criado por loja: quando o carrinho tem itens de lojas diferentes, o checkout gera um pedido por `loja_id`, não um pedido único multiloja.

### Fora do escopo

- Fluxo de pagamento via Boleto e Cartão de crédito — este PRD cobre apenas o caminho PIX observado na investigação. *(premissa — confirme ou corrija)*
- Correção do bug de geração de cobrança que trava sem completar — está no PRD 013.
- Qualquer redesenho de UX do checkout — este documento é só o registro do estado atual.

## 3. Funcionalidades

### US01: Adicionar produto ao carrinho e iniciar compra

Como comprador, quero clicar em "Comprar" na página do produto, para ir direto ao checkout com o item já no carrinho.

**Rules:**
- O botão "Comprar" na página `/produto/{id}` adiciona o produto ao carrinho e navega para `/checkout`.
- A quantidade considerada é a selecionada no seletor de quantidade da página do produto no momento do clique.

**Edge cases:**
- Produto sem estoque suficiente para a quantidade selecionada → checkout revalida estoque no servidor (via RPC `checkout_criar_pedido`) e barra a criação do pedido *(premissa — confirme ou corrija; comportamento de erro exibido ao usuário não foi observado ao vivo)*.

### US02: Preencher dados de entrega e pagamento no checkout

Como comprador, quero escolher forma de entrega e forma de pagamento e informar meus dados, para confirmar o pedido.

**Rules:**
- Forma de entrega: "Retirar na loja" (sem frete) ou "Entrega" (~10% do valor do pedido, aplicado sobre o subtotal dos itens).
- Forma de pagamento: PIX, Boleto ou Cartão (radio `forma_pagamento`, valores `PIX`/`BOLETO`/`CREDIT_CARD`).
- Campos obrigatórios: Nome completo, CPF ou CNPJ, WhatsApp (com DDD).
- O painel "Resumo" mostra itens, frete e total antes da confirmação.

**Edge cases:**
- CPF/CNPJ inválido → bloqueia confirmação com mensagem de validação *(premissa — confirme ou corrija; validação client-side não inspecionada em detalhe)*.
- Carrinho com produtos de mais de uma loja → o sistema agrupa por `loja_id` e cria um pedido por loja ao confirmar (ver US03).

### US03: Confirmar pedido

Como comprador, quero confirmar o pedido preenchido, para que ele seja registrado e eu seja levado à etapa de pagamento.

**Rules:**
- Ao confirmar, o sistema roda a Server Action `finalizarCompra` (`src/app/checkout/actions.ts:19-236`), que agrupa os itens por `loja_id` e chama a RPC `checkout_criar_pedido` uma vez por loja — ou seja, um carrinho multiloja gera múltiplos pedidos em uma única confirmação.
- A RPC revalida preço e estoque no banco antes de gravar (não confia apenas no client).
- O pedido é criado com `status_pedido = 'Aguardando Pagamento'` e um código curto (`id_venda`, ex.: `2642FD3F54`).
- O telefone de contato é gravado via RPC `pedido_registrar_contato` logo em seguida.
- Se aplicável, o aceite dos termos do Mercado Futuro é carimbado no mesmo fluxo.
- Ao final, o sistema tenta gerar a cobrança PIX automaticamente (`criarCobrancaPedido`) em modo best-effort: se essa tentativa falhar, o pedido **não é desfeito** — ele permanece criado e aguardando pagamento.
- Após a confirmação, o comprador é redirecionado para `/pedido/{id}?novo=1`.

**Edge cases:**
- Geração automática da cobrança falha durante `finalizarCompra` → pedido permanece criado com `status_pedido = 'Aguardando Pagamento'` e sem `asaas_cobranca_id`; comprador vê a tela de pedido com a opção de gerar a cobrança manualmente (US04).
- Preço ou estoque mudou entre a página do produto e a confirmação → RPC revalida e pode rejeitar a confirmação *(premissa — mensagem exata ao usuário não observada)*.

### US04: Gerar cobrança PIX manualmente na página do pedido

Como comprador, quero gerar a cobrança PIX na página do meu pedido quando ela não foi criada automaticamente, para poder pagar.

**Rules:**
- A página `/pedido/{id}` mostra uma seção "Pagamento" separada quando `asaas_cobranca_id` está nulo, com campos Nome completo e CPF/CNPJ (pedidos novamente, independente do formulário do checkout) e um botão "Gerar cobrança".
- O botão dispara a Server Action `gerarCobranca` (`src/app/checkout/actions.ts:299-334`), que chama a mesma função `criarCobrancaPedido` usada no fluxo automático (`checkout/actions.ts:238-294`): busca ou cria o cliente no Asaas (`asaas_clientes`), cria a cobrança (`payments`) e grava `asaas_cobranca_id`/`link_cobranca` no pedido.
- A gravação de `asaas_cobranca_id`/`link_cobranca` só é permitida para admin/service role (trigger `guard_campos_restritos`, migration `0012_hardening_seguranca.sql`) — por isso essa etapa roda com client de serviço, não com o client autenticado do comprador.
- Quando a cobrança é gerada com sucesso, a página passa a exibir o QR code / link de pagamento em vez do formulário.

**Edge cases:**
- Ver PRD 013 para o caso em que essa etapa trava sem completar — esse PRD assume o caminho feliz (cobrança gerada com sucesso).

### US05: Confirmação de pagamento via webhook

Como comprador, quero que meu pedido seja atualizado automaticamente quando o pagamento PIX for confirmado, para acompanhar o status sem ação manual.

**Rules:**
- O webhook do Asaas (`src/app/api/asaas/webhook/route.ts:170-176`) escuta eventos de pagamento.
- Eventos `PAYMENT_RECEIVED` e `PAYMENT_CONFIRMED` atualizam `status_pedido` para `'Pagamento Realizado'`, o que dispara a geração automática de um código de retirada (`codigo_retirada`) via trigger.
- Eventos `PAYMENT_OVERDUE`, `PAYMENT_DELETED`, `PAYMENT_CANCELED` e `PAYMENT_REFUNDED` cancelam o pedido e devolvem o estoque via RPC `pedido_cancelar_devolver_estoque`.

**Edge cases:**
- Webhook chega antes de o `asaas_cobranca_id` estar gravado no pedido (condição de corrida entre US04 e o webhook) → *(premissa — comportamento de reconciliação não observado; a validar)*.

## 4. Fluxo de Negócio

```
Comprador clica "Comprar" no produto
   │
   ▼
Checkout: entrega + pagamento + dados
   │
   ▼
Confirmar pedido (finalizarCompra)
   │
   ▼
Pedido criado (Aguardando Pagamento) ──▶ tenta gerar cobrança automaticamente
   │                                          │
   │                                    sucesso? ──sim──▶ QR/link PIX exibido
   │                                          │
   ▼                                         não
Redireciona para /pedido/{id}                 │
   │◀──────────────────────────────────────────
   ▼
asaas_cobranca_id nulo? ──sim──▶ mostra form "Gerar cobrança" (US04)
   │
  não
   ▼
Mostra QR/link PIX
   │
   ▼
Comprador paga ──▶ webhook Asaas ──▶ Pagamento Realizado (gera código de retirada)
                              └──▶ Vencido/Cancelado/Estornado ──▶ Cancelado (devolve estoque)
```

## 5. Critérios de Aceite

### 5a. Critérios de aceite da feature

| Critério | Razão de negócio | Como verificar (observável) |
|----------|------------------|-----------------------------|
| Confirmar pedido sempre grava o pedido em `pedidos`, mesmo se a geração automática de cobrança falhar | Comprador não pode perder o pedido por uma falha de terceiro (Asaas) | Forçar falha na chamada Asaas e confirmar que o pedido aparece em "Meus Pedidos" com status `Aguardando Pagamento` |
| Um carrinho com itens de N lojas gera N pedidos ao confirmar | Cada loja precisa de um pedido próprio para gestão de repasse e status independentes | Adicionar itens de 2 lojas, confirmar, verificar 2 registros em `pedidos` com `loja_id` distintos |
| `asaas_cobranca_id`/`link_cobranca` só são graváveis por admin/service role | Impede que o próprio comprador manipule o valor ou o link de pagamento do pedido | Tentar update direto nesses campos com o client autenticado do comprador e confirmar rejeição pelo trigger |

### 5b. Métricas de sucesso

| Métrica | Baseline (fonte) | Meta | Prazo | Mín. aceitável | Responsável |
|---------|-------------------|------|-------|-----------------|-------------|
| % de pedidos criados que chegam a ter `asaas_cobranca_id` preenchido | A levantar — consultar `pedidos` em produção | 100% *(premissa — meta ideal é toda cobrança ser gerada, mas depende da correção do PRD 013)* | A definir | A definir | Time de produto/checkout |

## 6. Milestones

### Milestone 1: Documentar o fluxo atual de checkout PIX

**Por que é um marco:** Estabelece a linha de base compartilhada do comportamento real do checkout, permitindo que qualquer proposta de mudança futura (incluindo a correção do PRD 013) seja avaliada contra o estado documentado, não contra suposições.

**Funcionalidades:** US01, US02, US03, US04, US05

**Checklist de aceite** (marcado pelo Aprovador após a implementação):
- [ ] Fluxo documentado revisado e validado por alguém com acesso a produção (confirma que bate com o comportamento real)
- [ ] Schema e enums de `pedidos`/`linha_itens`/`asaas_clientes` conferidos contra as migrations vigentes

**Aprovador:** Dono do produto / squad de checkout

## 7. Riscos e Dependências

| Risco | Impacto | Mitigação | Status |
|-------|---------|-----------|--------|
| Documento fica desatualizado se o fluxo mudar sem atualização deste PRD | Médio | Tratar como registro histórico "as-is" e abrir PRD novo para qualquer mudança de comportamento, conforme regra de imutabilidade | Pendente |
| Duas telas de identificação do comprador (checkout e página do pedido) geram fricção e potencial abandono | Médio | Avaliar unificação em PRD de melhoria futuro, fora deste escopo | Pendente |

**Dependências:**

| Dependência | Tipo | Status | Impacto se bloqueado |
|-------------|------|--------|----------------------|
| PRD 013 (bug de geração de cobrança travando) | Interna | Rascunho | Nenhum — PRD 013 depende deste, não o contrário |

## 8. Referências

- [Gravação Jam do checkout PIX do Mercado Livre](https://jam.dev/c/91830ec8-a9f2-4a11-b4ca-986fcb145a9e) — benchmark de UX narrado pela própria usuária: fluxo contínuo em etapas (carrinho → revisão com endereço/frete → seleção de pagamento em tela dedicada com PIX → volta à revisão → finalização → confirmação de sucesso), sem etapa desacoplada de geração de cobrança como na Indústria 24h.

## 9. Registro de Decisões

- **2026-08-11:** Documento tratado como as-is (registro do comportamento atual), não como proposta de mudança. Motivo: a investigação nasceu de reproduzir a compra ao vivo para entender o fluxo real antes de propor qualquer correção — misturar "o que é" com "o que deveria ser" no mesmo PRD violaria a separação de papéis do processo.
- **2026-08-11:** Bug de geração de cobrança travando foi extraído para PRD separado (010) em vez de virar edge case aqui. Motivo: é um achado com impacto e causa própria, não um comportamento esperado do fluxo — não se encaixa como "as-is" no sentido de comportamento correto documentado.
