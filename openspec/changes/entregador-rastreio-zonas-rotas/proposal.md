## Why

O comprador paga, o pedido vira corrida e, a partir daí, não sabe onde a
entrega está. O pedido mais recorrente na operação é "cadê meu pedido?", e ele
cai no seller ou no WhatsApp da plataforma.

Levantamento no código em 02/10/2026 (`origin/master` `7fea549`) mostrou que a
base existe, mas está incompleta em pontos que impedem o uso real:

- **Posição existe, mas é manual e do ator errado.** `corrida_posicoes` (0039)
  guarda lat/lng, mas só recebe um ponto por clique no botão `GpsCheckin`, e a
  policy `corrida_posicoes_insert` só aceita o **parceiro logístico**
  (`parceiros_logisticos.user_id`). O **afiliado logístico**, que recebe a
  corrida pelo despacho automático (`afiliado_exclusivo_id`, 0043), não
  consegue gravar posição nenhuma.
- **O comprador não vê nada.** A policy `corrida_posicoes_read` libera só o
  solicitante da corrida e o parceiro. Não há tela de rastreio, mapa ao vivo
  nem Realtime.
- **Não existe zona de serviço.** O despacho oferece a corrida ao primeiro
  afiliado aprovado da loja, sem saber se ele atende o destino. O caso do Pão
  Italiano (partida em Guaíba-RS, frete de R$ 5.382,60 no checkout em
  30/09/2026) é o sintoma.
- **Rota com várias entregas é manual.** A consolidação de carga (0074) já
  agrupa pedidos da mesma loja e do mesmo corredor de CEP numa corrida só, mas
  o lote é montado à mão pelo admin e não tem ordem de paradas.

A confirmação da entrega **já está resolvida e continua obrigatória**: o
código de 4 dígitos do comprador (`pedido_confirmar_entrega`, 0090; via pública
0112; venda futura só com código, 0210) fecha a entrega e dispara o repasse
(0111). Esta change não mexe nisso; usa o código como fim do rastreio.

Referência de produto: o Fleetbase (github.com/fleetbase/fleetbase, AGPL-3.0,
v0.7.67 em 29/09/2026) tem rastreio ao vivo, zonas de serviço e roteirização.
**Nenhum código dele entra neste repositório**: a AGPL obrigaria abrir o código
da plataforma, e a stack (PHP/Laravel + Ember) não aproveita nada no Next.js +
Supabase. Usamos só o desenho dos conceitos.

## What Changes

- **Rastreio em tempo real**: o entregador (afiliado logístico ou parceiro)
  envia posição contínua enquanto a corrida está em `Coletada` ou `EmTransito`;
  o comprador acompanha num mapa ao vivo na página do pedido, com ETA. O
  rastreio termina quando a entrega é confirmada pelo código.
- **App instalável (PWA)** para o entregador: manifest + service worker,
  ícone na tela inicial, tela de corrida que mantém a tela ligada durante o
  trajeto. A casca nativa (Capacitor) para GPS em segundo plano fica preparada
  como fase 2.
- **Zonas de serviço**: o entregador declara os bairros/prefixos de CEP que
  atende; o despacho só oferece a corrida a quem atende o CEP de destino.
- **Rota com várias paradas**: o sistema sugere lotes de entrega a partir da
  consolidação existente (0074), ordena as paradas por API de rotas e cada
  parada fecha com o código do respectivo comprador.

## What does NOT change

- Confirmação por código de 4 dígitos, limite de 5 tentativas e repasse
  automático na confirmação (0090/0111/0112/0210).
- Regra de preço do frete (simulador, tarifa mínima × R$/km, balsa).
- Nenhum servidor novo: tudo em Vercel + Supabase (Realtime, Postgres).
- Lote com coleta em mais de uma loja fica fora (ver design, premissa P3).

## Impact

- Banco: RLS de `corrida_posicoes` (insert do afiliado, leitura do comprador),
  tabela de zonas do entregador, ordem de parada no lote, filtro de zona em
  `despachar_corrida_automatica`.
- `src/app/(afiliado)/afiliado/logistica/*`, `src/app/entregador/*`,
  `src/app/(parceiro)/parceiro/GpsCheckin.tsx` (vira envio contínuo).
- `src/app/pedido/[id]/page.tsx` (rastreio do comprador).
- `src/app/(admin)/admin/lotes/*` (sugestão de lote e ordem de paradas).
- `public/` (manifest, ícones, service worker).
- Custo variável: escritas de posição no Supabase, Maps JavaScript na tela do
  comprador, chamadas de otimização de rota.
