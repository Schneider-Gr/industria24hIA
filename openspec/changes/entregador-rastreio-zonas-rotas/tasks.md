## 0. Antes do apply

- [x] 0.1 Dona confirma as premissas P1, P2 e P3 do `design.md` (05/10/2026)
- [ ] 0.2 Conferir na doc oficial do Google o limite de paradas e o preço da
      otimização de waypoints (Routes API) e o suporte a Wake Lock no Safari/iOS
- [ ] 0.3 Checar colisão de número de migration em todas as branches antes de
      criar cada uma e de novo antes do push

## 1. Banco: RLS do rastreio

- [ ] 1.1 Migration: `corrida_posicoes_insert` aceita também
      `corridas.afiliado_exclusivo_id = auth.uid()` em `Coletada`/`EmTransito`
- [ ] 1.2 Migration: `corrida_posicoes_read` aceita também o comprador do pedido
      vinculado (e de pedidos do lote), só enquanto a corrida não está
      `Entregue`/`Cancelada`
- [ ] 1.3 Habilitar `corrida_posicoes` na publicação do Realtime
- [ ] 1.4 Testar em `begin … rollback` com afiliado, parceiro, comprador e
      terceiro, conferindo insert e select de cada um

## 2. Rastreio do entregador

- [ ] 2.1 Componente de envio contínuo (`watchPosition`, 20 s ou 50 m, só em
      `Coletada`/`EmTransito`), substituindo o clique do `GpsCheckin`
- [ ] 2.2 Ligar na tela de corrida de `/afiliado/logistica` e de `/entregador`
- [ ] 2.3 Avisos de GPS negado e de tela desligada
- [ ] 2.4 Teste unitário da regra de limitação (tempo/distância) e do corte por
      status

## 3. Rastreio do comprador

- [ ] 3.1 Bloco de rastreio em `src/app/pedido/[id]/page.tsx`: texto em
      `Publicada`/`Aceita`, mapa só em `EmTransito`
- [ ] 3.2 Assinatura Realtime filtrada por `corrida_id`; "última atualização há
      N min" acima de 3 minutos
- [ ] 3.3 ETA a partir da última posição (Distance Matrix já usado em
      `src/lib/maps.ts`), com cache para não chamar a cada ponto
- [ ] 3.4 Encerrar o rastreio na confirmação por código

## 4. PWA do entregador

- [ ] 4.1 Manifest pela rota de metadata do Next.js, ícones, `start_url`
      `/afiliado/logistica`
- [ ] 4.2 Service worker mínimo (shell da área logística, sem cache de dados) e
      conferência de que a CSP com nonce continua válida
- [ ] 4.3 Wake Lock na corrida em trânsito com fallback de aviso

## 5. Zonas de serviço

- [ ] 5.1 Migration `entregador_zonas` com RLS (dono escreve, admin lê) e
      validação de prefixo de 5 dígitos
- [ ] 5.2 Tela de zona em `/afiliado/logistica/configuracoes` (bairros de
      Manaus + prefixos)
- [ ] 5.3 Filtro de zona em `despachar_corrida_automatica`, preservando quem não
      tem zona; testar em `begin … rollback`
- [ ] 5.4 Checkout esconde parceiro local sem cobertura no CEP de destino

## 6. Rota com várias paradas

- [ ] 6.1 Migration `lote_paradas (lote_id, pedido_id, ordem, eta, status)`
- [ ] 6.2 Sugestão automática de lote em `/admin/lotes` (mesma loja, mesma zona,
      janela configurável)
- [ ] 6.3 Otimização da ordem pela API de rotas, com fallback para ordem de
      chegada e divisão acima do limite de paradas
- [ ] 6.4 Tela do entregador com parada atual, código por parada e falha de
      entrega
- [ ] 6.5 Corrida do lote vira `Entregue` só com todas as paradas resolvidas
- [ ] 6.6 Comprador vê "faltam N entregas antes da sua" sem dados dos outros

## 7. Fase 2: casca nativa (fora deste apply, salvo decisão P1)

- [ ] 7.1 Capacitor em volta do PWA com plugin de geolocalização em segundo
      plano
- [ ] 7.2 Publicação Android e iOS

## 8. Verificação

- [ ] 8.1 `tsc`, `eslint`, `next build` e testes unitários verdes
- [ ] 8.2 E2E: pedido pago → corrida → afiliado em trânsito → comprador vê o
      ponto se mover → código confirma → rastreio some
- [ ] 8.3 Conferir em produção após o deploy
