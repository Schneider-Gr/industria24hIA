# Backlog priorizado — Industria24h

> Atualizado 2026-07-07 (reescrito após migração de dados + vitrine + auth em produção).
> Marcos e narrativa em `roadmap.md`. Fonte de verdade: `database.md`,
> `business-rules.md`, `data-api-reconciliation.md`.
> Confiança: (a) fato dos docs · (b) prática consolidada · (c) inferência · (d) decisão sua pendente.
> Esforço relativo: **P** (≤ meio dia) · **M** (1–2 dias) · **G** (3–5 dias) · **GG** (semana+).
> Decisões travadas 2026-07-07: cutover **exige checkout online**; Consignado **fora do cutover**.

---

## Legenda de status dos épicos

| Épico | Descrição | Status |
|---|---|---|
| E0 | Schema real + ETL | ✅ **Feito** (migrations 0001–0011, `import-bubble.mjs`) |
| E1 | Autenticação + papéis | ✅ **Feito** (`/login`, `/definir-senha`, gates) |
| E2 | Catálogo + aprovação (leitura) | ✅ **Feito** (vitrine + painel produtos + aprovação admin) |
| **M1** | Hardening segurança/deploy | 🔴 **P0 — próximo** |
| E3 | Carrinho + Checkout + Frete | ⬜ **P1** — não iniciado |
| E4 | Pagamento | ⬜ **P1** — não iniciado (maior risco) |
| E5 | Pedido + Repasse (escrita) | 🟡 **P1** — leitura pronta, escrita não |
| E6 | Logística / entrega | 🟡 **P2** — parcial (centros, entregas migradas) |
| E7 | Afiliados | 🟡 **P2** — parcial (solicitar/moderar prontos) |
| E8 | Comunicação | ⬜ **P3** — pós-cutover |
| E9 | Consignado + Crédito | ⬜ **Fora do cutover** (decisão do dono) |

---

## M1 — Hardening (P0, bloqueia subir dinheiro real)

Fechar o que impede operar transação real com segurança. Barato, mas obrigatório antes de M2.

