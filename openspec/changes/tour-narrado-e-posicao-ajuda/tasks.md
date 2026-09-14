## 1. Medir antes de mover

- [ ] 1.1 Levantar a posição e o `z-index` reais do `ChatWidget` em mobile e desktop, incluindo o estado com o chat aberto
- [ ] 1.2 Definir a folga mínima entre mascote e botão de Atendimento que sobrevive às duas larguras
- [ ] 1.3 Confirmar se a tab bar mobile da vitrine chega a aparecer dentro do painel do seller

## 2. Posicionamento

- [ ] 2.1 Empilhar o mascote acima do botão de Atendimento, com a folga definida em 1.2
- [ ] 2.2 Aumentar o mascote para tamanho reconhecível, mantendo a borda de contraste
- [ ] 2.3 Verificar a 390px e a 1440px: nada cortado, nada coberto, sem rolagem horizontal
- [ ] 2.4 Verificar com o chat de Atendimento aberto

## 3. Convite

- [ ] 3.1 Redesenhar como fala do mascote: cor de marca, seta apontando para o botão, sombra
- [ ] 3.2 Botão de fechar com área de toque própria, fora do fluxo do texto
- [ ] 3.3 Trocar a persistência de `localStorage` permanente para `sessionStorage` por tela
- [ ] 3.4 Abrir o painel pelo mascote também dá o convite por atendido
- [ ] 3.5 Conferir que storage bloqueado não gera erro nem esconde o convite

## 4. Balão do tour

- [ ] 4.1 Conter o balão na viewport em todos os passos
- [ ] 4.2 Reservar a região dos botões flutuantes para que o balão nunca pouse em cima deles
- [ ] 4.3 Conferir o passo cujo alvo fica na borda inferior do menu

## 5. Narração

- [ ] 5.1 Detectar voz `pt-BR` utilizável; sem voz, não renderizar o controle
- [ ] 5.2 Controle de ouvir/parar no balão do tour, rotulado para leitor de tela
- [ ] 5.3 Cancelar a fala ao trocar de passo, ao encerrar o tour e ao desmontar o componente
- [ ] 5.4 Teste da lógica pura de seleção de voz e de decisão de exibir o controle

## 6. Verificação final

- [ ] 6.1 `npm run test`, `npm run lint`, `tsc --noEmit` e `npm run build`
- [ ] 6.2 Conferência visual no painel real, com o mesmo enquadramento do print de 14/09
- [ ] 6.3 Deploy de produção e reconferência com cache-buster
