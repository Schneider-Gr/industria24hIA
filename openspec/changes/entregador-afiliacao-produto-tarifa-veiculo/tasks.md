## 1. Entregador se afilia a produtos (PRD 054, Milestone 1)

- [ ] 1.1 Veículo em lista fixa (`moto`, `carro`, `caminhao`) em
      `parceiros_logisticos`; cadastros antigos em texto viram NULL até o
      entregador escolher. Ajustar `ConfigAfiliadoForm` e `validarConfigAfiliado`
      (teste primeiro)
- [ ] 1.2 Cadastro nasce ativo: tirar a exigência de aprovação do admin para ver
      corridas; `Suspenso` continua bloqueando
- [ ] 1.3 Painel do entregador: produtos com entrega ligada e pedir/cancelar
      afiliação em `parcerias_representante` (sem `porcentagem`; bloqueia pedido
      repetido)
- [ ] 1.4 `/seller/parceiro-logistica`: fila com veículo, peso suportado e valor
      mínimo; Aprovar, Recusar, Revogar
- [ ] 1.5 Conversão única: afiliação logística por loja → aprovação em todos os
      produtos com entrega da loja; testar com begin/rollback em prod

## 2. Seller precifica por veículo (Milestone 2)

- [ ] 2.1 Tarifa por loja × classe (tarifa mínima, R$/km) e piso por classe da
      plataforma, com trigger de piso (padrão da 0193)
- [ ] 2.2 `classeDoPeso(kg)` e `precoEntrega({ km, classe, tarifa })` =
      max(tarifa mínima, km × R$/km) em `src/lib/logistica-parceiro/`, teste
      primeiro (fronteiras 20 e 300 kg)
- [ ] 2.3 `quantidadeMinimaViavel({ precoUnit, pesoUnit, km, tarifas, limite })`
      com teste (10 maços de alface, 100 tijolos)
- [ ] 2.4 Tela de tarifas da loja
- [ ] 2.5 Avião vira liga/desliga + simulador com classe, frete, % do pedido,
      quantidade sugerida, alerta de volume e nº de entregadores aprovados

## 3. Entrega vendida pelo veículo certo (Milestone 3)

- [ ] 3.1 Cotação no checkout pela classe do peso total (cotação gravada do
      PRD 053); só aparece com todos os itens cobertos por entregador compatível
- [ ] 3.2 Despacho e `aceitar_corrida`: elegibilidade por aprovação em todos os
      itens + classe + peso + valor mínimo; primeiro que aceitar; sem
      exclusividade nem pool aberto. Partir da versão atual (0102)
- [ ] 3.3 Teste SQL begin/rollback: moto não aceita corrida de carro, caminhão
      aceita, valor mínimo alto não vê, aceite concorrente
- [ ] 3.4 Confirmação da dona antes do merge (caminho do dinheiro)
