## Why

O Jev (TypeSafe System One) entrou em produção em 23/09/2026 em dois caminhos:
sugestão de taxonomia no cadastro de produto (#722) e lead scoring (#739). Os
dois usam o mesmo cliente HTTP (`perguntarTypeSafe`, fetch cru), e os dois têm
limiar calibrado: `CONFIANCA_JEV = 0.75` no `TaxonomiaPicker` e
`CONFIANCA_MINIMA = 0.5` no lead scoring.

O cliente tem três fragilidades que a doc oficial do TypeSafe aponta:

1. **Sem retry.** 429 (rate limit) e 529 (overload) viram falha direta. O SDK
   oficial retentaria; o fetch cru não. No cadastro o seller perde a sugestão;
   no lead scoring o score cai para o Claude sem necessidade.
2. **Modelo `jev-latest`.** O alias muda sem aviso (hoje é `jev-1.13.0`). Uma
   troca de versão desloca as probabilidades e invalida os dois limiares.
3. **Confidence recalculado.** A API devolve `confidence` em cada resposta; o
   código descarta e recalcula pela fórmula (`confiancaChoice`), duplicando
   uma regra do fornecedor.

A revisão dos 11 pontos de IA do código mostrou ainda três lugares onde a
decisão é uma escolha numa lista fechada, o encaixe do Jev, e hoje custa uma
rodada de Claude ou se perde em silêncio:

- **Persona do bot de atendimento** (#744): toda conversa nova gasta uma
  rodada do Claude só para chamar `definir_persona`.
- **Comprador quente no chat com a loja** (#745): a loja só é chamada se o
  comprador pedir humano; quem quer fechar segue falando com o bot.
- **Motivo de devolução** (#746): motivo fora de `motivosDisponiveis` é
  descartado por `motivoSugeridoValido` e o comprador preenche sozinho.

Os pontos que geram texto ou calculam número (curadoria, promoções, venda
futura, compra coletiva, prompt de imagem) ficam no Claude: o Jev não gera
texto nem faz conta.

## What Changes

- **Cliente Jev robusto** (#743, implementado neste change): retry com backoff
  em 429 e 529 (respeita `Retry-After`, máximo 2 retries), modelo travado em
  `jev-1.13.0`, e a resposta passa a expor o `confidence` da API. Lead scoring
  usa esse confidence; `confiancaChoice` sai.
- **Persona na 1ª mensagem** (#744, próximo): Choice sobre
  `consumidor | seller | motorista | afiliado`, com gate de confidence e
  fallback no fluxo atual.
- **Aviso de comprador quente** (#745, próximo): reusa a pergunta de score;
  WhatsApp à loja uma vez por conversa.
- **Motivo de devolução** (#746, próximo): Choice sobre
  `motivosDisponiveis(perecivel)`.

## What does NOT change

- O resumo do lead, a curadoria de descrição e preço, promoções, venda futura
  e compra coletiva continuam no Claude.
- Nenhuma decisão do Jev grava sozinha em fluxo de dinheiro: taxonomia é
  confirmada pelo seller, score e persona têm fallback, motivo só pré-preenche.
- Os limiares (0,5 e 0,75) não mudam neste change; a calibração com dados
  reais é tarefa separada.

## Impact

- `src/lib/catalogo-compra/jev-taxonomia.ts` (cliente), `src/lib/ai/leadScoring.ts`
- Próximos: `src/lib/ai/atendimento.ts`, `src/lib/ai/botConversa.ts`,
  `src/lib/disputas.ts` e o fluxo de devolução do bot
- Sem migration. Custo: US$0,042/Mtok de input, 1.200 req/min por chave.