> **Atualização 07/07 (noite):** bug hunt de outra sessão (14 bugs confirmados —
> ver memória `industria24h-bughunt-2026-07-07`) foi ABSORVIDO no M1. Estado no
> PR [#2](https://github.com/Schneider-Gr/industria24hIA/pull/2), branch
> `chore/m1-hardening`: migration **0012** (trigger anti auto-aprovação/campos
> financeiros; view `lojas_vitrine` sem PIX/CNPJ/e-mail; CHECK porcentagem) +
> gates `isAdmin()` nas actions, toggle afiliação corrigido, open redirect
> fechado. H3 ✅ e H5 ✅ no mesmo PR. **Ordem de deploy: aplicar 0012 ANTES do
> merge** (o código lê `lojas_vitrine`). Pendentes de ação humana: aplicar a
> 0012 (`db push` bloqueado em auto mode), remover admin de teste
> `qa-temp2@example.com` (delete em auth.users bloqueado), H1 rotação do token
> no Bubble, H2 Site URL, H6 decisão produtos Meta. Bug 8 (import atribui
> pedidos órfãos à loja errada) fica para a sessão do ETL.

- **H1 — Rotacionar Admin API Token do Bubble.** 🔴 (a) Está em texto puro em
  `Documentação Completa do App Bubble.md`. **Aceite:** token antigo revogado no Bubble,
  novo só em `web/.env.local` (fora do git), grep de segredos em tracked = 0. **P**
- **H2 — Site URL do Supabase em prod.** (a) Links de e-mail (definir-senha, confirmar)
  quebram sem isto. **Aceite:** fluxo de esqueci-senha ponta a ponta funciona em produção
  com link válido. **P**
- **H3 — Limpar TODOs "requer policy is_admin".** (c) A policy existe desde `0004`; os
  TODOs e mensagens de "vazio" das telas admin estão desatualizados. **Aceite:** nenhum
  TODO falso no código; telas admin exibem dados cross-seller reais. **P**
- **H4 — Remover contas de teste.** (a) `admin-teste@example.com` já removido; confirmar
  que só os 6 SuperADM reais têm papel admin. **Aceite:** query em `admins` retorna 6
  contas legítimas, zero de teste. **P**
- **H5 — Filtro `valor > 0` na vitrine.** (a) Hoje mostra rascunhos R$0,00 (Aprovado sem
  preço; 175/358 produtos sem preço). **Aceite:** vitrine e páginas de loja/produto não
  exibem item sem preço; contagem de produtos visíveis bate com produtos precificados. **P**
- **H6 — Destino dos 172 produtos do catálogo Meta.** (d) Sem loja
  (`admin_user_meta_live`). **Decisão sua:** criar loja "Catálogo Meta", vincular por
  regra, ou descartar. **Aceite:** decisão registrada em `data-api-reconciliation.md` e
  re-run do ETL aplica. **P** (código) / decisão **(d)**

**Gate M1:** produção sem segredo exposto, e-mails de auth funcionando, vitrine limpa.

---

## E3 — Carrinho + Checkout + Frete (P1)

Primeira escrita no caminho do dinheiro. **Depende de:** M1. Data types reais:
`Carrinho 0.1`, `item_para_compra`, `FaixaDeCEP`, `endereco_user`, `ValorPedidoMinimo`.
**Spec detalhada: `e3-carrinho-checkout-frete.md`** (modelo de dados, fluxo,
decisões D-E3.1..4 e a história E3.0 de descoberta que bloqueia as demais).

- **E3.1 — Carrinho persistente.** Como comprador logado, adiciono produtos ao carrinho e
  ele sobrevive à navegação/refresh. **Aceite:** item adicionado aparece em `/carrinho`
  após reload; quantidade editável; remoção funciona; carrinho vazio tem empty state
  honesto. Persistência real (tabela `carrinho`), zero mock. **M**
- **E3.2 — Carrinho multi-loja.** (a) Zero pedidos multi-vendedor no histórico, mas o
  modelo permite itens de lojas diferentes. **Decisão (d):** um checkout por loja ou
  carrinho unificado que se divide em N pedidos? **Aceite:** comportamento definido e
  itens agrupados por loja na revisão. **M**
- **E3.3 — Endereço + ViaCEP.** Informo CEP e o endereço é preenchido; salvo endereços em
  `endereco_user`. **Aceite:** CEP válido preenche logradouro/cidade/UF; CEP inválido
  mostra erro real (não trava); endereço salvo reutilizável. **M**
- **E3.4 — Frete por FaixaDeCEP.** (a) Regra fiscal com ICMS/AdValorem por CEP/peso/
  categoria. **Aceite:** frete calculado bate com o comportamento do Bubble em 3 CEPs de
  teste (Manaus, capital fora, interior); opção "retirada na loja" zera frete. Validar
  contra o Bubble, **não** reimplementar de cabeça. **G — risco fiscal**
- **E3.5 — Pedido mínimo por loja.** (a) `ValorPedidoMinimo`. **Aceite:** checkout bloqueia
  com mensagem clara quando o subtotal da loja fica abaixo do mínimo. **P**
- **E3.6 — Tela de revisão do pedido.** Antes de pagar, vejo itens, frete, subtotal, total
  por loja. **Aceite:** valores conferem com a soma dos itens + frete; botão de pagar só
  habilita com endereço e mínimo OK. **M**

**Gate E3:** comprador logado monta carrinho e chega à revisão com frete calculado e
mínimo validado. Nada de pagamento ainda.

---

## E4 — Pagamento (P1, maior risco)

O dinheiro entra. **Depende de:** E3. **Primeira tarefa é descoberta, não código.**

- **E4.0 — Capturar config real das integrações.** (a) Só PagBank confirmado no API
  Connector; Asaas (PIX/repasse) e Bling aparecem em labels sem config capturada.
  **Aceite:** credenciais sandbox + endpoints + payloads reais documentados em
  `api-connector.md` marcados "confirmado". **M — bloqueia o resto de E4/E5**
- **E4.1 — Confirmar natureza de `Cards`/`CardTime` (PCI).** (a) Se guardam PAN/CVV, é
  exposição de compliance. **Aceite:** documentado se armazenam cartão; decisão de
  **tokenizar no gateway e nunca persistir cartão** registrada. **P — gate de compliance**
- **E4.2 — Pagamento cartão via gateway.** Tokenização no PagBank, sem cartão no nosso
  banco. **Aceite:** pagamento sandbox aprovado retorna token/status; nenhum dado de
  cartão toca o Supabase; falha de pagamento mostra erro real e não cria pedido pago. **G**
- **E4.3 — Pagamento PIX.** (via Asaas, conforme E4.0). **Aceite:** QR/copia-e-cola gerado;
  webhook de confirmação muda status para `PAGO`. **M**
- **E4.4 — Idempotência + webhook de status.** **Aceite:** webhook reprocessado não duplica
  pedido nem repasse; status `PAGO` parcial/total refletido em `item_para_compra`. **M**

**Gate E4:** pagamento sandbox aprovado gera confirmação idempotente, zero cartão persistido.

---

## E5 — Pedido + Repasse (P1)

Fecha o ciclo. Leitura já existe (painéis seller/admin/afiliado leem `repasse_ind`/
`repasse_afiliado`); falta a **escrita** no fluxo de compra. **Depende de:** E4.

- **E5.1 — Criar PedidosVendedor no checkout pago.** **Aceite:** pagamento aprovado cria
  pedido + itens com snapshot de preço/quantidade; pedido aparece no painel do seller e no
  admin; total bate com a revisão de E3.6. **G**
- **E5.2 — Cálculo de repasse 95/5.** (a) `repasse_ind` = 5% da plataforma. **Aceite:**
  repasse do seller = 95%, Ind24 = 5%, conferido ao centavo em 3 pedidos de teste;
  quando há afiliado, `repasse_afiliado` sai da parte do seller conforme
  `PercentualAfiliado` da loja. **M**
- **E5.3 — Estados do pedido.** Ciclo (criado → pago → em separação → enviado → entregue →
  cancelado). **Aceite:** transições válidas apenas; seller muda status pelo painel; comprador
  vê status em "meus pedidos". **M**
- **E5.4 — Repasse ao seller (Asaas PIX ou manual).** (d) Automático via Asaas ou registro
  manual no piloto? **Aceite:** repasse registrado com valor correto e rastreável; se manual,
  campo de baixa no admin. **M — depende de E4.0**
- **E5.5 — Lançar pedido no Bling (ERP).** (a) Após E4.0. **Aceite:** pedido pago cria o
  correspondente no Bling sandbox; falha não bloqueia o pedido (fila/retry ou flag). **M**

**Gate E5:** um pedido de teste é pago, gera repasse correto (95/5, + afiliado quando houver)
e aparece nos painéis. Este é o gate técnico do cutover.

---

## M4 — Cutover (P1)

**Depende de:** E5 (gate). Desliga o Bubble.

- **C1 — Logística mínima (E6).** **Aceite:** seller/admin operam status de entrega, mesmo
  semimanual; comprador vê rastreio básico. Transportadoras/rotas/CSV ficam para pós-cutover. **M**
- **C2 — Re-run do ETL (delta).** (b) Cutover duro, baixo volume. **Aceite:**
  `import-bubble.mjs` re-rodado sincroniza pedidos/produtos novos desde a última importação;
  contagens batem com o dump do Bubble ao centavo. **P**
- **C3 — Virada dos usuários + domínio.** **Aceite:** todos definem senha via esqueci-senha;
  DNS de `industria24h.com.br` aponta para a Vercel; smoke test de login/compra em produção. **M**
- **C4 — Desligar o Bubble.** **Aceite:** plano do Bubble cancelado; nenhum fluxo de receita
  depende mais dele; custo duplo encerrado. **P**

**Gate M4 = objetivo do projeto:** um pedido real pago com repasse correto rodando 100%
no Next/Supabase, Bubble desligado.

---

## Pós-cutover (P2/P3 — não param receita)

- **E7 Afiliados (P2).** 🟡 Parcial: solicitar/moderar prontos. Falta: dashboard de
  ganhos do afiliado, link rastreável na compra, conciliação de `repasse_afiliado`. **G**
- **E8 Comunicação (P3).** Notificações, WhatsApp (BubbleWhats), mensagens, `mensagens_gpt`.
  Pode seguir no Bubble temporariamente. **G**
- **E6 Logística plena (P2).** Transportadoras, rotas, CSV, painel entregador,
  centros de distribuição com `relacao_produto_CD`. **GG**
- **E9 Consignado + Crédito.** ⬜ Fora do cutover por decisão do dono. Só entra se o piloto
  passar a transacionar consignado; nesse caso vira épico próprio (20+ tipos, **GG**). **(d)**

---

## Sequência recomendada (ondas)

| Onda | Conteúdo | Saída |
|---|---|---|
| **Já** | M0 (E0+E1+E2) | ✅ fundação + vitrine em produção |
| **1** | **M1 hardening** | produção segura, e-mails ok, vitrine limpa |
| **2** | E3 (carrinho/checkout/frete) | comprador chega à revisão com frete |
| **3** | E4 (pagamento) → E5 (pedido/repasse) | pedido pago com repasse correto |
| **4** | M4 (logística mín. + delta ETL + virada) | **Bubble desligado** |
| **5** | E7, E8, E6 pleno; E9 se decidir | maturidade pós-cutover |

## Decisões abertas (d) que reordenam o backlog

1. **E3.2** — carrinho multi-loja: um checkout por loja ou unificado que divide em N pedidos?
2. **E5.4** — repasse ao seller no piloto: automático via Asaas ou baixa manual no admin?
3. **H6** — 172 produtos do catálogo Meta sem loja: criar "Catálogo Meta", vincular ou descartar?
