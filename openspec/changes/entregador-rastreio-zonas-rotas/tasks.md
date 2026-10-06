## 0. Antes do apply

- [x] 0.1 Dona confirma as premissas P1, P2 e P3 do `design.md` (05/10/2026)
- [x] 0.2 Doc oficial do Google conferida em 06/10/2026: até 25 waypoints
      intermediários por `computeRoutes`; `optimizeWaypointOrder` não aceita
      `via` nem `TRAFFIC_AWARE_OPTIMAL`; cobrança no SKU Compute Routes Pro
      (5.000 chamadas grátis por mês, depois US$ 10 por mil). Wake Lock no
      Safari/iOS: não conferido na doc, o fallback de aviso cobre
- [x] 0.3 Checar colisão de número de migration em todas as branches antes de
      criar cada uma e de novo antes do push

## 1. Banco: RLS do rastreio

- [x] 1.1 Migration: `corrida_posicoes_insert` aceita também
      `corridas.afiliado_exclusivo_id = auth.uid()` em `Coletada`/`EmTransito`
- [x] 1.2 Migration: `corrida_posicoes_read` aceita também o comprador do pedido
      vinculado (e de pedidos do lote), só enquanto a corrida não está
      `Entregue`/`Cancelada`
- [x] 1.3 Habilitar `corrida_posicoes` na publicação do Realtime
- [x] 1.4 Testar em `begin … rollback` com afiliado, parceiro, comprador e
      terceiro, conferindo insert e select de cada um

## 2. Rastreio do entregador

- [x] 2.1 Componente de envio contínuo (`watchPosition`, 20 s ou 50 m, só em
      `Coletada`/`EmTransito`), substituindo o clique do `GpsCheckin`
- [x] 2.2 Ligar na tela de corrida de `/afiliado/logistica` e de `/parceiro`
      (`/entregador` é confirmação pública sem login: não há usuário que a RLS
      autorize a gravar, ver D2.1)
- [x] 2.3 Avisos de GPS negado e de tela desligada
- [x] 2.4 Teste unitário da regra de limitação (tempo/distância) e do corte por
      status

## 3. Rastreio do comprador

- [x] 3.1 Bloco de rastreio em `src/app/pedido/[id]/page.tsx`: texto em
      `Publicada`/`Aceita`, mapa a partir do primeiro ponto (`Coletada`/`EmTransito`)
- [x] 3.2 Assinatura Realtime filtrada por `corrida_id`; "última atualização há
      N min" acima de 3 minutos
- [x] 3.3 ETA a partir da última posição (`calcularTrajeto`, Routes API de
      `src/lib/geo.ts`), no máximo a cada 2 min por tela + rate-limit
- [x] 3.4 Encerrar o rastreio na confirmação por código

## 4. PWA do entregador

- [x] 4.1 Manifest estático por papel (`entregador-afiliado` e
      `entregador-parceiro`), ícones 192/512, ligado só em `/afiliado/logistica`
      e `/parceiro` por `metadata.manifest`
- [x] 4.2 ~~Service worker mínimo~~ descartado: instalação não exige offline
      e a tela depende de rede (D3). CSP: `default-src 'self'` cobre o manifest
- [x] 4.3 Wake Lock na corrida em trânsito com fallback de aviso

## 5. Zonas de serviço

- [x] 5.1 Migration 0214 `entregador_zonas` com RLS (dono e admin leem; a
      escrita passa pela `entregador_zonas_salvar`) e validação de prefixo de 5
      dígitos. Testada em `begin … rollback` (23 casos) e aplicada em 06/10/2026
- [x] 5.2 Tela de zona em `/afiliado/logistica/configuracoes` (64 bairros
      oficiais de Manaus + prefixos) e aviso em `/afiliado/logistica` para quem
      ainda não cadastrou
- [x] 5.3 Filtro de zona em `despachar_corrida_automatica`, preservando quem não
      tem zona; testado em `begin … rollback`
- [x] 5.4 Checkout esconde parceiro local sem cobertura no destino
      (`loja_tem_entregador_para` em `cotarEntregaParceiroLocal`)

## 6. Rota com várias paradas

- [x] 6.1 Migration 0215: a parada fica em `lote_pedidos` (`ordem`,
      `chegada_s`, `endereco`), sem tabela `lote_paradas` nova. Status por
      parada entra com o 6.4. Testada em `begin … rollback` (16 casos)
- [x] 6.2 Sugestão de lote em `/admin/lotes` (mesma loja, mesma zona de
      entregador; sem zona que cubra, corredor de CEP). Sem janela de tempo:
      todo pedido pago e consolidado sem lote entra na sugestão
- [x] 6.3 Ordem das paradas pela Routes API (`otimizarParadas`), com fallback
      para ordem de chegada e divisão acima de 25 paradas
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
