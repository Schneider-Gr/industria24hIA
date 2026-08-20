---
prd_number: "026"
status: rascunho
priority: média
created: 2026-08-20
issue: ""
depends_on: ["008"]
references:
  - "docs/prds/008-frete-uber-direct-fallback.md"
  - "src/lib/uber-direct.ts"
  - "src/app/api/asaas/webhook/route.ts"
  - "supabase/migrations/0074_consolidacao_carga_rota.sql"
  - "supabase/migrations/0103_uber_direct_tracking.sql"
  - "supabase/migrations/0003_seed_taxonomia.sql"
  - ".claude/skills/afiliado-logistica/SKILL.md"
---

# PRD 026: Uber Direct como opção de entrega escolhida no checkout

## 1. Contexto

- **Produto/área**: Indústria 24h, marketplace de Manaus. Checkout
  (`checkout_criar_pedido`, migration 0074) e módulo de logística
  (Uber Direct, PRD 008).
- **Estado atual**: o Uber Direct já está integrado (`src/lib/uber-direct.ts`),
  mas só como **fallback silencioso pós-pagamento** — dispara no webhook do
  Asaas, depois de confirmado que o despacho automático interno (afiliado
  logístico / pool de parceiros) não gerou nenhuma corrida para o pedido. O
  comprador nunca vê nem escolhe essa via; ela só existe quando a logística
  interna falha em cobrir o pedido.
- **Problema**: para categorias de itens leves (hortifruti, supermercado,
  pet shop), o comprador poderia preferir a entrega expressa da Uber mesmo
  quando o afiliado logístico da loja cobriria o pedido — por rapidez ou
  previsibilidade de horário. Hoje essa escolha não existe: o sistema decide
  sozinho, e só recorre à Uber quando não há alternativa. Sessão de
  levantamento (2026-08-20) confirmou com o dono do produto: a opção deve
  aparecer **só para categorias específicas de itens leves**, com o
  **preço real da cotação da Uber, sem markup da plataforma**.

> **Contexto técnico**: o frete padrão do marketplace é ad valorem — um
> `percentual` por faixa de CEP (`faixas_cep`), calculado dentro da RPC
> `checkout_criar_pedido` sem nenhuma chamada de rede. A cotação Uber é um
> modelo de preço diferente (fee real por distância, via API síncrona, com
> expiração curta) — os dois não são intercambiáveis linha a linha; este
> PRD adiciona um segundo caminho de preço ao checkout, não substitui o
> ad valorem.

## 2. Solução Proposta

### Visão de produto

- No carrinho/checkout, quando **todos os itens do pedido** pertencem a uma
  categoria elegível e o endereço de entrega está completo, exibir **duas
  opções de entrega** lado a lado: "Frete padrão" (ad valorem, valor e prazo
  já calculados hoje) e "Entrega expressa Uber" (fee real da cotação + ETA).
- O comprador escolhe uma das duas antes de pagar; o valor escolhido é o que
  compõe `valor_pedido` e o que é cobrado via Asaas.
- Se o comprador escolher Uber, o despacho automático interno de corridas é
  **pulado por completo** para aquele pedido — não compete com o afiliado
  logístico da loja para pedidos que ele escolheu deliberadamente entregar
  via Uber. Se escolher frete padrão, comportamento é idêntico ao de hoje
  (incluindo o fallback Uber pós-pagamento do PRD 008, que continua existindo
  como rede de segurança).

### Decisões de produto

1. **Elegibilidade por categoria, curada por admin — não por peso do
   produto.** `produtos.peso` só está preenchido para 89 de 358 produtos
   hoje (achado já registrado em comentário da migration 0102) — não é
   confiável como critério de elegibilidade automática. A elegibilidade
   fica em uma flag por categoria (`categorias.elegivel_uber_direct
   boolean default false`), com o admin marcando manualmente as categorias
   de itens leves. Candidatas naturais pela taxonomia real já semeada
   (`0003_seed_taxonomia.sql`): **Supermercado, Verduras, Legumes, Pet
   Shop**. *(premissa — confirme ou corrija: a lista final é decisão do
   admin/curadoria, não travada por este PRD)*
2. **Pedido 100% elegível, não por item.** Um pedido só oferece a opção
   Uber se **todos** os produtos do carrinho estiverem em categoria
   elegível — carrinho é de uma loja só (regra já existente), então a
   entrega é uma corrida única; misturar itens elegíveis e não elegíveis
   no mesmo pedido não tem como virar duas entregas físicas sem redesenhar
   o checkout multi-remessa. *(premissa — confirme ou corrija)*
