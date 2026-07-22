---
name: crews-ia
description: Agentes de IA do Industria24h — crews CrewAI (SEO/SDR/antifraude), observabilidade Langfuse, quando usar LangGraph. Use ao criar/alterar agentes, crews, automações com LLM ou instrumentação de observabilidade do projeto.
---

# Crews / IA — Industria24h

## CrewAI Studio

- 5 crews criadas, 3 publicadas: **SEO, SDR, antifraude** (memória `project-crewai-studio-agentes-industria24h`).
- Conta: **revgrow7@gmail.com**. Acesso preferencial via API/MCP (`mcp__crewai_enterprise__kickoff_crew`/`get_crew_status`), browser só em último caso (Studio via browser já custou 38 erros; página com aviso de adblock = pedir para desativar, não reconectar).
- 🔴 PAT Supabase exposto numa crew — rotacionar antes de qualquer trabalho novo nelas.

## Observabilidade

- **Langfuse validado** para industria24h (integração via API funcionou de primeira; ver memória `langfuse-integracao`). Instrumentar qualquer fluxo LLM novo com Langfuse desde o início.

## Arquitetura de fluxo LLM

- **LangGraph só paga quando há loop, estado ou multi-agente** (memória `langgraph-avaliacao`). Fluxo linear = chamada direta, sem framework.
- Padrão gerar→validar→corrigir com critério de parada: skill global `langgraph-loop`.
- Geração de imagem de produto: Imagen/Gemini exige projeto Google PAGO (free tier = PERMISSION_DENIED). Alternativa decidida: trocar para OpenAI gpt-image-1 OU confirmar billing — smoke test logado antes de declarar funcionando. Env var chama-se `Gemini` (código aceita ambos os nomes).

## Regras

- Fluxo LLM que toca dado do marketplace: mesma disciplina do código (sem segredo em texto puro, RLS respeitada, validar output antes de gravar no banco).
- Custo: modelos menores (haiku/sonnet) para tarefas delegáveis.
