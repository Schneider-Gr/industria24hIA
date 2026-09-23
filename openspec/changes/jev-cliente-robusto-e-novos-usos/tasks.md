## 1. Cliente Jev robusto (#743)

- [x] 1.1 `consultarJev` com retry em 429/529 (backoff, `Retry-After`, máx. 2 retries) e modelo `jev-1.13.0`
- [x] 1.2 Resposta expõe `probabilities` e `confidence`; `perguntarTypeSafe` segue devolvendo probabilidades para a taxonomia
- [x] 1.3 Lead scoring usa o `confidence` da API; remover `confiancaChoice`
- [x] 1.4 Testes: retry 529→200, 401 sem retry, 429 esgotado, pin do modelo
- [x] 1.5 tsc + vitest verdes; smoke real com a chave de produção

## 2. Persona na 1ª mensagem (#744)

- [ ] 2.1 Choice com as personas de `Persona` (teste de paridade com o check de `bot_conversas.persona`)
- [ ] 2.2 Gate de confidence; gravar persona antes da 1ª chamada ao Claude
- [ ] 2.3 Eval com mensagens iniciais reais do `bot_mensagens` antes de ligar

## 3. Aviso de comprador quente (#745)

- [ ] 3.1 Reusar `PERGUNTA_SCORE` no chat comprador↔loja
- [ ] 3.2 Aviso único por conversa (marca persistida) via `enviarBubblewhats`
- [ ] 3.3 Falha do Jev ou do envio não altera a resposta do bot

## 4. Motivo de devolução (#746)

- [ ] 4.1 Choice sobre `motivosDisponiveis(perecivel)` (teste de paridade)
- [ ] 4.2 Abaixo do limiar ou erro: sem pré-preenchimento

## 5. Calibração (contínua)

- [ ] 5.1 Revisar leads reais em `/admin/leads` e ajustar `CONFIANCA_MINIMA`
