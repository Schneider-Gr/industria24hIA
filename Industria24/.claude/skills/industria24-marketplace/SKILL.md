---
name: industria24-marketplace
description: Skill mestre do marketplace industria24.com.br — visão geral, todas as regras e o mapa completo de funcionalidades, com roteamento para as skills e docs específicos. Use como ponto de entrada em qualquer tarefa do projeto Industria24h quando não souber qual skill específica se aplica.
---

# Industria24h — Marketplace (skill mestre)

Marketplace industrial multi-loja de Manaus. Rebuild do Bubble (industria24h.com.br, legado) para **Next.js + Supabase** em **industria24.com.br**. Repo GitHub: `Schneider-Gr/industria24hIA` (dir `web/`); docs de engenharia reversa no repo local `Industria24IA`. Produção Supabase: `tiwdqgyeyvceaiqqwitc`. Critério de pronto: paridade 100% com o Bubble.

## Atores

Comprador (B2C e B2B com CNPJ/IE) · Seller/lojista (`Loja_ecommerce`) · Afiliado de vendas (link `?ref=`) · Afiliado/parceiro logístico (corridas de entrega) · Admin (curadoria, CMS, moderação) · Plataforma (Ind24, retém 5%).

## Mapa de funcionalidades (estado real; detalhe em `docs/feature-map.md`)

| Área | O que existe | Estado |
|---|---|---|
| Auth | login, signup seller, confirmação e-mail | ✅ prod |
| Vitrine | home 5 blocos, loja, produto, categoria, galeria, busca/filtros, **portão+filtro por CEP** (Manaus tem estoque; POA 0 é correto), mercado futuro, desconto progressivo | ✅ prod |
| Carrinho/Checkout | multi-loja, pedido mínimo por loja, frete ad valorem, opt-in termos Mercado Futuro, rate limit | ✅ prod |
| Pagamento | PIX/boleto/cartão via Asaas + webhook (idempotência, lock de estoque, dedupe) | ✅ construído |
| Pedido/Repasse | RPC `checkout_criar_pedido`: 95% lojista / 5% Ind24 + `RepasseAfiliado` | ✅ prod |
| Repasse PIX automático | webhook `/transfers` (decisão: PIX, NÃO Split Asaas) | ⏸ PR #43 aberto |
| Venda Futura (Mercado Futuro) | pré-venda B2B, gate CNPJ/IE + aceite de termos por pedido | ✅ prod |
| Afiliados vendas | solicitar/moderar, painel, rastreio real do link | ✅ prod; QA `?ref=` pendente |
| Logística | parceiro logístico, corridas, despacho automático no pagamento, roteirização, termos c/ aceite | ✅ mínimo; plena = PRDs draft |
| Seller | 13 seções paridade Bubble: produtos, promoções, venda futura, pedidos (repasse+transferência), centros, afiliados, tour guiado | ✅ prod |
| Admin | usuários, lojas, curadoria de produto c/ parecer, categorias, promoções, pedidos, entregas, banners, páginas CMS (`paginas_cms`) | ✅ prod |
| Ads/patrocinados | produtos patrocinados + IA curadoria + frete grátis por produto | ✅ prod |
| MCP terceiros + docs | MCP HTTP (api_keys) + `/desenvolvedores` | ✅ código; falta 0059 em prod + domínio |
| Observabilidade | Sentry completo (PII off) | ✅; falta config UI |
| E-mail transacional | Resend | 🔴 domínio Failed (DNS pendente) |
| ERP Bling, Consignado, CT-e/NF-e | — | ⬜ não iniciados (Consignado = Fase 2 deliberada) |

## Herança do Bubble legado (fonte: "Engenharia Reversa Completa.pdf", 22/06)

