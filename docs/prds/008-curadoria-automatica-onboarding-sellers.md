---
prd_number: "008"
status: rascunho
priority: média
created: 2026-08-10
issue: ""
depends_on: []
references:
  - "supabase/migrations/0082_produto_sugestoes_ia.sql — tabela de sugestões que esta feature passa a alimentar"
  - "src/app/api/curadoria-ia/route.ts — rota de ingestão externa hoje sem consumidor real; esta feature substitui essa dependência"
  - "src/lib/agentes/coletiva-etapas.ts — padrão de agente StateGraph (carregar → avaliar determinístico → redigir → publicar) reaproveitado aqui"
  - "src/app/api/coletivas/tick/route.ts e src/app/api/carrinho/abandono/tick/route.ts — padrão de rota de tick protegida por token"
  - "vercel.json — único cron hoje agendado é carrinho/abandono/tick; esta feature precisa decidir se entra nesse arquivo"
  - "crews-local/curadoria_lojas.py — script CrewAI hoje desconectado (gera markdown local, nunca chama a API de ingestão); referência do raciocínio de negócio que esta feature porta para dentro do web/"
---

# PRD 008: Curadoria Automática de Onboarding de Sellers Novos

## 1. Contexto

- **Produto/área**: onboarding de vendedores (sellers) no marketplace industria24h — cadastro de loja e de produtos, revisados por um admin antes da publicação.
- **Estado atual**: existe curadoria manual — o admin abre `admin/produtos/[id]` e registra um parecer (`registrarCuradoria`: aprovado/reprovado/sugestão) olhando o cadastro cru. A infraestrutura para sugestões *assistidas* por IA já existe e está pronta do lado de consumo (tabela `produto_sugestoes_ia`, migration 0082; componente `SugestoesIA.tsx`; ações `aplicarSugestaoIA`/`descartarSugestaoIA` em `admin/produtos/[id]/actions.ts`), mas **nada alimenta essa tabela hoje**. Existe uma rota de ingestão (`POST /api/curadoria-ia`, autenticada por `CREWAI_CURADORIA_TOKEN`) esperando um agente externo, e existe um script Python (`crews-local/curadoria_lojas.py`, CrewAI) que faz uma análise parecida — mas ele nunca chama essa rota, só grava um arquivo markdown local (`curadoria.md`) que ninguém no admin vê.
- **Problema**: loja e produto novos só recebem parecer quando um admin escolhe abrir aquele cadastro específico e revisar campo a campo. Não há varredura ativa que aponte, por exemplo, "essa loja nova não tem chave PIX cadastrada" ou "esse produto está sem imagem" — o admin só descobre isso se pensar em checar. Cadastro incompleto ou com descrição fraca chega a ficar publicado sem ser notado, e o seller não recebe orientação de correção a tempo.

> **Contexto técnico** (stack, arquitetura, padrões) vive no TRD (`docs/trd.md`) e no padrão já existente em `src/lib/agentes/coletiva-etapas.ts`, carregados na implementação. Aqui só o ponteiro: esta feature substitui a dependência de um agente CrewAI externo (Python) por lógica rodando dentro do próprio `web/`.

## 2. Solução Proposta

### Visão de produto

- Toda loja e produto novos passam por uma checagem automática de completude de cadastro (CNPJ, chave PIX, endereço, contato, preço, estoque, imagem, categoria, descrição) — sem esperar o admin lembrar de checar.
- Quando a checagem encontra algo que já pode ser corrigido a partir do próprio cadastro (ex.: descrição fraca), o sistema propõe um texto pronto — o admin decide aplicar ou descartar, nunca é publicado sozinho.
- O admin também pode pedir a checagem a qualquer momento, para um cadastro específico, sem esperar o próximo ciclo automático.
- O sistema nunca decide aprovação/reprovação por conta própria — só alimenta a mesma tela de curadoria que o admin já usa hoje.

### Decisões de produto

