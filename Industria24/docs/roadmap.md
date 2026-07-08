# Roadmap — Industria24h (Bubble → Next/Supabase)

> Atualizado 2026-07-07. Fonte de verdade técnica: `database.md`, `business-rules.md`,
> `data-api-reconciliation.md`, `migration.md`. Backlog detalhado por história em
> `backlog.md`. Este documento é o **mapa de marcos**; o backlog é a lista de trabalho.

## Norte

**Objetivo único: desligar o Bubble (~$134/mês) fazendo o caminho do dinheiro rodar
inteiro no Next/Supabase, sem regressão para o piloto vivo** (158 users, 16 lojas,
251 pedidos históricos migrados, R$147.518,60 ao centavo).

Duas decisões do dono (2026-07-07) que fixam o escopo:

1. **Cutover exige checkout online completo.** A plataforma nova precisa transacionar
   ponta a ponta (carrinho → frete → pagamento → pedido → repasse 5%). WhatsApp não
   substitui o desligamento do Bubble — o Bubble transaciona hoje, a plataforma nova
   tem de transacionar antes de virar a chave.
2. **Consignado + Crédito ficam fora do cutover.** Não transacionam no piloto; migram
   depois ou são descontinuados. Não bloqueiam a virada.

**Valor é degrau, não rampa:** migrar 90% dos fluxos economiza R$0 enquanto o Bubble
seguir ligado por causa dos 10% restantes. O roadmap inteiro é ordenado para chegar ao
**Gate de Cutover** o mais rápido possível, cortando escopo agressivamente.

## Estado atual (o que já está de pé)

A fundação e a leitura do marketplace estão prontas e em produção
(`industria24h-revs-projects-d261c528.vercel.app`, pública):

| Bloco | Estado | Evidência |
|---|---|---|
| Schema + RLS deny-by-default | ✅ | migrations `0001`–`0011`, `is_admin()` cross-seller |
| ETL Bubble → Supabase (idempotente) | ✅ | `web/scripts/import-bubble.mjs`, upsert por `bubble_id` |
| Dados migrados | ✅ | 158 users, 16 lojas, 184 produtos, 251 pedidos, 233 itens, 51 afiliações |
| Auth + papéis | ✅ | `/login`, `/definir-senha`, `/auth/confirm`; gates admin/seller/afiliado |
| Vitrine (leitura) | ✅ | `/`, `/loja/[id]`, `/produto/[id]`, `/categoria/[id]` |
| Painel Seller (9 telas, com actions) | ✅ | produtos, promoções, venda-futura, pedidos, centros, afiliados, minha-loja |
| Painel Admin (12 telas) | ✅ | usuários, lojas, produtos, categorias, promoções, pedidos, entregas |
| Design system aplicado | ✅ | `web/DESIGN.md`, 36 telas via loop LangGraph |

**Tradução:** os épicos **E0 (schema+ETL)**, **E1 (auth)** e **E2 (catálogo/leitura)**
do backlog original estão essencialmente entregues. O que falta para o cutover é o
**caminho do dinheiro escrevendo** (hoje a vitrine só lê e joga o usuário no WhatsApp)
e o **hardening de segurança/deploy**.

## Marcos

```
        ✅ FEITO                          ◀── você está aqui
  ┌───────────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐
  │  M0 Fundação  │──▶│ M1 Hard. │──▶│ M2 Carr. │──▶│ M3 Pgto  │──▶│ M4 CUTOVER│──▶ M5 Pós
  │ schema/auth/  │   │ segurança│   │ +checkout│   │ +pedido  │   │  desliga  │   │afiliado/
  │  vitrine      │   │ +deploy  │   │ +frete   │   │ +repasse │   │  o Bubble │   │ notif./
  └───────────────┘   └──────────┘   └──────────┘   └──────────┘   └──────────┘   │consignado│
                                                                                    └──────────┘
```

### M0 — Fundação ✅ (concluído)
Schema real, ETL, auth, vitrine de leitura, painéis seller/admin. Base para tudo.

