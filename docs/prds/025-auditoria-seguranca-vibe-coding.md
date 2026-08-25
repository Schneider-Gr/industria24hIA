---
prd_number: "025"
status: rascunho
priority: alta
created: 2026-08-24
issue: ""
depends_on: []
references: ["docs/prds/018-protecao-producao-asaas.md"]
---

# PRD 025: Auditoria de segurança para código gerado via vibe coding

## 1. Contexto

- **Produto/área**: segurança transversal ao código gerado por IA (Claude Code e afins) neste repositório — autenticação/autorização, Supabase/RLS, rotas de API, integrações externas (Asaas, Uber Direct, WhatsApp/Meta), agentes de IA (`src/lib/agentes/`, `src/lib/ai/`).
- **Origem**: levantamento feito a partir de dois vídeos assistidos e arquivados no Obsidian (`video-vibe-coding-riscos-seguranca.md`, canal mano deyvin) sobre falhas de segurança recorrentes em SaaS majoritariamente gerado por IA, complementado com falhas adicionais conhecidas (OWASP, incidentes específicos de stacks Next.js+Supabase+gateway de pagamento) que os vídeos não cobriram.
- **Problema**: o projeto já registra pelo menos três incidentes reais compatíveis com este padrão de risco — `industria24h-rls-audit-2026-07-09` (auditoria RLS pendente), `industria24h-comissao-afiliado-sem-indicacao-2026-08-13` (comissão creditada sem indicação válida) e `industria24h-incidente-transportadora-fake-prod-2026-08-12` (26 faixas de frete fake em produção). Isso indica que o padrão de risco descrito nos vídeos não é hipotético aqui — já se manifestou.
- **Este PRD é um levantamento de escopo**, não uma spec de implementação. O objetivo é catalogar as classes de falha relevantes para este projeto antes de decidir o que vira spec/tarefa concreta.

## 2. Falhas cobertas pelo vídeo-fonte (não repetir aqui em detalhe)

Já documentadas em `video-vibe-coding-riscos-seguranca.md` no vault: dado sensível em texto puro, checagem de autorização decidida no frontend, RLS desligado por padrão em Supabase, IDOR (rota com ID sequencial sem checagem de dono), segredo hardcoded no bundle do frontend, XSS por input não validado. Ver seção 4 para como cada uma mapeia neste repositório.

## 3. Falhas adicionais não cobertas pelos vídeos

Levantamento próprio, com foco no que é plausível em código gerado por agente de IA nesta stack (Next.js + Supabase + Asaas + agentes LLM com tool-calling):

### 3.1 Autenticação e sessão
- **Rate limiting ausente ou incompleto em endpoints de autenticação** — `src/lib/rate-limit.ts` existe no projeto, mas um agente de IA gerando uma rota nova (ex.: reset de senha, login, verificação de código) pode esquecer de aplicá-lo, permitindo força bruta.
- **Enumeração de usuário** — mensagens de erro diferentes para "e-mail não existe" vs "senha errada" em login/recuperação de senha, permitindo mapear quais e-mails/CPFs estão cadastrados.
- **Sessão sem expiração ou sem invalidação no logout** — comum quando o agente implementa auth "que funciona" sem tratar o ciclo de vida completo do token/cookie.

### 3.2 Lógica de negócio e integridade financeira
- **Preço/valor confiado do cliente em vez de recalculado no servidor** — checkout, carrinho ou split de pagamento que aceita o valor total vindo do frontend em vez de recalcular a partir do banco no momento da cobrança. Clássico em e-commerce vibe-coded; risco direto para `src/lib/asaas.ts` e o fluxo de checkout/coletiva.
- **Condição de corrida em crédito de comissão/repasse** — duas chamadas concorrentes creditando a mesma comissão ou repasse duas vezes por falta de transação/lock atômico no banco. Relevante dado o incidente já registrado de comissão de afiliado sem indicação.
- **Validação de cupom/faixa de desconto só no frontend** — permite aplicar desconto inválido enviando a requisição direto pra API, ignorando a UI. Relevante dado o incidente já registrado de faixas de desconto com faixa mais cara aplicada.
- **Mass assignment em rotas de update** — endpoint que faz `UPDATE` espalhando o body da requisição inteiro no banco (`{...req.body}`) sem allowlist de campos, permitindo que um usuário comum tente setar campos como `is_admin`, `saldo`, `comissao_pct` diretamente.