3. **Cotação só é solicitada quando a forma de pagamento é PIX.** A cotação
   da Uber expira em minutos; o preço mostrado no checkout precisa ser o
   preço efetivamente cobrado. Como PIX confirma em segundos (já é o caminho
   dominante do checkout), a criação da entrega Uber acontece no mesmo
   webhook que já dispara hoje, dentro da janela de validade da cotação
   original. **Boleto e cartão não oferecem a opção Uber no checkout** —
   ficam só no frete padrão, evitando cobrar um valor que pode não bater
   mais com a cotação no momento da confirmação (dias depois, no caso de
   boleto). *(premissa forte — confirme ou corrija: se o negócio quiser
   Uber em boleto/cartão, precisa de re-cotação e ajuste de valor no
   momento da confirmação, escopo maior que este PRD)*
4. **Preço real da Uber, sem markup.** O comprador paga exatamente o
   `feeCentavos` retornado pela cotação — decisão já tomada na sessão.
   Isso é uma divergência deliberada do modelo de repasse padrão (que tira
   5% de plataforma sobre o valor dos itens); o frete Uber não gera receita
   de intermediação para a Indústria 24h. *(premissa — confirme ou corrija:
   aceitar zero margem neste fluxo é a troca consciente por oferecer a
   opção)*
5. **Cotação exibida no checkout precisa do endereço completo do
   comprador**, não só do CEP (diferente do ad valorem, que só usa faixa de
   CEP). Se o formulário de entrega ainda não tiver rua/número
   preenchidos, a opção Uber não aparece até completar o endereço.

### Fora do escopo

- **Re-cotação para boleto/cartão** — ver Decisão 3. Fica para PRD futuro se
  o negócio priorizar.
- **Elegibilidade automática por peso/dimensão do produto** — dado não
  confiável hoje (Decisão 1); fica de fora até o cadastro de peso melhorar.
- **Split/comissão da plataforma sobre o frete Uber** — decisão já fechada
  (sem markup); reabrir é mudança de política de preço, não deste PRD.
- **Mudar o fallback pós-pagamento do PRD 008** — continua existindo como
  está, cobrindo os pedidos que não escolheram Uber no checkout mas cuja
  logística interna falhou.
- **Rastreamento em tempo real diferenciado no checkout** — a experiência
  pós-compra (tracking) já existe via `rotas.uber_tracking_url`; este PRD
  cobre só a escolha e cobrança no momento do checkout.

## 3. Funcionalidades

### US01: Admin marca quais categorias aceitam entrega Uber

Como admin, quero marcar quais categorias de produto são elegíveis para
entrega via Uber Direct, para controlar o raio de exposição da plataforma
a esse fluxo sem depender de dado de peso não confiável.

**Rules:**
- Nova coluna `categorias.elegivel_uber_direct boolean not null default
  false`.
- Toggle em `/admin/categorias` (tela já existente), sem UI nova além do
  campo.
- Mudança tem efeito imediato no próximo checkout — não precisa
  reprocessar produtos existentes.

**Edge cases:**
- Categoria sem nenhuma subcategoria elegível marcada mas com produtos com
  `permite_logistica_afiliado = false` → sem conflito: são flags
  independentes, um controla quem pode ser afiliado exclusivo, o outro
  controla se Uber aparece como opção no checkout.

### US02: Comprador vê e escolhe frete padrão ou Uber Direct no checkout

Como comprador, quero ver o preço e prazo da entrega Uber ao lado do frete
padrão quando o pedido for elegível, para escolher a opção que prefiro
antes de pagar.

**Rules:**
- Elegibilidade calculada no carrinho/checkout: todos os itens em
  categoria `elegivel_uber_direct = true` **e** endereço de entrega
  completo (rua, número, CEP) **e** forma de pagamento = PIX.
- Nova rota `POST /api/checkout/cotar-uber` (ou equivalente) chama
  `cotarEntrega()` com o endereço da loja (origem) e do comprador
  (destino), retornando fee e ETA — sem gravar nada ainda, só para exibição.
- Comprador escolhe explicitamente uma das duas opções; nenhuma é
  pré-selecionada por padrão. *(premissa — confirme ou corrija: pode fazer
  sentido pré-selecionar o frete padrão como default menos surpreendente)*
