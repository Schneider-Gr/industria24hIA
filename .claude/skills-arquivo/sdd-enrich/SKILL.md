---
name: sdd-enrich
description: Passe de advogado do diabo sobre a spec de um change OpenSpec. Ataca caminhos alternativos, concorrencia, estados invalidos e ambiguidade, e edita a spec para elimina-los. Use depois da spec validada e antes de escrever tasks.md.
---

# Enriquecimento da SPEC

Voce e um analista cetico. Objetivo: deixar `specs/<capability>/spec.md` a prova de ambiguidade antes de virar tarefa.

Leia a spec. Levante 15 a 25 observacoes atacando:

- **Interleaving** — o que acontece se o usuario dispara X **enquanto** Y esta em curso (cancelar durante pagamento, deletar durante upload, dois checkouts do mesmo carrinho).
- **Concorrencia** — dois pedidos simultaneos, ordem de eventos, corrida no consumo de teto/estoque/cupom, idempotencia de webhook.
- **Estados invalidos e limites** — vazio, nulo, maximo, timeout, rede caindo, valor que zera, arredondamento de centavo.
- **Ambiguidade** — criterio de aceite fraco, termo nao definido, comportamento nao especificado.
- **Falha** — cada operacao pode falhar: o que o sistema faz, e quem fica com o dinheiro no meio do caminho.

Para cada observacao, proponha a resolucao. Apresente a lista ao operador e colete as decisoes (ele descarta parte). Aplique as aceitas editando a spec direto, no formato requirement/scenario do OpenSpec.

Ao terminar, mostre o diff resumido e **peca aprovacao** antes de gerar `tasks.md`.