### 3.3 Integrações externas / webhooks
- **Webhook sem verificação de assinatura** — rota de webhook (Asaas, Uber Direct, Meta/WhatsApp) que processa o payload sem validar a assinatura/segredo do provedor, permitindo que qualquer requisição externa simule um evento real (ex.: "pagamento confirmado" falso).
- **SSRF via campo que aceita URL** — se algum fluxo (ex.: upload de imagem por URL, integração de terceiro) permite que o usuário forneça uma URL que o servidor busca, sem allowlist de destino, um agente de IA tende a implementar isso sem pensar em SSRF.
- **CORS permissivo demais** — `Access-Control-Allow-Origin: *` adicionado por conveniência num route handler para "resolver" um erro de CORS durante desenvolvimento, e nunca revertido.

### 3.4 Agentes de IA (`src/lib/agentes/`, `src/lib/ai/`)
- **Prompt injection via conteúdo de terceiros** — se algum agente (bot de atendimento, curadoria de produto) processa texto vindo de usuário final ou de fonte externa e esse texto pode influenciar as tools que o agente chama, há risco de prompt injection levando a ações não autorizadas (ex.: um cliente convencendo o bot de atendimento a aplicar um reembolso ou alterar um pedido).
- **Tool-calling sem checagem de permissão equivalente à do usuário humano** — uma tool exposta ao agente que executa uma ação (ex.: alterar status de pedido, disparar repasse) precisa das mesmas checagens de autorização que a rota HTTP equivalente teria; um agente de IA implementando a tool pode pular essa checagem achando que "é interno".

### 3.5 Operacional / observabilidade
- **PII ou segredo em log/Sentry** — o projeto já usa Sentry (`sentry.server.config.ts`); um agente de IA tende a logar o payload inteiro de uma requisição "para debug" durante implementação, incluindo CPF, token ou dado de cartão, e isso pode não ser removido antes do merge.
- **Stack trace ou erro verboso exposto ao cliente em produção** — resposta de erro genérica do Next.js/API route que vaza detalhe interno (caminho de arquivo, query SQL, versão de dependência) em vez de mensagem genérica.
- **Dependência nova instalada sem checagem** — agente de IA sugerindo/instalando um pacote npm para resolver um problema pontual, sem checar populariedade/manutenção — risco de typosquatting ou pacote comprometido, mitigado parcialmente pelo `secret-scan` do CI mas não pela ausência de SCA (software composition analysis).

## 4. Mapeamento inicial para este repositório

Este PRD não implementa nada — apenas indica onde cada classe de risco tem mais probabilidade de já existir, para orientar a spec futura:

| Classe de risco | Onde procurar primeiro |
|---|---|
| RLS desligado / policy incompleta | `supabase/migrations/`, skill `rls-seguranca` — já há pendência aberta (`industria24h-rls-audit-2026-07-09`) |
| Preço/valor confiado do cliente | `checkout/`, `carrinho/`, `coletiva/`, `src/lib/preco-faixa.ts` |
| Condição de corrida em comissão/repasse | `src/lib/agentes/` financeiro, `repasses.ts`, módulo `pagamentos-financeiro` |
| Webhook sem verificação de assinatura | `src/app/api/webhooks/` (Asaas, Uber Direct, WhatsApp) |
| Mass assignment | rotas `PATCH`/`PUT` em `src/app/api/**/route.ts` que tocam tabelas de usuário, saldo ou permissão |
| Prompt injection / tool-calling sem checagem | `src/lib/agentes/`, `src/lib/ai/` — bot de atendimento e curadoria de produto via IA |
| PII em log/Sentry | qualquer `console.log`/captura de exceção que inclua `req.body` ou dado de pagamento |

## 5. Fora do escopo (por enquanto)

- Qualquer alteração de código — este PRD é só levantamento.
- Rodar ferramentas automatizadas (OWASP ZAP, Gitleaks, Bandit, Opengrep) — decisão de tooling fica para a spec.
- Repriorizar os incidentes já abertos (RLS, comissão, transportadora fake) — eles continuam nas próprias notas/issues existentes; este PRD só aponta a relação com o padrão mais amplo.

## 6. Próximos passos (para quando este PRD virar spec)

1. Escolher 2-3 classes de risco da seção 3 com maior probabilidade de impacto real neste projeto (sugestão inicial: preço confiado do cliente, webhook sem assinatura, mass assignment — pela superfície de dano financeiro direto).
2. Para cada uma, rodar uma auditoria dirigida (grep + leitura manual, não ferramenta automatizada) nos diretórios indicados na seção 4.
3. Abrir uma Issue por achado confirmado, seguindo o fluxo padrão do repositório (`Industria24/CLAUDE.md` §"Fluxo de Issues e PRs").
4. Só então desenhar a spec de correção — este PRD não prescreve solução técnica, porque isso depende do que a auditoria dirigida encontrar.