- **Papéis vivem como flags no `User`:** `lojista`, `superadm`, `promotoradm`, `consorcio`, `afiliado` (+ `cod_afiliado`). Um mesmo usuário acumula papéis — modelar autorização por flag, não por "tipo de conta".
- **Loja** carrega config comercial própria: `ChavePix`/`TipoChavePix`, `ValorPedidoMinimo`, `RetiradaNaLoja`, `Slug`, whatsapp — o pedido mínimo e a retirada são POR LOJA, não globais.
- **Promoção** = desconto progressivo por quantidade: `ApartirDe`, `PrecoFinal`, `DescontoUnitario`.
- **Tema visual é dado, não código:** tipo `Marketplace` guarda `CorBotao`, `CorCards`, `CorFundo`, `CorHeader`, `CorTextoBotao` — admin edita em "Editar marketplace"; no rebuild isso convive com a identidade fixa "Aço & Sinal".
- **Integrações do legado** (checar antes de propor "nova"): Asaas E PagBank/PagSeguro (rebuild ficou só Asaas), Elasticsearch (busca; rebuild usa Postgres — Meilisearch é opção futura), Bling (ERP, ⬜ não migrado), Melhor Envio, BubbleWhats (WhatsApp), ViaCEP, Mapbox/Google Maps, GPT Assistant.
- **Cobertura da engenharia reversa** (por que os docs têm graus de confiança): banco 90%, regras 95%, admin 95%, seller 80%, APIs 85%, workflows 60%, **backend workflows 10%, privacy rules 0%** — comportamento server-side do Bubble é o mais escuro; em dúvida, testar no app legado ao vivo, não confiar no doc.
- ⚠ O PDF usa os nomes ESPECULATIVOS antigos (`Empresa`, `LinhaDoItem`); os reais confirmados são `Loja_ecommerce`, `LinhaItem`, `Produto_ecommerce` (`docs/database.md` manda).

## Regras de negócio essenciais (íntegra na skill `regras-de-negocio`)

1. Dinheiro: 5% Ind24 / 95% lojista; comissão afiliado por `PercentualAfiliado`; repasse via PIX.
2. Produto só na vitrine com `StatusProduto = Aprovado` (curadoria admin).
3. Venda futura restrita a B2B com aceite de termos por pedido.
4. Frete por CEP+peso+categoria (`FaixaCEP`); vitrine filtra cobertura por CEP.
5. Pendências sem regra definida (perguntar, não assumir): cancelamento/estorno, disputa, ConsorcioPromotor, RetiradaNaLoja, PAGO parcial.

## Regras de engenharia (não negociáveis)

- Nunca mockar dado; schema só de `docs/database.md` confirmado; nomes reais: `LinhaItem`, `Loja_ecommerce`, `Produto_ecommerce`.
- RLS negar-por-padrão em toda tabela nova; segredos só em `.env`.
- Migrations: dupla checagem de colisão + prova por `to_regclass` (skill `migrations-industria24`).
- Branch+PR sempre; uma sessão por worktree (skill `git-colaboracao`).
- "No ar" só com `vercel inspect`; soft-404 devolve 200 (skill `deploy-industria24` / `qa-prod-industria24`).
- Feature mergeada → atualizar `docs/feature-map.md` e a fila (skill `fila-retomada`) na mesma sessão.
- Antes de feature "nova": checar Bubble (skill `paridade-bubble`).

## Roteamento por tarefa

dinheiro/pagamento → `regras-de-negocio` + `asaas-pagamentos` · banco → `migrations-industria24` + `dados-bubble-migrados` · deploy/QA → `deploy-industria24` + `qa-prod-industria24` · segurança → `rls-seguranca`; prod quebrada → `incidentes-runbook` · seller → `onboarding-seller` · SEO → `seo-industria24` · API externa → `integracao-terceiros-mcp` · agentes IA → `crews-ia` · backlog → `jira-backlog`/`jira-operacao` · retomada → `fila-retomada` · git → `git-colaboracao` · docs de tela → `tour-e-tutoriais` · skills → `gerenciar-skills`.
