# PRD 047 — Jev (TypeSafe): decisões tipadas no lugar de prompt-e-parse

Status: rascunho (22/09/2026)
Origem: Issue #721, PR #722 (classificação na taxonomia, em produção desde 22/09)

## Problema

Onde o sistema precisa de julgamento semântico (isto é uma categoria de tijolo? este
preço está fora do padrão? o comprador provou a não entrega?) hoje há duas saídas, as
duas ruins:

1. **Prompt e parse com o Haiku.** O modelo escreve texto, o código tenta interpretar.
   A regra de decisão fica escondida na redação do prompt, não dá para auditar e não há
   medida de incerteza: uma resposta errada chega com a mesma cara de uma certa.
2. **Fila manual.** Um humano abre item por item (curadoria de produto, disputa,
   aprovação de loja) sem priorização.

## O que o Jev é

Modelo System One da TypeSafe. Recebe um estado (JSON do pedido, do produto, da
conversa) e perguntas tipadas; devolve resposta tipada com a distribuição de
probabilidade. Três primitivas:

- **Choice** — uma opção entre N definidas (máximo 255 por pergunta). Devolve a opção e
  a probabilidade de cada uma.
- **Noul** — sim ou não. Devolve a probabilidade do sim.
- **Score** — posição numa escala de níveis descritos (2 a 10).

Choice e Score trazem `confidence`, derivada da distribuição. É nela que o código
decide entre aplicar sozinho e mandar para uma pessoa.

**O que o Jev não faz:** não gera texto, não calcula. Preço, comissão, repasse e frete
continuam em código. Redação de descrição e resposta ao cliente continuam no Haiku.
Resposta tipada garante o formato, nunca a verdade.

## Regras transversais

- **R1.** Toda aplicação nova nasce com gabarito: no mínimo 30 casos reais rotulados por
  uma pessoa, antes de ligar para o usuário final.
- **R2.** O corte de confiança é calibrado nesse gabarito, nunca copiado de outra
  aplicação. Abaixo do corte, o fluxo cai para revisão humana, nunca para o palpite.
- **R3.** Perguntas independentes sobre o mesmo estado vão numa única requisição.
- **R4.** Falha ou ausência de `TYPESAFE_API_KEY` degrada para o comportamento anterior;
  nenhuma tela quebra por causa do Jev.
- **R5.** A regra de negócio (o que fazer com a resposta) fica em `src/lib/<modulo>/`
  com teste companheiro; o Jev entra por injeção de dependência, como em
  `src/lib/catalogo-compra/jev-taxonomia.ts`.
- **R6.** Nada do caminho do dinheiro é decidido pelo Jev. Ele pode sinalizar risco;
  quem libera valor é regra determinística ou pessoa.

## Aplicações

### A1. Classificação na taxonomia — ENTREGUE (PR #722)

Um Choice por nível de `taxonomia_nos`, beam search de largura 3. Score >= 0,75 abre o
nó no cadastro; abaixo, o seller escolhe entre 3 opções com percentual. Medido em
produção: 3,5 a 4,6 s e cerca de 6 mil tokens por produto.

Pendências herdadas: gabarito dos 30 casos e raízes duplicadas entre as fontes (Google,
Martins, Mercado Livre), que fazem produto igual cair em nós de comissão diferentes.

### A2. Curadoria de produto — próximo

Hoje `gerarCuradoriaProduto` (`src/app/(seller)/seller/produtos/ia-actions.ts`) manda
tudo ao Haiku e interpreta o texto. Divisão proposta, numa requisição:

| Pergunta | Tipo | Uso no código |
| --- | --- | --- |
| Preço fora do padrão dos comparáveis aprovados | Noul | alerta ao seller |
| Descrição tem conteúdo proibido | Noul | barra o envio para aprovação |
| Completude da ficha (medida, embalagem, unidade) | Score | ordena a fila do admin |
| Clareza do título | Score | sugere reescrita |

A descrição otimizada e as palavras-chave continuam no Haiku. Ganho: a regra de
aprovação vira código auditável e a fila do admin passa a ter ordem.

### A3. Triagem de disputas

Estado: mensagens e anexos da disputa (`src/lib/disputas.ts`). Perguntas: houve
evidência de não entrega; o seller respondeu no prazo; gravidade do caso (Score). Saída:
fila do admin ordenada por gravidade. O Jev não decide reembolso.

### A4. Roteamento do bot de atendimento

Estado: as últimas mensagens da conversa. Um Choice de intenção (pedido, entrega,
coletiva, cadastro, humano) com os argumentos que cada rota precisa. Confiança baixa
escala para atendimento humano em vez de responder errado.

### A5. Relevância na busca e na vitrine

Score de aderência de cada produto candidato à consulta; o código combina com preço,
estoque e distância. Exige conta de custo antes: é a aplicação de maior volume, e por
isso a mais cara.

### A6. Primeiro filtro de cadastro de loja e de anúncio

Noul sobre a loja recém-criada (dados coerentes, atividade declarada plausível) e sobre
a peça de publicidade (promessa que a plataforma não cumpre, afirmação proibida).
Precede o olho humano, não substitui.

### A7. Varredura do catálogo existente

As perguntas de A2 rodadas em lote sobre o catálogo atual, gerando lista priorizada do
que está mal cadastrado. Trabalho pontual, não fluxo.

## Ordem sugerida

A2 primeiro: o código já existe, o ganho é medível contra o comportamento atual e não
toca no caminho do dinheiro. Depois A3 e A4, que tiram trabalho manual do admin. A5 e
A6 dependem de conta de custo e de política, e ficam para depois. A7 é oportunista.

## Fora de escopo

Geração de texto, cálculo financeiro, decisão automática de reembolso ou de bloqueio de
conta, e qualquer uso que dispense o gabarito da R1.

## Aberto

- Preço por token do TypeSafe: não levantado. Sem ele não dá para decidir A5.
- Árvore principal por setor (raízes duplicadas), que afeta A1 e a comissão.
- Se o corte de 0,75 de A1 se sustenta depois do gabarito.
