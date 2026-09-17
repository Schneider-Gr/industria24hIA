## Why

A migração do Bubble trouxe 250 pedidos. **84 deles chegaram sem nenhuma linha
de item**: 82 em `Aguardando Pagamento` e 2 em `Pagamento Realizado`. Os dados
são de produção, medidos em 17/09/2026.

Eles foram apelidados de "pedidos fantasma" enquanto poluíam o funil, e quase
foram limpos por isso. Não são lixo:

- **79 dos 82 têm cliente, valor e cobrança no Asaas.** A soma é **R$ 49.990,60**.
- O `link_cobranca` aponta para `https://www.asaas.com/i/...`, isto é, a conta de
  **produção** do Asaas. A chave configurada hoje é de **sandbox**
  (`ASAAS_ENV=sandbox`), então essas cobranças não são consultáveis com a
  credencial atual.
- Apenas 3 não têm cliente nem valor nem cobrança, e esses sim são registros
  vazios.
- **2 pedidos constam como `Pagamento Realizado` sem nenhum item.** Esse é o caso
  grave: o marketplace registrou dinheiro recebido e não sabe dizer o que foi
  vendido.

Nenhum dos 84 tem `dt_pagamento`, repasse ou reserva de estoque, e nenhum aparece
no ledger. Ou seja, eles não seguram estoque nem contaminam a paridade: o dano
não é operacional, é contábil e de atendimento. Cancelar em massa sem consultar o
Asaas de produção transformaria uma venda possivelmente paga em pedido cancelado
sem rastro, e o comprador que pagou ficaria sem pedido e sem aviso.

O custo de não resolver é permanente: todo relatório de funil, de conversão e de
ticket médio conta 82 pedidos pendentes que nunca vão se mover, e os 2 pagos
entram como receita sem contrapartida.

## What Changes

- **Levantamento antes de qualquer escrita.** Consultar no Asaas de **produção** o
  status real das 79 cobranças e dos 2 pedidos pagos, e classificar cada pedido
  em um de três destinos, com o resultado registrado antes de mudar uma linha.
- **Três destinos, nunca um só:**
  - *não pago no Asaas* → cancelar, com motivo explícito de migração incompleta;
  - *pago no Asaas* → **não cancelar**; marcar para reconciliação manual, porque
    existe dinheiro recebido cujo conteúdo o sistema desconhece;
  - *inexistente no Asaas ou sem cobrança* → cancelar como registro vazio.
- **Cancelamento com rastro**, gravando em `auditoria_eventos` o destino, o
  status devolvido pelo Asaas e o valor, para que a decisão seja auditável depois.
- **Aviso ao comprador** dos que forem cancelados e tiverem cliente com e-mail,
  no mesmo espírito do aviso de reserva expirada: silêncio aqui vira chamado.
- **Reconstituição dos 2 pedidos pagos** a partir do que o Bubble ainda tiver, ou
  registro formal de que o conteúdo é desconhecido, com decisão da dona sobre
  estorno.
- **Trava contra repetição**: o marketplace passa a recusar pedido sem item, para
  que nenhuma importação futura crie o mesmo estado.

## Non-goals

- Não trata das 32 cobranças **sandbox** dos pedidos cancelados pela expiração da
  0177 em 16/09. Aquilo é outra conta do Asaas e já tem script próprio.
- Não trata das demais pendências do fulfillment (validação do checkout ponta a
  ponta pelo app, reserva que só expira em `Aguardando Pagamento`, posições do CD,
  conferência diária de paridade). Cada uma é autossuficiente e não depende desta.
- Não reescreve a importação do Bubble. A importação acabou; o que fica é a trava
  que impede o estado inválido de nascer de novo.

## Blocked on

Credencial do Asaas de **produção**, somente leitura se possível. Sem ela o
levantamento não acontece, e sem o levantamento nenhuma linha deve ser escrita.