- `checkout_criar_pedido` recebe novo parâmetro `metodo_entrega text
  default 'padrao' check (metodo_entrega in ('padrao', 'uber_direct'))`.
  Quando `'uber_direct'`, usa o fee cotado (passado como parâmetro,
  validado contra uma faixa de tolerância) em vez de calcular o ad
  valorem por `faixas_cep`.

**Edge cases:**
- Cotação expira entre a exibição e o clique em "finalizar compra" →
  reconsultar antes de submeter o pedido; se expirado, pedir para o
  comprador confirmar de novo o valor atualizado antes de criar o pedido.
- Comprador muda forma de pagamento de PIX para boleto depois de escolher
  Uber → opção Uber desaparece e o checkout volta para frete padrão,
  com aviso explícito do motivo.
- Loja sem endereço completo (mesmo gate já existente no fallback do PRD
  008) → opção Uber nunca aparece para pedidos dessa loja.

### US03: Pedido com Uber escolhido pula o despacho automático interno

Como sistema, quando o pedido foi criado com `metodo_entrega =
'uber_direct'`, quero criar a entrega Uber diretamente na confirmação do
pagamento, sem tentar despachar via afiliado/pool primeiro, para não gerar
uma corrida interna concorrente com a escolha do comprador.

**Rules:**
- No webhook do Asaas, se `pedido.metodo_entrega = 'uber_direct'`, pular a
  chamada a `despachar_corrida_automatica` inteiramente e chamar
  `cotarEntrega()` + `criarEntrega()` diretamente (reaproveita o código já
  existente de `despacharUberDirectSeElegivel`, sem o gate `if (corridaId)
  return`).
- Se a criação da entrega Uber falhar nesse momento (API fora do ar,
  cotação expirada de verdade), cai no comportamento de fallback já
  existente — tenta o despacho interno como plano B, e loga no Sentry que
  o pedido pretendia Uber e não conseguiu.

**Edge cases:**
- Falha simultânea de Uber e de despacho interno → pedido fica sem
  corrida/rota, mesmo estado de erro que já existe hoje sem este PRD;
  admin resolve manualmente via `/admin/pedidos`.

## 4. Fluxo de Negócio

```
carrinho fechado, endereço completo, todos os itens em categoria elegível,
forma de pagamento = PIX
  → checkout mostra: [Frete padrão R$X · prazo Y] [Uber Direct R$Z · ETA W]
  → comprador escolhe
      frete padrão → fluxo atual, sem mudança
      Uber Direct  → checkout_criar_pedido(metodo_entrega='uber_direct', fee cotado)
                    → paga via PIX
                    → webhook Asaas confirma pagamento
                    → pedido.metodo_entrega = 'uber_direct'?
                        sim → cotarEntrega() + criarEntrega() direto (pula despacho interno)
                        não → fluxo atual (despacho interno → fallback Uber se necessário)
```

## 5. Critérios de Aceite

### 5a. Critérios de aceite da feature

| Critério | Razão de negócio | Como verificar (observável) |
|----------|-------------------|------------------------------|
| Admin marca categoria como elegível e a opção passa a aparecer no checkout para pedidos 100% daquela categoria | é o mecanismo de controle de exposição da Decisão 1 | marcar `Verduras` elegível, montar carrinho só com produtos dessa categoria, conferir que a opção Uber aparece |
| Pedido misto (categoria elegível + não elegível) nunca mostra opção Uber | Decisão 2 — carrinho é de uma corrida só | montar carrinho misto e confirmar ausência da opção |
| Boleto/cartão nunca mostram opção Uber, mesmo com categoria elegível | Decisão 3 — janela de expiração da cotação | trocar forma de pagamento no checkout e conferir que a opção some |
| Valor cobrado no pedido com Uber escolhido é exatamente o fee cotado, sem acréscimo | Decisão 4 | conferir `valor_pedido` gravado contra `cotacao.feeCentavos` |
| Pedido com `metodo_entrega='uber_direct'` não gera linha em `corridas` | US03 — não deve competir com afiliado/pool | `begin; ...; select count(*) from corridas where pedido_id=...; rollback;` = 0 |

### 5b. Métricas de sucesso

| Métrica | Baseline (fonte) | Meta | Prazo | Mín. aceitável | Responsável |
|---------|-------------------|------|-------|------------------|-------------|
| % de pedidos elegíveis que escolhem Uber Direct no checkout | 0% hoje (opção não existe) | A definir após piloto | 60 dias após deploy | não é bloqueante — feature é opcional por natureza | dono do produto |
| Divergência entre fee cotado no checkout e fee efetivamente cobrado na criação da entrega | não medido hoje | 0 (mesmo fee, dado o gate de PIX) | Contínuo | 0 | dono do módulo logística |