### M1 — Hardening (destrava o cutover com segurança) — **P0, próximo**
Não é feature nova; é fechar o que impede subir dinheiro real com segurança.
- Rotacionar o **Admin API Token do Bubble** (hoje em texto puro nos docs — 🔴).
- **Site URL do Supabase** em prod (links de e-mail de definir-senha/confirmar quebram sem isto).
- Limpar **TODOs "requer policy is_admin"** desatualizados (policy existe desde `0004`).
- Remover **contas de teste** remanescentes; confirmar 6 admins reais.
- **Filtro `valor > 0`** na vitrine (hoje mostra rascunhos R$0,00).
- Decidir destino dos **172 produtos do catálogo Meta** sem loja.
- **Gate:** produção sem segredo exposto, e-mails de auth funcionando, vitrine sem lixo.

### M2 — Carrinho + Checkout + Frete (começa a escrever no caminho do dinheiro) — **P1**
Primeiro pedaço do fluxo transacional. Sem isto o comprador não fecha nada online.
- Carrinho (`Carrinho 0.1` / `item_para_compra`), múltiplos itens, múltiplas lojas.
- Frete por **FaixaDeCEP** (CEP/peso/categoria, ICMS/AdValorem) + ViaCEP + retirada na loja.
- Validação de **pedido mínimo por loja** (`ValorPedidoMinimo`).
- **Gate:** comprador logado monta carrinho e chega à revisão de pedido com frete calculado.

### M3 — Pagamento + Pedido + Repasse (fecha o ciclo) — **P1, maior risco**
O dinheiro entra e o seller recebe. Cada integração começa por **capturar a config real**, não codar às cegas.
- **Pagamento** via gateway (PagBank confirmado; Asaas para PIX/repasse a capturar).
  **Nunca armazenar cartão** — tokenização no gateway (risco PCI, ver `privacy-rules.md`).
- Criação de **PedidosVendedor** + `item_para_compra` com status, `PAGO` parcial/total.
- **Repasse**: 95% seller / 5% Ind24 (`repasse_ind`), mais `repasse_afiliado` quando houver link.
- Lançamento no **Bling (ERP)** — capturar config antes.
- **Gate:** um pedido de teste é pago, gera repasse correto e aparece nos painéis seller/admin.

### M4 — CUTOVER (desliga o Bubble) — **P1**
- **Logística mínima** (E6): status de entrega operável, mesmo semimanual no piloto.
- **Re-run do ETL** para sincronizar o delta desde a última importação (cutover duro, baixo volume).
- Virada dos usuários do piloto (todos definem senha via esqueci-senha) + DNS/domínio.
- **Desligar o Bubble.** Fim do custo duplo. **Este é o objetivo do projeto.**

### M5 — Pós-cutover (sem parar receita) — **P2/P3**
- **E7 Afiliados** completo (já parcial: solicitar/moderar existem).
- **E8 Comunicação** (notificações, WhatsApp/BubbleWhats, mensagens).
- **E9 Consignado + Crédito** — só se e quando o piloto decidir transacionar.
- Logística plena (transportadoras, rotas, CSV, painel entregador).

## Riscos que reordenam o roadmap

1. **Descoberta de integração (M3).** Só PagBank está confirmado no API Connector.
   Asaas (PIX/repasse) e Bling aparecem em labels mas a config não foi capturada. A
   primeira tarefa de M3 é capturar config real; se travar, o cutover atrasa aqui.
2. **PCI em `Cards`/`CardTime` (M3).** Se guardam PAN/CVV, não se migra como está —
   obriga tokenização. Confirmar a natureza desses tipos antes de tocar em pagamento.
3. **Privacy Rules não capturadas (transversal).** Cada tabela nova precisa da regra de
   acesso real; sem ela nasce deny-by-default e trava query legítima.
4. **Regressão no sistema vivo.** Piloto transaciona hoje. Todo cutover é duro e
   idempotente; nada de dual-run complexo, mas o re-run do ETL antes da virada é obrigatório.
5. **Frete (M2).** `FaixaDeCEP` com ICMS/AdValorem é regra fiscal — validar contra o
   comportamento real do Bubble, não reimplementar de cabeça.

## Definição de "pronto para cutover"

M1 + M2 + M3 + M4-mínimo entregues, delta de dados sincronizado, e **um pedido real
pago com repasse correto rodando 100% no Next/Supabase**. Antes disso, o Bubble não desliga.
