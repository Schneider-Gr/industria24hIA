---
prd_number: "024"
status: rascunho
priority: baixa
created: 2026-08-19
issue: "#304"
depends_on: []
references:
  - "https://github.com/Schneider-Gr/industria24hIA/issues/304"
  - "https://github.com/Schneider-Gr/industria24hIA/pull/305"
  - "https://github.com/Schneider-Gr/industria24hIA/pull/322"
  - "https://industria24.com.br/desenvolvedores"
---

# PRD 024: Documentação Swagger/OpenAPI das rotas internas de API

## 1. Contexto

- **Produto/área**: Industria24h — engenharia interna (não é feature de vitrine/comprador/seller).
- **Estado atual**: `src/app/api/**/route.ts` reúne 12 rotas internas (webhooks, bot, carrinho, coletivas, categorias, busca-preview, observabilidade) usadas pelo próprio frontend Next.js. Não existia nenhuma documentação navegável delas — para saber o contrato de request/response de uma rota, o único caminho era ler o código-fonte.
- **Problema**: qualquer pessoa (humana ou agente) que precise integrar com ou depurar uma rota interna perde tempo lendo `route.ts` linha a linha. Isso é diferente da API pública para terceiros (MCP, documentada em `/desenvolvedores`), que já tinha doc — a lacuna era só do lado interno.

> **Contexto técnico** (Next.js App Router, `next-swagger-doc`, `swagger-ui-react`) vive no TRD; aqui só o ponteiro. Ver PR #305 para a implementação de referência.

## 2. Solução Proposta

### Visão de produto

- Publicar uma página interna (`/api-docs`) com Swagger UI navegável, gerada a partir de anotações `@openapi` escritas diretamente nas rotas.
- Documentar cada rota só depois de ler a implementação real — nunca inventar schema (regra de vibecoding do projeto).
- Deixar claro, na própria página, que isso **não é** a API pública para terceiros — essa continua em `/desenvolvedores`.
- Cobertura é incremental: a entrega inicial não exige 100% das rotas documentadas de uma vez.

### Decisões de produto

1. Página não é indexável por buscadores (é documentação interna, não uma superfície pública) *(premissa — confirme ou corrija)*.
2. Cobertura da documentação é incremental — cada rota é anotada quando alguém já está mexendo nela ou quando vira prioridade, não em um esforço único de "documentar tudo agora".

> Escolha de biblioteca (`next-swagger-doc` + `swagger-ui-react`) é decisão técnica, não de produto — não é ADR por não ser arquitetural/durável (troca de lib de doc não quebra contrato nenhum), mas fica registrada no TRD/PR de referência.

### Fora do escopo

- Documentar a API pública para terceiros (MCP) — já coberta por `/desenvolvedores`, fora desta feature.
- Gerar client SDK a partir da spec OpenAPI — não solicitado.
- Autenticação/autorização para acessar `/api-docs` — hoje é uma rota pública sem gate, mesma exposição de qualquer página do site *(premissa — confirme ou corrija; se a doc revelar informação sensível de shape de dados, pode precisar de proteção)*.
- Migrar `mcp-server/` (Express) para Fastify — avaliado e descartado nesta rodada: o serviço só expõe `POST /mcp` (JSON-RPC genérico) e `GET /health`, sem rotas REST para um gerador OpenAPI documentar de forma útil.

## 3. Funcionalidades

### US01: Visualizar documentação navegável das rotas internas

Como desenvolvedor do time (humano ou agente), quero abrir uma página com Swagger UI das rotas internas de `src/app/api`, para entender o contrato de request/response sem precisar ler o código-fonte de cada rota.

**Rules:**
- `/api-docs` renderiza Swagger UI a partir de uma spec OpenAPI 3.0 gerada dinamicamente das anotações `@openapi` presentes nas rotas.
- A página informa explicitamente que não é a API pública para terceiros, apontando para `/desenvolvedores`.
- Rotas sem anotação `@openapi` simplesmente não aparecem na spec — a ausência de doc não é um erro *(premissa — confirme ou corrija)*.

