## Why

Levantamento em 25/09/2026 (código + banco de produção): o mesmo papel, quem
entrega o pedido, tem **três portas e três aprovações**. O parceiro logístico é
aprovado pelo admin e pega o pool; o afiliado logístico é aprovado pelo seller
**por loja** e tem 5 min de exclusividade (`despachar_corrida_automatica`,
0102); e a parceria **por produto** (`parcerias_representante`, 0049) é aprovada
pelo seller, mas a corrida não a consulta. Em prod: 4 parceiros, 3 afiliações
por loja, 1 parceria por produto.

O preço da entrega por km (PRD 053, no ar em #776) usa R$/km **por produto** e
piso de R$ 6,00 **por loja**, sem olhar o veículo: 10 maços de alface e 100
tijolos custam o mesmo por km, embora um vá de moto e o outro exija carro.

## What Changes

Spec: `docs/prds/054-entregador-afiliacao-por-produto-e-tarifa-por-veiculo.md`.

- **Cadastro livre** do entregador; o admin só suspende. Veículo vira lista fixa
  (moto, carro, caminhão).
- **Afiliação por produto** em `parcerias_representante`, aprovada pelo seller
  um a um. Nenhuma entrega sem aprovação.
- **Tarifa por classe de veículo** da loja (tarifa mínima + R$/km), definida
  pelo seller, com piso por km da plataforma: moto R$ 6,00, carro R$ 8,00,
  caminhão R$ 20,00. Classe = menor que aguenta o
  peso total do carrinho: moto ≤ 20 kg, carro ≤ 300 kg, caminhão acima.
- Preço = `max(tarifa_minima, km × R$/km)` da classe.
- **Simulador do avião**: classe exigida, frete, % do pedido e quantidade
  mínima sugerida (frete ≤ 20% do pedido). Só sugestão.
- **Corrida**: elegível = aprovado em todos os itens + classe igual ou maior +
  peso suportado ≥ carga + valor mínimo ≤ `valor_parceiro` + não suspenso. O
  primeiro que aceitar leva. Acabam a exclusividade de 5 min e o pool aberto.
- **Três avisos da corrida** por WhatsApp: chamado aos entregadores elegíveis
  na criação, "mercadoria saiu" ao cliente na coleta e acompanhamento ao seller
  no aceite.
- **Conversão**: afiliação por loja → aprovação em todos os produtos com
  entrega da loja; parceiros sem loja pedem afiliação.

## What does NOT change

- Consumidor paga no checkout, sem ida e volta, opção paralela, cotação
  gravada, `preco_final`/`valor_parceiro` com a comissão atual (0083) e a
  devolução sem aceite em 60 min (PRD 053).
- Pagamento ao entregador fica fora: PRD próprio. O split nativo do Asaas
  executa no recebimento (docs.asaas.com, 25/09), antes de se saber quem
  entrega; o mecanismo está em decisão.

## Impact

- Migrations: tarifa por loja × classe, piso por classe, veículo em lista,
  `parcerias_representante` ligada ao aceite, conversão única.
- `despachar_corrida_automatica` e `aceitar_corrida` (caminho do dinheiro):
  confirmação da dona antes do merge.
- Deixam de ser usados: `produtos.valor_km_afiliado` e `lojas.piso_km_afiliado`
  (0193).
- Telas: `/seller/parceiro-logistica` (fila), avião em `/seller/produtos`
  (liga/desliga + simulador), tarifa da loja, painel do entregador (produtos
  disponíveis), `/afiliado/logistica/configuracoes` (veículo em lista).