1. **A curadoria nunca escreve direto em `produtos` ou `lojas`.** Toda saída vira uma linha em `produto_sugestoes_ia` (ou o parecer determinístico equivalente para loja), sujeita a aplicar/descartar humano — mesma regra que já vale hoje para o parecer manual do admin. Motivo: cadastro errado publicado automaticamente é dano direto ao marketplace; o ganho da automação é poupar o trabalho de achar o problema, não o de decidir o quê fazer com ele.
2. **Separação explícita entre checagem de campo (determinística) e julgamento de texto (IA).** Cerca de dez regras (CNPJ ausente/inválido, chave PIX ausente, endereço incompleto, contato ausente, valor de pedido mínimo inválido, preço ou estoque zerado/negativo, produto sem imagem, sem categoria, descrição vazia ou muito curta) são computadas em código, sem chamar modelo nenhum. Só entra IA para avaliar se uma descrição já preenchida é genérica demais e para redigir uma reescrita ou o recado ao seller. Motivo: regra de campo é regra de negócio fixa — resolver via LLM custa mais, é mais lento e corre o risco de esquecer uma checagem entre execuções; reservar IA para o que exige leitura de conteúdo real.
3. **A IA nunca inventa dado cadastral que não está no banco** — por exemplo, não infere razão social a partir do CNPJ nem cidade a partir do CEP usando conhecimento geral do modelo. Se esse enriquecimento for desejado no futuro, é escopo de uma integração com API externa determinística (ex.: a mesma família de `lib/cep.ts`), não do modelo de linguagem. Motivo: dado cadastral incorreto tem custo de negócio maior que a conveniência de preenchê-lo automaticamente.
4. **Disparo por dois caminhos, não um só**: um ciclo automático diário (varredura incremental do que ainda não foi revisado) e um botão manual por cadastro (`admin/lojas/[id]`, `admin/produtos/[id]`) para o admin pedir parecer imediato. Motivo: cobre tanto o fluxo passivo (nada precisa ser lembrado) quanto o caso em que o admin já está olhando um cadastro específico e quer a checagem na hora, sem esperar o próximo ciclo.
5. **A rota de ingestão externa (`/api/curadoria-ia`) e o script `crews-local/curadoria_lojas.py` deixam de ser o caminho usado por esta feature** — a lógica passa a rodar dentro do próprio `web/`, com acesso direto ao banco via service client, sem round-trip HTTP nem token separado para essa finalidade. *(premissa — confirme ou corrija: a rota de ingestão pode continuar existindo para outros usos externos futuros, só não é mais chamada por este fluxo)*

> Decisão **arquitetural** (uso de LangGraph/StateGraph, formato exato do grafo, onde o cron é registrado) não entra aqui — registrar como ADR (`docs/adrs/`) via `escrever-trd` Modo Decision quando esta feature entrar em execução.

### Fora do escopo

- Aprovação ou reprovação automática de loja/produto — permanece decisão humana do admin, como já é hoje.
- Enriquecimento de dado cadastral via API externa (CNPJ→razão social, CEP→cidade) — pode ser proposto como feature própria depois; aqui a curadoria só aponta a ausência do dado.
- Reprocessar cadastro que já tem parecer registrado — dedupe contra `produto_curadoria`/`produto_sugestoes_ia`, mesmo comportamento que `curadoria_lojas.py` já tem hoje.
- Notificação por e-mail/WhatsApp ao seller sobre o parecer automático — o texto do recado é só rascunho para o admin decidir se e como enviar, igual ao e-mail que `registrarCuradoria` já dispara na decisão manual.
- Descomissionar `/api/curadoria-ia` ou `crews-local/curadoria_lojas.py` — ficam existindo, só deixam de ser o caminho ativo desta feature.

## 3. Funcionalidades

### US01: Checagem automática de completude do cadastro da loja

Como admin, quero que toda loja nova seja checada automaticamente contra os campos que bloqueiam repasse ou publicação, para não depender de eu lembrar de revisar manualmente.

**Rules:**
- Verifica, sem uso de IA: CNPJ ausente ou fora do formato válido, chave PIX ausente, endereço incompleto (CEP/cidade/rua/número), contato ausente (WhatsApp e e-mail), valor de pedido mínimo nulo, zero ou negativo.
- Cada campo problemático vira um item de sugestão/apontamento associado à loja, com o motivo específico (ex.: "chave PIX ausente — bloqueia repasse").
- Loja que já tem todos os campos preenchidos corretamente não gera nenhum apontamento.

**Edge cases:**
- Loja corrige o campo entre uma execução e outra → próxima execução não reabre um apontamento já resolvido *(premissa — confirme ou corrija: precisa de uma forma de saber que um apontamento antigo foi resolvido, análoga ao dedupe de produto)*.
- Loja em `situacao='Inativa'` → *(premissa — confirme ou corrija: ainda entra na checagem, ou só lojas `Ativa`/`EmAnalise` importam para onboarding?)*.

### US02: Checagem automática de completude do cadastro de produto

Como admin, quero que todo produto novo seja checado automaticamente contra os campos que impedem uma boa publicação, para identificar cadastro incompleto sem abrir cada produto manualmente.