**Edge cases:**
- Nenhuma rota anotada ainda (spec vazia) → Swagger UI renderiza normalmente, sem lista de endpoints e sem erro 500 *(premissa — confirme ou corrija)*.
- Rota anotada é removida ou renomeada sem atualizar o JSDoc → doc passa a referenciar um caminho inexistente; nada quebra em runtime, mas a doc fica desatualizada até alguém perceber e corrigir *(premissa — confirme ou corrija; risco aceito, não há verificação automática nesta entrega)*.

### US02: Confiar que o schema documentado é real

Como desenvolvedor consultando `/api-docs`, quero que o schema de cada rota documentada reflita o comportamento real do código, para não ser induzido a integrar errado por causa de uma doc inventada.

**Rules:**
- Toda anotação `@openapi` só é escrita depois de ler a implementação atual da rota (`route.ts`) — nunca inferida ou copiada de um padrão genérico.
- Rota que muda de schema depois de documentada não é auto-detectada — a doc não tem verificação de drift automática nesta entrega.

**Edge cases:**
- Duas rotas com nomes parecidos (ex.: `/api/categorias` e uma futura `/api/categoria/[id]`) → cada uma é documentada e verificada independentemente, sem herdar schema uma da outra *(premissa — confirme ou corrija)*.

### US03: Ampliar a cobertura das rotas restantes *(não implementado nesta entrega)*

Como desenvolvedor do time, quero que as rotas internas ainda não documentadas (`/api/asaas/webhook`, `/api/bot/chat`, `/api/bot/whatsapp`, `/api/carrinho/*`, `/api/coletivas/*`, `/api/curadoria-ia`, `/api/observabilidade/*`, `/api/webhooks/*`) também apareçam em `/api-docs`, para que a cobertura pare de ser parcial.

**Rules:**
- Mesma regra de US02 se aplica: schema só entra depois de ler o código real da rota.
- Rotas com webhook de terceiro (Asaas, Uber Direct) documentam o payload esperado, não o payload validado/assinado (isso é regra de segurança, não de doc) *(premissa — confirme ou corrija)*.

**Edge cases:**
- Rota com lógica condicional complexa (ex.: múltiplos status de resposta conforme validação) → documentar todos os status observados no código, não só o caminho feliz *(premissa — confirme ou corrija)*.

## 4. Fluxo de Negócio

_Não aplicável — não há ramificação de regra de negócio nesta feature que precise de diagrama; o comportamento é linear (acessar página → ver spec renderizada)._

## 5. Critérios de Aceite

### 5a. Critérios de aceite da feature

| Critério | Razão de negócio | Como verificar (observável) |
|----------|------------------|-----------------------------|
| `/api-docs` responde 200 em produção e renderiza o título "API interna" | prova de que a página está de fato publicada, não só compilando localmente | `curl` ou browser em `industria24.com.br/api-docs`, checar `<title>` |
| Cada rota anotada responde exatamente como o schema documentado descreve | doc que diverge do comportamento real é pior que nenhuma doc — induz erro de integração | chamar a rota real (`fetch`) e comparar o shape da resposta com o schema OpenAPI |
| Rota sem anotação não aparece na spec nem quebra a renderização da página | cobertura incremental não pode travar a entrega | remover/adicionar anotação de uma rota de teste e confirmar que `/api-docs` continua respondendo 200 |

### 5b. Métricas de sucesso

| Métrica | Baseline (fonte) | Meta | Prazo | Mín. aceitável | Responsável |
|---------|-------------------|------|-------|-----------------|-------------|
| % de rotas de `src/app/api` com anotação `@openapi` | 3 de 12 rotas (25%) — contagem de `route.ts` em `src/app/api` nesta entrega | 100% *(premissa — confirme ou corrija; meta e prazo cabem ao dono do backlog)* | A definir | A definir | Time de engenharia |

## 6. Milestones

### Milestone 1: Publicar documentação navegável das rotas internas

**Por que é um marco:** antes, não existia nenhuma forma navegável de consultar o contrato das rotas internas — só leitura de código. Depois, existe uma página real, em produção, com schema verificado contra o comportamento real de pelo menos um recorte de rotas.

