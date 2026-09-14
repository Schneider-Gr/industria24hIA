## Why

O botão flutuante de ajuda foi a produção (PR #614) e a dona fotografou o resultado em `/seller/pedidos` (print de 14/09/2026). Três problemas aparecem na mesma imagem, e os três são de posicionamento, não de conteúdo:

1. **Dois elementos flutuantes disputam o canto inferior direito.** O `AjudaFlutuante` está em `fixed bottom-4 right-4 z-30`; o `ChatWidget` do Atendimento está em `md:bottom-24 md:right-4` com `z-50`. O mascote fica atrás do botão amarelo e o convite sai cortado no meio da frase ("Primeira vez… que eu explico esta"). Aumentar o mascote sem separar os dois piora o atropelo.
2. **O convite não se distingue do conteúdo da página.** Ele é um retângulo branco sobre uma tabela branca, com o ✕ espremido contra o texto. Não lê como fala do mascote, lê como um erro de layout.
3. **O convite some para sempre depois da primeira leitura.** Foi decisão da entrega anterior (`seller:ajuda-convite-visto` em `localStorage`, PR #618), e na prática significa que quem dispensou uma vez, em qualquer tela, nunca mais é convidado em nenhuma outra.

Além disso, o tour é texto puro. Para um seller que opera no celular, entre uma entrega e outra, ler sete balões é um custo que a narração elimina: ele ouve enquanto olha a tela sendo apontada.

## What Changes

- **Separação dos dois flutuantes.** O mascote passa a ficar acima do botão Atendimento na mesma coluna da direita, com folga suficiente para nenhum dos dois cobrir o outro em nenhuma largura, e cresce para um tamanho em que o rosto seja reconhecível.
- **Convite com identidade de fala.** O balão ganha cor de marca, seta apontando para o mascote, espaçamento próprio e botão de fechar com área de toque adequada, em vez do retângulo branco atual.
- **Convite persistente.** O balão deixa de sumir sozinho: fica visível até o seller fechá-lo e volta na visita seguinte. Fechar silencia aquela tela enquanto durar a sessão do navegador.
- **Balão do tour contido na tela.** O balão passa a respeitar as bordas da janela e a nunca cobrir o mascote nem o botão Atendimento, em qualquer passo e em qualquer largura.
- **Narração do tour.** Cada passo pode ser ouvido em voz alta, com controle de iniciar e parar, usando a síntese de voz do próprio navegador. Sem arquivo de áudio, sem serviço externo, sem custo: mudou o texto do passo, a narração acompanha.

**Fora de escopo:**
- Voz gravada ou clonada, e qualquer TTS por API paga. Decisão da dona em 14/09/2026: a voz do navegador basta nesta rodada.
- Conteúdo novo de tour ou de manual. Esta change não escreve passo nem tópico.
- Legenda, transcrição em vídeo ou tour em áudio fora do painel.

## Capabilities

### New Capabilities
- `seller-ajuda-contextual/tour-narrado`: posicionamento dos elementos flutuantes de ajuda, comportamento do convite e narração dos passos do tour.

## Impact

- `src/components/seller/AjudaFlutuante.tsx`: posição, tamanho, estilo do convite e persistência por sessão.
- `src/components/seller/TourGuiado.tsx`: contenção do balão na viewport e controle de narração.
- `src/components/bot/ChatWidget.tsx`: só se a folga exigir um ajuste combinado; a mudança preferida é do lado da ajuda.
- Nenhuma migration, nenhum schema, nenhuma RLS, nenhum dado novo no servidor. A preferência do convite vive no navegador do seller.

## Pendências

- **Cobertura de voz em português varia por sistema.** A síntese do navegador não garante uma voz `pt-BR` instalada; em alguns Windows a leitura sai com sotaque de outra língua ou não sai. O botão precisa se esconder quando não houver voz utilizável, em vez de oferecer algo que não funciona.
- **`sessionStorage` pode estar bloqueado** (janela anônima, bloqueio de site). Nesse caso o convite reaparece a cada navegação, o que é aceitável, mas é bom confirmar com a dona antes de considerar fechado.
