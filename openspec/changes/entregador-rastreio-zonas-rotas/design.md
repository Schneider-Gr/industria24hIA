## Context

Decisões da dona no brainstorm de 02/10/2026:

| Decisão | Escolha | Estado |
|---|---|---|
| Dor principal | Comprador sem saber onde está a entrega → rastreio em tempo real | Decidido |
| Confirmação | Código do comprador, obrigatório para entregar | Decidido (já existe) |
| Formato do app | App ou PWA | Decidido |
| Infraestrutura | Mesmo servidor (Vercel + Supabase, sem stack nova) | Decidido |
| Escopo | Rastreio + zonas de serviço + várias entregas na mesma rota com roteirização | Decidido |
| Fleetbase | Só referência de conceito, nenhum código (AGPL-3.0) | Verificado 02/10/2026 (GitHub API) |

## Premissas inferidas (confirmar antes do apply)

As três perguntas abaixo ficaram sem resposta. A spec segue a recomendação; se
a dona discordar, muda o que está indicado.

- **P1. Rastreio em segundo plano.** Fase 1 = PWA, que só envia posição com a
  tela do entregador ligada (Wake Lock + aviso na tela). Fase 2 = casca
  Capacitor com plugin de geolocalização em segundo plano, publicada nas lojas.
  *Se a dona quiser loja de apps já na fase 1:* entra conta Apple (US$ 99/ano),
  revisão de "location always" e o grupo 6 das tasks sobe para antes do 2.
- **P2. Quem define a zona.** O próprio entregador, no cadastro e em
  `/afiliado/logistica/configuracoes`; unidade = bairro de Manaus ou prefixo de
  CEP de 5 dígitos. *Se for a loja/admin:* a tela muda de dono e a RLS de
  escrita vira do admin/seller.
- **P3. Lote multi-loja.** Fora. Lote = uma loja (uma coleta), como na 0074.
  *Se precisar de várias coletas:* a otimização passa a ter coletas e entregas
  com precedência, e o repasse por parada precisa separar por loja.

## Decisions

### D1. Posição contínua em `corrida_posicoes`, Realtime para o comprador

`navigator.geolocation.watchPosition` na tela da corrida, com envio limitado a
um ponto a cada 20 s **ou** 50 m de deslocamento, o que vier primeiro, e só nos
status `Coletada`/`EmTransito`. O comprador assina via Supabase Realtime
(`postgres_changes` em `corrida_posicoes` filtrado por `corrida_id`), que
respeita RLS. Sem tabela nova.

Alternativa descartada: Realtime Broadcast sem gravar. Mais barato, mas perde o
histórico do trajeto, que serve de evidência em disputa (PRD 048).

Ceiling: ~180 linhas por hora de corrida. `ponytail:` sem expurgo na fase 1;
expurgar posições de corridas entregues há mais de 90 dias quando o volume
justificar.

### D2. RLS

- Insert: parceiro da corrida (como hoje) **ou** usuário igual a
  `corridas.afiliado_exclusivo_id`, nos mesmos status.
- Leitura: solicitante e parceiro (como hoje) **ou** comprador do pedido
  vinculado (`pedidos.cliente_id` via `corridas.pedido_id`), **ou** comprador
  de qualquer pedido do lote quando a corrida é de consolidação.
- O comprador vê posição só enquanto a corrida não está `Entregue`/`Cancelada`
  (privacidade do entregador depois da entrega).

### D3. PWA

`public/manifest.webmanifest`, ícones e service worker mínimo (cache do shell
da tela do entregador, sem cache de dados). `start_url` =
`/afiliado/logistica`. Sem biblioteca de PWA: Next.js serve o manifest pela
rota de metadata. Wake Lock API na tela da corrida em trânsito, com fallback
de aviso "mantenha a tela ligada" quando o navegador não suportar.

### D4. Zonas sem PostGIS

Tabela `entregador_zonas (user_id, tipo 'bairro'|'cep_prefixo', valor)`.
Filtro no despacho: o CEP de destino casa por prefixo, ou o bairro do endereço
de entrega casa por nome normalizado. Raio em volta de um ponto foi
descartado: em Manaus atravessa o Rio Negro e inclui destinos que dependem de
balsa. Polígono desenhado no mapa fica para quando bairros/CEP não bastarem.

Entregador **sem zona cadastrada** continua recebendo como hoje (não quebra
quem já está ativo); a tela passa a pedir a zona.

### D5. Rota: evoluir a consolidação 0074

- Sugestão automática de lote: pedidos pagos com `frete_consolidado`, mesma
  loja, destino na mesma zona, dentro de uma janela configurável. O admin
  aprova (v1 continua assistida).
- Ordem das paradas por API de rotas do Google, gravada em
  `lote_paradas (lote_id, pedido_id, ordem, eta)`.
- Cada parada fecha com `pedido_confirmar_entrega` do respectivo pedido; a
  corrida do lote só vira `Entregue` quando todas as paradas fecharem ou forem
  marcadas como falha.
- O comprador vê "você é a N-ésima entrega" e o ETA da sua parada.

**A verificar antes do apply:** limite de paradas por chamada e preço da
otimização de waypoints na Routes API (memória do modelo diz ~25 paradas,
não usar sem conferir na doc oficial).

## Risks / Trade-offs

- **[PWA congela com tela desligada]** → aviso visível ao entregador, Wake
  Lock, e o comprador vê "última posição há X min" em vez de um ponto parado
  fingindo ser ao vivo. Fase 2 (Capacitor) resolve de vez.
- **[Privacidade do entregador]** → posição só é gravada em corrida ativa e só
  é visível ao comprador até a entrega.
- **[Custo de Maps no comprador]** → carregar o mapa só quando a corrida está
  em trânsito; antes disso, só o status em texto.
- **[Zona mal cadastrada esconde corrida]** → entregador sem zona recebe tudo;
  despacho sem nenhum entregador na zona cai no pool aberto, como hoje.
- **[Bateria]** → limitação de 20 s/50 m e parada automática fora de
  `Coletada`/`EmTransito`.
