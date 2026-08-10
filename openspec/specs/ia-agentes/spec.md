# IA / Agentes Specification

## Purpose
Agentes e automações com LLM: bot de atendimento multi-persona, crews de negócio (SEO/SDR/antifraude), curadoria por IA e observabilidade de fluxos LLM. Fonte: skill `crews-ia`; código em `src/lib/agentes/`, `src/lib/ai/`, `api/bot/chat`, `api/bot/whatsapp`, `api/curadoria-ia`.

## Requirements

### Requirement: Framework proporcional à complexidade do fluxo
O sistema SHALL usar chamada direta ao modelo para fluxo linear, reservando LangGraph apenas para fluxos que exigem loop, estado ou múltiplos agentes.

#### Scenario: Novo fluxo LLM linear
- GIVEN um novo fluxo de IA sem loop, estado ou múltiplos agentes
- WHEN ele é implementado
- THEN usa chamada direta ao modelo, sem introduzir LangGraph

### Requirement: Observabilidade via Langfuse
O sistema SHALL instrumentar todo fluxo LLM novo com Langfuse desde o início, sem exceção.

#### Scenario: Novo fluxo LLM sem instrumentação
- GIVEN um fluxo LLM novo sendo implementado
- WHEN ele é enviado para produção
- THEN já está instrumentado com Langfuse desde o primeiro deploy

### Requirement: Bot de atendimento não decide arbitragem
O sistema MUST garantir que o bot de atendimento multi-persona apenas oriente, informe status e monte rascunhos (ex.: abertura de disputa) — nunca decida desfechos que exigem julgamento humano (ex.: reembolso, troca ou negada numa disputa).

#### Scenario: Escalonamento do bot para humano
- GIVEN uma conversa com o bot sobre um problema não resolvido
- WHEN o bot falha em resolver após 2 tentativas, ou o usuário pede explicitamente
- THEN a conversa escala para atendimento humano, seguindo o mesmo critério já validado no PRD 007

### Requirement: Fluxo LLM que toca dado do marketplace segue a mesma disciplina do código
O sistema SHALL validar o output de qualquer chamada LLM antes de gravar no banco, sem segredo em texto puro, respeitando RLS como qualquer outra escrita.

#### Scenario: Output de LLM antes de gravar
- GIVEN uma resposta gerada por LLM destinada a ser persistida
- WHEN o sistema recebe o output
- THEN valida o formato/conteúdo antes de gravar no banco, respeitando as mesmas policies de RLS de uma escrita manual

### Requirement: Geração de imagem de produto com fallback confirmado
O sistema SHALL usar um provedor de geração de imagem com billing ativo e confirmado por smoke test antes de declarar a funcionalidade funcionando — free tier de alguns provedores retorna `PERMISSION_DENIED` silenciosamente em produção.

#### Scenario: Ativação de novo provedor de imagem
- GIVEN um novo provedor de geração de imagem configurado
- WHEN a equipe declara a funcionalidade pronta
- THEN um smoke test logado já confirmou que o billing está ativo e a geração funciona de fato

## Known Gaps
- 5 crews criadas no CrewAI Studio, apenas 3 publicadas (SEO, SDR, antifraude) — não tratar as demais como ativas.
- Curadoria por IA de qualidade de anúncio (MPDD-44) está em construção, não confundir com a aprovação manual de produto já em produção (ver spec `admin`).
