## 1. Cliente Jev robusto (#743)

- [x] 1.1 `consultarJev` com retry em 429/529 (backoff, `Retry-After`, máx. 2 retries) e modelo `jev-1.13.0`
- [x] 1.2 Resposta expõe `probabilities` e `confidence`; `perguntarTypeSafe` segue devolvendo probabilidades para a taxonomia
- [x] 1.3 Lead scoring usa o `confidence` da API; remover `confiancaChoice`
- [x] 1.4 Testes: retry 529→200, 401 sem retry, 429 esgotado, pin do modelo
- [x] 1.5 tsc + vitest verdes; smoke real com a chave de produção

## 2. Persona na 1ª mensagem (#744)

- [x] 2.1 Choice com as personas de `Persona` (teste de paridade com o check de `bot_conversas.persona`)
- [x] 2.2 Gate de confidence (0,9, opção `indefinido`, prazo de 3s); gravar persona antes da 1ª chamada ao Claude
- [x] 2.3 Eval com mensagens iniciais reais do `bot_mensagens` antes de ligar

## 3. Aviso de comprador quente (#745)

- [x] 3.1 Reusar `PERGUNTA_SCORE` no chat comprador↔loja
- [x] 3.2 Aviso único por conversa (marca persistida) via `enviarBubblewhats`
- [x] 3.3 Falha do Jev ou do envio não altera a resposta do bot

## 4. Motivo de devolução (#746), sem Jev: botões gerados de disputas.ts

- [x] 4.1 Rótulo curto (`curto`, até 20 caracteres) em `MOTIVOS_PADRAO`/`MOTIVO_PERECIVEL`
- [x] 4.2 Prompt gera `[OPCOES: ...]` e o mapa rótulo → value da fonte única (fim da lista duplicada)
- [x] 4.3 Teste de paridade + eval real (Haiku 4.5): 6 botões, descrição sem botões, link com o value certo

## 5. Calibração (contínua)

- [ ] 5.1 Revisar leads reais em `/admin/leads` e ajustar `CONFIANCA_MINIMA`