**Funcionalidades:** US01, US02

**Checklist de aceite** (marcado pelo Aprovador após a implementação):
- [x] `/api-docs` responde 200 em produção e renderiza o título "API interna"
- [x] Cada rota anotada responde exatamente como o schema documentado descreve
- [x] Rota sem anotação não aparece na spec nem quebra a renderização da página

**Aprovador:** Mantenedor do repositório (andreiaschneider / industria24hs)

### Milestone 2: Ampliar cobertura das rotas restantes

**Por que é um marco:** passa a cobertura de documentação de "parcial e simbólica" (3 rotas) para "referência confiável" do conjunto real de rotas internas — deixa de ser preciso adivinhar quais rotas têm doc.

**Funcionalidades:** US03

**Checklist de aceite** (marcado pelo Aprovador após a implementação):
- [ ] 100% das rotas de `src/app/api` (ou o percentual que o dono do backlog definir) têm anotação `@openapi` verificada contra o código real

**Aprovador:** Mantenedor do repositório (andreiaschneider / industria24hs)

## 7. Riscos e Dependências

| Risco | Impacto | Mitigação | Status |
|-------|---------|-----------|--------|
| Doc desatualiza silenciosamente quando a rota muda e ninguém atualiza o JSDoc | Médio — doc voltaria a ser menos confiável que o código, na prática | Nenhuma verificação automática de drift nesta entrega; revisar anotação sempre que a rota for tocada em outro PR *(premissa — confirme ou corrija)* | Pendente |
| Cobertura parcial pode dar falsa sensação de "documentação completa" | Baixo — mitigado pela própria página listar só o que está anotado, sem prometer 100% | Nenhuma nesta entrega além de comunicação (esta seção) | Monitorando |

**Dependências:**

| Dependência | Tipo | Status | Impacto se bloqueado |
|-------------|------|--------|----------------------|
| `ANTHROPIC_API_KEY` válida no CI (job `review` do GitHub Actions) | Interna, mas fora do escopo desta feature | Resolvida durante esta mesma sessão (chave rotacionada, PR #322) — não bloqueia esta feature, só o processo de revisão automática de PR | Nenhum, já resolvido |

## 8. Referências

- [Issue #304](https://github.com/Schneider-Gr/industria24hIA/issues/304) — issue original que pediu a documentação Swagger.
- [PR #305](https://github.com/Schneider-Gr/industria24hIA/pull/305) — implementação de referência (Milestone 1), mergeada e em produção.
- [PR #322](https://github.com/Schneider-Gr/industria24hIA/pull/322) — rotação da `ANTHROPIC_API_KEY` do CI e remoção da flag de debug do job `review`; não é parte desta feature, mas aconteceu na mesma sessão e está registrado aqui para rastreabilidade.
- [/desenvolvedores](https://industria24.com.br/desenvolvedores) — documentação pública da API para terceiros (MCP); referência de "o que esta feature não é".

## 9. Registro de Decisões

- **2026-08-19:** PRD escrito retroativamente — a feature (Milestone 1: US01 + US02) já estava implementada, testada em produção via browser-harness (200 em `/api-docs`, respostas reais das 3 rotas anotadas batendo com o schema documentado) e mergeada (#305) antes deste documento existir. `status` mantido em `rascunho` (padrão desta skill para todo PRD novo); a transição para `pronto`/`concluido` cabe ao Aprovador, não a este documento.
- **2026-08-19:** Migração do `mcp-server/` (Express) para Fastify + `fastify-swagger` foi avaliada e descartada — o serviço só expõe um endpoint JSON-RPC genérico e um health check, sem superfície REST para um gerador OpenAPI documentar de forma útil. Decisão tomada em conversa com o dono do repo antes de qualquer código ser escrito.
- **2026-08-19:** Cobertura de rotas documentadas foi deliberadamente incremental (3 de 12 na entrega inicial) em vez de exigir 100% de uma vez, para não bloquear a publicação da página atrás de um esforço de documentação completo.