**Rules:**
- Verifica, sem uso de IA: preço ausente/zero/negativo, estoque zero/negativo, ausência de imagem em `produto_imagens`, ausência de categoria/subcategoria, descrição vazia ou abaixo de um tamanho mínimo *(premissa — confirme ou corrija: limiar de 40 caracteres, mesmo usado como exemplo na discussão)*.
- Produto que já tem parecer registrado em `produto_curadoria` não é reprocessado pela varredura automática — só reaparece se o admin pedir explicitamente (US04).
- Cada apontamento é salvo em `produto_sugestoes_ia` com `tipo` e `motivo` compatíveis com o que `SugestoesIA.tsx`/`aplicarSugestaoIA` já esperam hoje.

**Edge cases:**
- Produto sem nenhuma pendência de campo, mas com descrição presente e genérica → não gera apontamento de campo ausente, mas é candidato à US03 (julgamento de texto).
- Produto excluído entre o cálculo e a gravação da sugestão → gravação falha silenciosamente para aquele item, sem interromper o restante da varredura (mesmo padrão de `expirarPagamentosVencidos` em `coletiva-etapas.ts`, que segue mesmo se um item específico falhar).

### US03: Sugestão de reescrita de descrição fraca (julgamento por IA)

Como admin, quero receber uma sugestão de descrição melhor para produtos com texto genérico ou muito curto, para decidir rapidamente se aplico em vez de reescrever do zero.

**Rules:**
- Só entra em ação sobre produtos com descrição presente (não vazia) e que passaram pela checagem determinística sem pendência de campo mais crítica pendente *(premissa — confirme ou corrija: prioridade — resolve primeiro o que é campo ausente, só sugere reescrita depois)*.
- A reescrita usa exclusivamente dados já existentes no cadastro (nome, categoria, preço, atributos preenchidos) — nunca inventa especificação técnica não informada.
- A sugestão é gravada como `tipo='descricao'` em `produto_sugestoes_ia`, com o texto pronto para aplicar via `aplicarSugestaoIA`.

**Edge cases:**
- Sem `ANTHROPIC_API_KEY` configurada → a checagem determinística (US01/US02) continua funcionando normalmente; só a sugestão de reescrita não é gerada, sem erro fatal para o restante da varredura (mesmo padrão de fallback de `coletiva-etapas.ts`).
- Modelo devolve texto que menciona um dado não presente no cadastro (ex.: um material específico não informado) → sugestão é descartada automaticamente antes de ser gravada, não é apresentada ao admin. *(premissa — confirme ou corrija: precisa de uma validação pós-geração comparando termos novos contra o cadastro original, ou isso é confiança no prompt?)*

### US04: Disparo manual por cadastro específico

Como admin, quero pedir a checagem automática para uma loja ou produto específico a qualquer momento, para não depender do ciclo diário quando já estou revisando aquele cadastro.

**Rules:**
- Botão "Pedir parecer da IA agora" em `admin/lojas/[id]` e em `admin/produtos/[id]`.
- Roda a mesma lógica de US01/US02/US03, mas restrita àquele único registro, mesmo que ele já tenha sido revisado no ciclo automático (ignora o dedupe quando disparado manualmente).
- Resultado aparece na mesma lista de sugestões/apontamentos que o ciclo automático já popula, sem tela separada.

**Edge cases:**
- Admin clica duas vezes seguidas antes do primeiro processamento terminar → segunda chamada é bloqueada ou enfileirada, não gera processamento duplicado simultâneo. *(premissa — confirme ou corrija: forma exata de lock)*
- Cadastro sem nenhuma pendência encontrada → interface informa "nada a apontar agora", em vez de tela vazia sem explicação.

### US05: Ciclo automático diário

Como admin, quero que a curadoria rode sozinha todos os dias, para que loja e produto novos sejam checados sem que eu precise iniciar isso manualmente.

**Rules:**
- Endpoint `POST` protegido por token de servidor, no mesmo padrão de `coletivas/tick` e `carrinho/abandono/tick`.
- Varre lojas e produtos criados desde a última execução (ou sem parecer registrado ainda), evitando reprocessar o que já foi coberto.
- Frequência e horário exatos ficam com o TRD/ADR de execução, mas a intenção de produto é diária, no mesmo espírito do ciclo já existente de carrinho abandonado.

