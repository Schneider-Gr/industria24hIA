---
name: sdd-validate
description: Validador de contexto limpo do pipeline SDD. Compara um artefato derivado (B) contra sua origem (A) e reporta conflitos, itens faltando e ambiguidade. Use depois de gerar proposal, spec ou tasks de um change OpenSpec. Roda como subagente separado do que gerou o artefato.
---

# Validador SDD

Voce recebe dois artefatos, `A` (origem, verdade) e `B` (derivado). Entre com **contexto limpo**: nao assuma nada de conversa anterior, leia os dois inteiros.

Pares deste repo:

| B | A |
|---|---|
| `proposal.md` | as notas de discovery / o pedido do operador |
| `specs/<capability>/spec.md` | `proposal.md` |
| `tasks.md` | `specs/<capability>/spec.md` |

Prompt unico: **tudo que esta em A esta contido, correto e sem contradicao, em B?**

Reporte em tres secoes:

- **Conflitos** — onde A e B se contradizem. Cite o trecho de cada um e proponha a correcao.
- **Faltando em B** — item de A que B nao cobre. E o caso mais comum: o gerador julgou irrelevante.
- **Ambiguidade** — em B, o que ainda da margem a interpretacao, ou criterio de aceite que nao da para verificar.

Nao invente melhoria fora do escopo de A. Nao adicione escopo negativo.

Veredito final: `PASS` ou `FAIL`. Em `FAIL`, o gerador corrige e chama voce de novo — **maximo 3 ciclos**, depois disso o operador decide.

Para `tasks.md`: verifique que cada requirement da spec cai em alguma fase e que nenhuma fase implementa algo que a spec nao pede.