## 6. Milestones

### Milestone 1: Elegibilidade por categoria + cotação exibida no checkout

**Funcionalidades:** US01, US02 (só exibição, sem ainda gravar `metodo_entrega`)

**Checklist de aceite:**
- [ ] `categorias.elegivel_uber_direct` + toggle em `/admin/categorias`
- [ ] Rota de cotação síncrona no checkout, com tratamento de expiração
- [ ] UI mostrando as duas opções quando elegível

**Aprovador:** dono do repositório (industria24hs-creator)

### Milestone 2: Checkout grava a escolha e webhook honra o método

**Funcionalidades:** US02 (parte de gravação), US03

**Checklist de aceite:**
- [ ] `checkout_criar_pedido` aceita `metodo_entrega` e usa o fee cotado
- [ ] Webhook Asaas pula despacho interno quando `metodo_entrega='uber_direct'`
- [ ] Teste `begin; ...; rollback;` cobrindo pedido Uber não gerar corrida interna

**Aprovador:** dono do repositório (industria24hs-creator)

## 7. Riscos e Dependências

| Risco | Impacto | Mitigação | Status |
|-------|---------|-----------|--------|
| Cotação exibida no checkout expira antes da submissão do pedido | Médio | re-cotar no momento de "finalizar compra", não reusar cotação antiga silenciosamente | A tratar na implementação (US02) |
| Assinatura do webhook Uber Direct não confirmada contra a doc real (achado da sessão anterior) | Médio | fora do escopo deste PRD, mas o volume de entregas Uber aumenta com esta feature — vale revalidar antes do rollout | Pendente, não bloqueante |
| Categoria marcada elegível por engano expõe a plataforma a custo de frete sem markup em volume não previsto | Baixo | toggle é reversível a qualquer momento em `/admin/categorias`, efeito imediato | Mitigado por desenho |
| Afiliado logístico da loja perde volume de corridas para pedidos que escolhem Uber deliberadamente | Médio (é a troca consciente da feature) | admin controla o raio via categoria elegível; loja pode observar impacto e pedir para desmarcar categoria | Aceito conscientemente |

**Dependências:**

| Dependência | Tipo | Status | Impacto se bloqueado |
|-------------|------|--------|------------------------|
| PRD 008 (fallback Uber Direct) | Interna | ✅ implementado em produção | nenhum — este PRD reaproveita a integração já existente |
| Confiabilidade de `produtos.peso` | Interna | 89/358 produtos preenchidos hoje | não bloqueia (Decisão 1 usa categoria, não peso), mas limita elegibilidade futura mais granular |

## 8. Referências

- `docs/prds/008-frete-uber-direct-fallback.md` — integração Uber Direct já implementada, que este PRD estende
- `src/lib/uber-direct.ts` — cliente Uber Direct (auth, cotação, criação de entrega)
- `src/app/api/asaas/webhook/route.ts` — `despacharUberDirectSeElegivel`, ponto de extensão para US03
- `supabase/migrations/0074_consolidacao_carga_rota.sql` — `checkout_criar_pedido`, ponto de extensão para US02
- `supabase/migrations/0003_seed_taxonomia.sql` — taxonomia real de categorias, base da Decisão 1
- `.claude/skills/afiliado-logistica/SKILL.md` — regra de exclusividade do afiliado que este PRD deliberadamente contorna quando Uber é escolhido

## 9. Registro de Decisões

- **2026-08-20:** Elegibilidade por categoria curada por admin, não por peso
  do produto. Motivo: `produtos.peso` só confiável em 89/358 produtos hoje;
  categoria é o único sinal confiável disponível sem trabalho de cadastro
  adicional.
- **2026-08-20:** Preço da opção Uber no checkout é o fee real da cotação,
  sem markup de plataforma. Motivo: decisão explícita do dono do produto —
  aceita zero margem neste fluxo em troca de oferecer a opção.
- **2026-08-20:** Opção Uber só aparece para pagamento via PIX. Motivo:
  cotação Uber expira em minutos; boleto/cartão têm confirmação não
  imediata, o que quebraria a garantia de "preço mostrado = preço cobrado"
  sem re-cotação (fora de escopo). Decisão tomada nesta sessão para manter
  o PRD implementável sem abrir esse escopo maior.