**Edge cases:**
- Ciclo não roda em um dia (falha de infraestrutura, cron não configurado) → próxima execução ainda cobre o que ficou pendente, porque a varredura é por "sem parecer ainda", não por "criado nas últimas 24h" fixas — mesmo raciocínio já usado em `coletiva-etapas.ts` (o tick atrasado só atrasa o aviso, nunca perde o evento).
- Volume grande de cadastros novos em um único ciclo → *(premissa — confirme ou corrija: precisa de limite de itens por execução para não estourar tempo de resposta do endpoint?)*

## 4. Fluxo de Negócio

```
Disparo (ciclo diário OU botão manual do admin)
   │
   ▼
Loja ou produto já tem parecer registrado?
   ├── sim, e disparo é automático ──▶ ignora
   ├── sim, e disparo é manual ──▶ reprocessa mesmo assim
   └── não ──▶ roda checagem determinística de campos
                  │
                  ▼
             Encontrou campo ausente/inválido?
                  ├── sim ──▶ grava apontamento (motivo específico, sem IA)
                  └── não ──▶ segue
                                │
                                ▼
                          Descrição presente parece genérica?
                                ├── sim ──▶ IA sugere reescrita (só usando dados do cadastro)
                                └── não ──▶ nenhum apontamento adicional
                  │
                  ▼
        Sugestões/apontamentos aparecem em admin/lojas/[id] e admin/produtos/[id]
                  │
                  ▼
        Admin aplica ou descarta (decisão humana, como já funciona hoje)
```

## 5. Critérios de Aceite

### 5a. Critérios de aceite da feature

| Critério | Razão de negócio | Como verificar (observável) |
|----------|------------------|-----------------------------|
| Nenhuma sugestão é aplicada em `produtos`/`lojas` sem ação explícita do admin | Cadastro incorreto publicado automaticamente é dano direto ao marketplace | Rodar a curadoria sobre um lote de teste e confirmar no banco que `produtos`/`lojas` não mudaram até o admin clicar em aplicar |
| Loja/produto com cadastro completo não gera nenhum apontamento | Apontamento sem motivo real é ruído que faz o admin ignorar futuros avisos | Rodar sobre um cadastro deliberadamente completo e conferir que nenhuma linha é gravada em `produto_sugestoes_ia`/equivalente de loja |
| Nenhum texto sugerido pela IA menciona dado que não está no cadastro de origem | Especificação inventada em descrição de produto é informação falsa ao comprador | Comparar, para uma amostra, os termos da sugestão contra os campos do produto que a originou |
| Item já revisado pelo ciclo automático não é reprocessado por uma segunda execução automática do mesmo ciclo | Reprocessar gera sugestão duplicada e desperdiça chamada de IA | Rodar o ciclo duas vezes seguidas sobre o mesmo estado de banco e conferir que não há duplicata |

### 5b. Métricas de sucesso

| Métrica | Baseline (fonte) | Meta | Prazo | Mín. aceitável | Responsável |
|---------|-------------------|------|-------|-----------------|-------------|
| % de lojas/produtos novos com parecer registrado (manual ou automático) dentro de 48h do cadastro | A levantar — hoje não há medição de tempo até o primeiro parecer | 90% | 60 dias após o lançamento | 70% | Dono de produto do marketplace |
| % de sugestões de reescrita de descrição aplicadas pelo admin (vs. descartadas) | A levantar — feature nova, sem histórico | 40% | 60 dias após o lançamento | 20% | Dono de produto do marketplace |

## 6. Milestones

### Milestone 1: Cadastro incompleto nunca passa despercebido

**Por que é um marco:** hoje um cadastro com campo crítico ausente só é notado se um admin abrir aquele registro específico; este marco garante que toda loja/produto novo é checado contra as regras de campo, sem depender de lembrança humana.

**Funcionalidades:** US01, US02, US05

**Checklist de aceite** (marcado pelo Aprovador após a implementação):
- [ ] Loja/produto com cadastro completo não gera nenhum apontamento
- [ ] Item já revisado pelo ciclo automático não é reprocessado por uma segunda execução do mesmo ciclo
- [ ] Nenhuma sugestão é aplicada em `produtos`/`lojas` sem ação explícita do admin

**Aprovador:** Dono de produto do marketplace

### Milestone 2: Descrição fraca vira sugestão pronta para aplicar

**Por que é um marco:** vai além de apontar o que falta — propõe o texto corrigido, poupando o admin de reescrever do zero, mantendo a decisão final humana.

**Funcionalidades:** US03

**Checklist de aceite** (marcado pelo Aprovador após a implementação):
- [ ] Nenhum texto sugerido pela IA menciona dado que não está no cadastro de origem
- [ ] Sugestão aparece na mesma tela de curadoria já usada pelo admin (`SugestoesIA.tsx`)

