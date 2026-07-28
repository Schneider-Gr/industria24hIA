---
name: langgraph-loop
description: Orquestra uma tarefa longa como um grafo de estados com subagentes — nós especializados, condições de transição explícitas, e estado persistido em disco entre iterações. Use quando o trabalho tem múltiplas fases dependentes (explorar → planejar → implementar → validar → corrigir) que se repetem até uma condição de saída, e não para tarefas de um passo só. Inspirado no padrão de grafo de estados do LangGraph, sem depender da lib Python — usa Agent/Task deste ambiente.
---

# LangGraph Loop

Este projeto é Next.js/TypeScript, não Python — esta skill **não instala nem
usa a biblioteca LangGraph**. Ela replica a ideia central (grafo de estados
com nós e transições condicionais, iterando até convergir) usando as
ferramentas de orquestração já disponíveis no Claude Code: `Agent` para
subagentes, `TaskCreate`/`TaskUpdate` para o estado dos nós, e um arquivo de
estado em disco para persistir entre iterações.

Ver [[reference-langgraph-avaliacao]] na memória: LangGraph só compensa
quando a tarefa tem loop real (não é sequência fixa de passos), estado
persistente entre iterações (não é stateless request/response) e múltiplos
agentes coordenados. Se a tarefa é um passo único ou uma sequência fixa
conhecida, **não use esta skill** — implemente direto.

## Quando usar

- A tarefa é grande demais para um turno e tem fases com dependência real
  entre si (ex.: "implemente o módulo X" onde validar pode mandar voltar
  para implementar).
- Existe uma condição de saída objetiva (testes passam, build limpo,
  usuário aprovou), não um número fixo de iterações.
- Faz sentido dividir por especialidade (um nó explora, outro implementa,
  outro revisa) em vez de um único agente fazendo tudo.

## Quando NÃO usar

- Tarefa de um passo (ler um arquivo, corrigir uma linha, responder uma
  pergunta) — overhead de estado não se paga.
- Sequência de passos já conhecida e fixa (ex.: "gere a migration, depois
  o types, depois o commit") — isso é uma checklist, não um grafo; use
  `TaskCreate` simples.
- Sem esta skill sendo pedida explicitamente pelo usuário ou por outra
  skill do projeto (ex. `improve-codebase-architecture`).

## Modelo do grafo

Cada **nó** é um subagente com um papel único e uma condição de saída
própria. Cada **aresta** é uma condição que decide o próximo nó a partir do
resultado do nó atual. O **estado** é um arquivo JSON versionado no
scratchpad da sessão (nunca no repo), lido e escrito por cada nó.

```
[explorar] --achou escopo--> [planejar] --plano aprovado--> [implementar]
                                                                 |
                                                    falha na validação
                                                                 v
                              [validar] <----------------- [implementar]
                                 |
                          passou tudo
                                 v
                              [FIM]
```

Nós típicos (adaptar por tarefa, não é obrigatório usar todos):

- **explorar** — `Agent` com `subagent_type: Explore`, mapeia arquivos e
  padrões relevantes, escreve achados no arquivo de estado.
- **planejar** — decide a abordagem, grava passos no arquivo de estado via
  `TaskCreate`.
- **implementar** — `Agent` de escrita (edita código), reporta diffs.
- **validar** — roda typecheck/build/testes; se falhar, volta para
  **implementar** com o erro anexado ao estado.
- **revisar** (opcional) — segunda opinião independente antes de reportar
  concluído.

## Execução

### 1. Definir o grafo

Antes de rodar, declarar explicitamente por escrito (na resposta ao
usuário, não só mentalmente):
- Lista de nós e o papel de cada um.
- Condição de transição entre eles (o que faz sair de um nó e para qual
  próximo).
- Condição de saída do loop inteiro (não "algumas iterações" — um
  predicado verificável: testes verdes, build limpo, ou aprovação
  explícita do usuário).
- Limite de segurança: número máximo de voltas em qualquer ciclo do grafo
  (ex.: no máximo 3 tentativas implementar→validar antes de parar e pedir
  ajuda ao usuário). Sem isso, um ciclo com condição mal calibrada nunca
  termina sozinho.

### 2. Arquivo de estado

Criar em
`<scratchpad-desta-sessão>/langgraph-loop-<slug-da-tarefa>.json` com:

```json
{
  "objetivo": "descrição da tarefa",
  "no_atual": "explorar",
  "historico": [
    { "no": "explorar", "resultado": "...", "proximo": "planejar" }
  ],
  "tentativas_ciclo": { "implementar_validar": 0 }
}
```

Cada nó lê o estado antes de rodar (contexto do que já aconteceu) e escreve
o resultado + qual aresta foi tomada ao terminar. Isso é o que permite
retomar o loop numa sessão nova sem repetir trabalho.

### 3. Rodar os nós

Cada nó é uma chamada de `Agent` com um prompt autocontido — o subagente
não vê esta conversa, então o prompt precisa incluir: o objetivo geral, o
conteúdo relevante do arquivo de estado, e o que esse nó especificamente
deve produzir. Rode nós independentes em paralelo (uma mensagem, múltiplas
chamadas de `Agent`); nós dependentes, sequencialmente, esperando o
resultado antes de decidir a aresta.

### 4. Decidir a aresta

Depois de cada nó, avaliar a condição de transição contra o resultado real
(não assumir sucesso). Atualizar `no_atual` e `historico` no arquivo de
estado antes de prosseguir.

### 5. Saída

Ao atingir a condição de saída (ou o limite de segurança do passo 1),
parar e reportar ao usuário: o que convergiu, o que não convergiu, e o
caminho percorrido no grafo (não só o resultado final) — é isso que
diferencia esta skill de simplesmente "rodar uma tarefa até dar certo".

## Registro de decisões desta skill

- **2026-07-28**: criada a pedido do usuário para o projeto Industria24h.
  Escopo definido como orquestração via Claude Code (Agent/Task), não
  integração real com a biblioteca LangGraph — confirmado explicitamente
  com o usuário via pergunta fechada, dado que o projeto é TS/Next.js sem
  componente Python de agentes.
