# PRD - Fluxo completo de frete (checkout → despacho → corridas → lotes)

> Criado em 23/07/2026 a partir da auditoria E2E validada em produção (PR #86, migration 0074). Cobre corridas individuais, leilão, afiliado/parceiro logístico e consolidação de carga (MPDD-21, MPDD-22, MPDD-43, MPDD-46). Atualizado em 27/08/2026 com o motor de tabela de frete por transportadora (PR #441 + follow-up #457) — ver etapa 1b.

### Product overview

| Target date | Em produção (núcleo) |
|---|---|
| Document status | VALIDADO EM PROD 23/07/2026 |
| Team members | Andreia Schneider |

O fluxo de frete do Industria24h leva um pedido pago até a entrega usando uma rede própria de transportadores (afiliados logísticos por loja + parceiros de plataforma), com preço de frete cobrado do comprador no checkout e repassado 100% ao transportador (sem margem na v1).

### Objective

Entregar pedidos com frete competitivo em Manaus usando rede própria (não Correios/transportadora contratada), criando ativo defensável: malha de corredores, SLA por transportador e densidade por bairro industrial.

### O fluxo, etapa a etapa (estado validado)

**1. Cálculo do frete (checkout)** — RPC `checkout_criar_pedido` (núcleo 3-args, 0054):
- Percentual por faixa de CEP (`faixas_cep`: cep_inicial/final, percentual, por loja com fallback global — 0044).
- Produto com `frete_gratis` (0054): linha sai com frete 0; frete cobrado só sobre a parte não-gratuita.
- Retirada na loja: sem frete (loja precisa permitir).
- Frete consolidado (0074): comprador opta, 30% de desconto no frete, pedido aguarda lote.
- Wrappers: 4-args aplica `?ref=` do afiliado (0065); 5-args aplica consolidado (0074). **Sem defaults nos args** — default causa ambiguidade 42725 e derruba o checkout (bug que esteve ativo em prod 21–23/07, corrigido pela 0074).

**1b. Tabela de frete por transportadora (`tabela_importada`, 0145-0148, PR #441 26/08 + follow-up #457 27/08)** — motor alternativo ao percentual, convivendo sem substituir:
- `transportadora_faixas_frete`: faixa de CEP destino × faixa de peso → valor fixo. `loja_id` nulo = faixa global (admin); preenchido = override da própria loja, com **prioridade sobre a faixa global equivalente** no cálculo (RPC `cotar_frete_tabela`, `IS NOT DISTINCT FROM` — a primeira versão tinha um bug de `NULL` em `ORDER BY DESC` fazendo a global vencer o override, corrigido na 0148 e re-verificado).
- `POST /api/checkout/cotar-frete` tenta `cotar_frete_tabela` primeiro; sem faixa aplicável (override ou global), cai pro `%` de `faixas_cep` — a opção nunca some do checkout.
- Peso real do carrinho (`produtos.peso × quantidade`, somado por loja) chega na cotação desde o follow-up #457 — antes disso a rota sempre recebia peso 0/ausente, então só a faixa que cobria peso 0 era alcançável. O placeholder "peso 1kg/89 de 358 produtos confiáveis" (linha "Out of scope" abaixo) segue valendo pro motor consolidado; para `tabela_importada` o peso agora é o real cadastrado (ou 0 quando ausente, sem inventar valor).
- **Upload em dois passos** (admin `/admin/transportadoras` e seller `/seller/transportadoras`): "Cadastrar Transportadoras" (lista em massa, CSV/XLSX) e "Subir Transportadoras" (tabela de frete de uma transportadora, com preview de faixas antes de confirmar gravação). Parser aceita CSV e XLSX nativo (sem dependência de terceiros — a lib `xlsx` do npm está travada com 2 CVEs altos sem fix publicado).
- Gestão de faixas por transportadora em `/admin/transportadoras/[id]` (listar/desativar faixa individual).
- **Pendente**: verificação end-to-end via navegador real ficou bloqueada por um bug de infra fora deste módulo (CSP sem `unsafe-eval` quebra `npm run dev` inteiro — issue #458); a lógica foi verificada via 121 testes unitários + queries SQL diretas em produção (`begin;...rollback;`), não via clique na UI.

**2. Pagamento (webhook Asaas)** — pedido pago dispara `despachar_corrida_automatica`:
- Retirada na loja → sem corrida.
- Consolidado → sem corrida individual; espera lote do admin.
- Entrega normal → corrida `primeiro_aceita` com preço = **SUM(valor_frete)** das linhas (corrigido 23/07; antes pagava o frete de uma linha só), janela de 4h para coleta.
- Afiliado logístico Aprovado da loja tem **5 min de exclusividade** para aceitar (notificado por WhatsApp); depois abre ao pool de parceiros (RLS controla a visibilidade, sem job).

**3. Corridas avulsas** — qualquer usuário logado publica (`publicar_corrida`), em dois modos:
- `primeiro_aceita`: preço sugerido por `calcular_frete` (frete_tabela origem×destino, R$/kg, multiplicador urgente).
- `leilao`: parceiros dão lances (`dar_lance_corrida`), solicitante escolhe (`escolher_lance_corrida`).

**4. Execução** — `atualizar_status_corrida` (0045): transições válidas Aceita→Coletada→EmTransito→Entregue; entrega exige **foto de confirmação**; aceita tanto parceiro aprovado quanto afiliado logístico puro. Tudo auditado em `auditoria_eventos`.

**5. Consolidação de carga (0074, MPDD-46)** — v1 manual-assistida:
- Admin vê em `/admin/lotes` os pedidos pagos consolidados agrupados por **loja + corredor** (prefixo 3 dígitos do CEP destino).
- `criar_lote_consolidacao(uuid[])` valida (≥2 pedidos, pagos, mesma loja, mesmo corredor, sem lote/corrida) e publica **UMA corrida-manifesto**: preço = soma dos fretes consolidados, destinos concatenados, exclusividade do afiliado preservada.
- `cancelar_lote_consolidacao`: cancela a corrida (se não coletada), libera os pedidos para novo lote.

**6. Guard financeiro** — `guard_campos_restritos` (0038 + 0074): campos financeiros só mudam por admin/service_role, ou dentro de transação de checkout sinalizada por `app.checkout_rpc` (flag transaction-local setada só por RPC security definer).

### Success metrics

| Goal | Metric |
|---|---|
| Entrega funciona | % de corridas aceitas dentro da janela de 4h |
| Rede engajada | Tempo médio até o aceite; % aceitas pelo afiliado exclusivo |
| Consolidação | Redução média do frete consolidado vs individual (meta ≥ 30%) |
| Integridade | Preço da corrida = frete cobrado do comprador (auditoria); zero divergência |

### Verificação (como re-testar)

`supabase/tests/e2e_frete_consolidacao.sql` — auto-contido em `begin…rollback`, 11 asserts: checkout individual (valor = itens+frete), despacho (preço=soma, janela 4h), consolidado (desconto 30% centavo a centavo, guard), lote (manifesto=soma), cancelamento e re-lote. Rodar com `supabase db query --linked --file ...` — passou 11/11 em produção em 23/07/2026.

### Out of scope (v2)

- Multi-loja no lote (várias coletas por manifesto).
- Rastreio por parada (corrida do lote Entregue não atualiza status dos pedidos individualmente — paridade com corridas individuais).
- Peso/volume real no motor consolidado/corridas (placeholder 1 kg/pedido; só 89/358 produtos têm peso confiável) — **peso real já chega no motor de tabela por transportadora desde 27/08 (follow-up #457)**, mas o consolidado/corridas continua com o placeholder.
- Margem da plataforma sobre o frete do lote.
- Roteirização otimizada multi-parada (MPDD-22) e mobilidade on-demand (MPDD-43) — PRDs próprios.

### Riscos e decisões registradas

- Repasse ao transportador depende do trilho de repasse PIX (PR #43, ainda não em prod) — até lá, pagamento manual.
- Corrida com frete R$ 0 é possível se todas as linhas forem frete-grátis: decisão pendente do dono (quem paga o transportador nesse caso — loja subsidia?).
- Decisões 23/07: desconto fixo 30%; sem margem v1; lote mesma loja.