## 7. Riscos de qualidade de código (fora do escopo de segurança deste PRD)

Pesquisa complementar (2026-08-24) trouxe quatro riscos de qualidade — não vulnerabilidade explorável, mas erosão silenciosa de correção/coerência causada pelo processo de vibe coding em si: incoerência arquitetural entre sessões (regra de negócio duplicada em módulos diferentes), duplicação de trabalho entre sessões concorrentes no mesmo checkout, testes com over-mocking mascarando bug real, e drift entre schema real do banco e schema assumido pelo agente. Esses quatro já viraram change formal: `openspec/changes/qualidade-codigo-vibe-coding/` (capability `governanca-qualidade-vibe-coding`) — não ficam soltos aqui.

## 8. Auditoria dirigida (2026-08-24) — resultado

Executados os passos 1-3 da seção 6, escolhendo mass assignment, webhook sem assinatura e tool-calling sobre-permissionado (maior superfície de dano financeiro/reputacional). Auditoria manual (grep + leitura), sem ferramenta automatizada, conforme §5.

| Classe de risco | Resultado | Evidência |
|---|---|---|
| Mass assignment em rota de update | **Sem achado.** Nenhum dos 14 `route.ts` espalha `req.body`/payload direto num `.update()`. | grep por `...(body\|req.body\|payload)` em `src/app/api/**` |
| Webhook Asaas sem verificação | **Sem achado.** Token de header exigido; valor do pagamento é recomparado contra `pedidos.valor_pedido`, não confiado do payload. | `src/app/api/asaas/webhook/route.ts` |
| Webhook Uber Direct sem verificação | **Achado pré-existente, já documentado no próprio código** (pendência de ação humana: `UBER_DIRECT_WEBHOOK_SIGNING_KEY` gravada com valor errado). Não gerou Issue nova. | comentário em `src/app/api/webhooks/uber-direct/route.ts` |
| Webhook BubbleWhats sem verificação | **Sem achado.** Secret em query string comparado com `timingSafeEqual`. | `src/app/api/webhooks/bubblewhats/route.ts` |
| **Webhook WhatsApp (Meta) sem verificação** | **🔴 Confirmado.** `POST` não valida `X-Hub-Signature-256` — só o `GET` de handshake valida `hub.verify_token`. Payload forjado pode disparar envio de WhatsApp para qualquer número e tentar "identificar" conversa com e-mail/CPF de terceiro. | `src/app/api/bot/whatsapp/webhook/route.ts` → **Issue #384** |
| Tool-calling sem checagem de permissão equivalente | **Sem achado.** `buscar_pedido`/`listar_pedidos`/`buscar_disputas` em `src/lib/ai/atendimento.ts` filtram por `usuarioId` do canal antes de qualquer query — autorização não depende do que o modelo decide chamar. | `src/lib/ai/atendimento.ts` |
| Slopsquatting/typosquatting em dependências | **Sem achado.** `package.json` curto (14 deps), todos pacotes reais e conhecidos (Anthropic, LangChain, Supabase, Sentry, Next, OpenAI). | `package.json` |
| Config Gitleaks vs. segredos do stack | **Não confirmado, sem verificação de rede disponível nesta sessão para checar cobertura exata do ruleset default contra formatos Asaas ($aact_)/Meta.** Recomendação: confirmar manualmente no painel Gitleaks/doc do ruleset antes de assumir cobertura. | `.gitleaks.toml` |

Issue aberta apenas para o achado confirmado (#384), conforme passo 6 do plano ("por achado confirmado, não por classe de risco").

## 9. Registro de Decisões

- **2026-08-24:** PRD criado como levantamento de escopo, sem código e sem Issue ainda, a pedido explícito do usuário, para retomar depois com uma spec. Fonte: síntese de dois vídeos do YouTube (canal mano deyvin) mais falhas adicionais de conhecimento próprio, cruzadas com os três incidentes de segurança/integridade já registrados neste projeto.
- **2026-08-24:** Issue #375 aberta no GitHub referenciando este PRD. Pesquisa complementar (subagente) trouxe mais falhas de segurança (slopsquatting, shadow AI, agente sobre-permissionado) e mapeou skills relevantes já instaladas — ver seção 7 para os itens de qualidade, que saíram deste PRD e viraram `openspec/changes/qualidade-codigo-vibe-coding/`.
- **2026-08-24:** Auditoria dirigida executada (seção 8), a pedido explícito do usuário — exceção pontual ao "fora de escopo" da seção 5 (que falava de ferramenta automatizada; esta foi manual). Um achado confirmado (webhook WhatsApp sem assinatura) virou Issue #384.