**Aprovador:** Dono de produto do marketplace

### Milestone 3: Admin pede parecer sob demanda

**Por que é um marco:** cobre o caso em que o admin já está revisando um cadastro específico e não quer esperar o próximo ciclo diário — entrega controle imediato sem depender do agendamento.

**Funcionalidades:** US04

**Checklist de aceite** (marcado pelo Aprovador após a implementação):
- [ ] Botão "Pedir parecer da IA agora" funciona em `admin/lojas/[id]` e `admin/produtos/[id]`
- [ ] Resultado aparece na mesma lista de sugestões usada pelo ciclo automático

**Aprovador:** Dono de produto do marketplace

## 7. Riscos e Dependências

| Risco | Impacto | Mitigação | Status |
|-------|---------|-----------|--------|
| Ciclo diário exige registrar um novo cron em `vercel.json`, e o projeto hoje só tem um cron ativo — pode haver limite de plano Vercel para número/frequência de crons | Médio | Confirmar plano Vercel do projeto antes de assumir frequência diária | Pendente |
| Não existe hoje uma tabela de apontamento para loja (só para produto, via `produto_sugestoes_ia`/`produto_curadoria`) — US01 pode exigir schema novo | Médio | Definir com o time se o apontamento de loja usa uma tabela nova ou é modelado dentro de uma estrutura genérica que cubra loja e produto | Pendente |
| Validação de que a IA não inventou dado fora do cadastro (US03) não tem mecanismo definido | Médio | Decidir, no TRD/ADR de execução, se a validação é determinística (comparação de termos) ou confiança no prompt com amostragem manual periódica | Pendente |

**Dependências:**

| Dependência | Tipo | Status | Impacto se bloqueado |
|-------------|------|--------|----------------------|
| Tabela `produto_sugestoes_ia` e ações `aplicarSugestaoIA`/`descartarSugestaoIA` (migration 0082) | Interna | Concluída (em produção) | Nenhum — esta feature só passa a alimentar o que já existe |
| Componente `SugestoesIA.tsx` em `admin/produtos/[id]` | Interna | Concluída (em produção) | Sem UI equivalente para loja, US01 não tem onde aparecer — precisa confirmar se reaproveita ou se cria tela própria |
| Definição de frequência/horário do cron diário | Interna | A confirmar | US05 não pode ser implementada sem essa decisão de execução |

## 8. Referências

- [supabase/migrations/0082_produto_sugestoes_ia.sql](../../supabase/migrations/0082_produto_sugestoes_ia.sql) — schema que esta feature passa a alimentar.
- [src/app/api/curadoria-ia/route.ts](../../src/app/api/curadoria-ia/route.ts) — rota de ingestão externa hoje sem consumidor real conectado.
- [src/lib/agentes/coletiva-etapas.ts](../../src/lib/agentes/coletiva-etapas.ts) — padrão de agente (carregar → avaliar determinístico → redigir → publicar) reaproveitado aqui.
- [src/app/api/coletivas/tick/route.ts](../../src/app/api/coletivas/tick/route.ts) e [src/app/api/carrinho/abandono/tick/route.ts](../../src/app/api/carrinho/abandono/tick/route.ts) — padrão de rota de tick protegida por token.
- [crews-local/curadoria_lojas.py](../../../../crews-local/curadoria_lojas.py) — script CrewAI de referência para o raciocínio de negócio, hoje desconectado da ingestão real.

## 9. Registro de Decisões

- **2026-08-10:** A curadoria passa a rodar dentro do `web/` (service client direto), não mais via agente Python externo chamando `/api/curadoria-ia`. Motivo: elimina o hop HTTP com token separado e resolve a desconexão encontrada entre o script `curadoria_lojas.py` (nunca chama a rota) e a tabela de sugestões (nunca alimentada).
- **2026-08-10:** Separação obrigatória entre checagem de campo (determinística, sem LLM) e julgamento de texto (IA). Motivo: discussão explícita entre usuário e assistente identificou que a maior parte do que `curadoria_lojas.py` hoje delega ao modelo é, na verdade, regra de campo fixa — mover isso para código reduz custo, latência e risco de inconsistência entre execuções.
- **2026-08-10:** Disparo por dois caminhos (cron diário + botão manual), não só um. Motivo: cron cobre o fluxo passivo, botão cobre o caso em que o admin já está revisando um cadastro específico — nenhum dos dois sozinho cobre os dois cenários de uso.
- **2026-08-10:** Feature registrada para implementação em fase futura — status inicial `rascunho`, sem planejamento de execução associado ainda.
