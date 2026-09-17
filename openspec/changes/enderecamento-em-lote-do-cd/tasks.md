## 1. Expansão de faixa (lógica pura)

- [x] 1.1 `expandirFaixa` e `gerarPosicoes` em `src/lib/estoque/faixa-enderecos.ts`, com teto exportado
- [x] 1.2 Teste companheiro cobrindo lista, faixa numérica, faixa de letra, mistura, faixa invertida, repetição com caixa diferente, campo vazio nomeado no erro, teto e o exemplo de 360 posições

## 2. Criação em lote no banco

- [x] 2.1 Migration `0181_estoque_enderecos_lote.sql` com `estoque_enderecos_criar_lote`, `security definer`, resolvendo a loja por dono como as funções da 0176
- [x] 2.2 `on conflict do nothing` sobre o índice único `(centro_id, codigo)`, devolvendo quantas foram criadas de fato
- [x] 2.3 Teto repetido no banco, independente da tela
- [x] 2.4 Teste em `begin; … rollback;` contra produção: 360 numa chamada, lote repetido cria zero, lote incremental cria só a rua nova, teto barra, faixa vazia recusada, centro alheio recusado, e entrada no CD funciona com a posição criada
- [x] 2.5 Controle negativo no fim do teste
- [x] 2.6 Colisão de número conferida na criação
- [ ] 2.7 Conferir colisão **de novo** imediatamente antes do push

## 3. Tela

- [x] 3.1 `LoteEnderecos` com prévia ao vivo mostrando contagem e códigos das pontas
- [x] 3.2 Botão desabilitado enquanto a expansão for inválida, com o motivo visível
- [x] 3.3 Action `criarEnderecosEmLote` usando a mesma expansão da prévia
- [x] 3.4 Resposta informa criadas e já existentes, porque repetir o lote é uso normal

## 4. Verificação

- [x] 4.1 `npm run build` verde (obrigatório: a mudança mexe em server action e componente)
- [x] 4.2 Suíte completa e lint verdes
- [ ] 4.3 Validação visual da seção no painel do seller, em largura de celular

## 5. Aplicação

- [ ] 5.1 Aplicar a 0181 em produção por `db query --linked --file` e confirmar a função no schema, já que o histórico está sob drift
- [ ] 5.2 Cadastrar a topologia real do CD de Manaus **com a dona**, que é quem conhece o galpão — o software não inventa rua, prédio, nível nem apartamento
- [ ] 5.3 Confirmar que o CD deixou de estar com zero posições e que uma entrada de teste com posição funciona
