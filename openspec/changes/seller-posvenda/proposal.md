## Why

Hoje `admin_abrir_disputa` (migration `0084_admin_repasses_estorno.sql`) só grava
`pedidos.disputa_aberta_em` e um evento em `auditoria_eventos` — o seller não é
notificado, não vê que uma disputa existe, e não tem como responder ou anexar
evidência antes do admin decidir (estornar ou não via `admin_estornar_pedido`).
O admin decide às cegas, só com a palavra do comprador. Isso aumenta estorno
incorreto e atrito com o seller, que descobre o cancelamento depois de já ter
acontecido.

## What Changes

- Seller passa a ver, na área dele, as disputas abertas pelo admin nos pedidos
  da própria loja (lista + detalhe por pedido).
- Seller pode enviar uma resposta em texto e anexar evidências (imagens/PDF,
  reaproveitando o padrão de upload já usado em outras telas do seller) a uma
  disputa aberta, antes de o admin decidir.
- Admin, na tela de detalhe do pedido/disputa, passa a ver a resposta e os
  anexos do seller antes de acionar `admin_estornar_pedido`.
- Notificação ao seller quando uma disputa é aberta no pedido dele (mesmo canal
  já usado para outras notificações do seller — checar `onboarding-seller` /
  padrão existente antes de inventar um novo).
- Fora de escopo: workflow de estados da disputa (aberta/em análise/resolvida),
  reversão automática via Asaas, e abertura de disputa pelo próprio seller
  contra o comprador — nenhuma dessas regras muda.

## Capabilities

### New Capabilities
- `posvenda/seller-disputa`: resposta do seller a uma disputa aberta pelo
  admin em um pedido da própria loja — visualização, resposta com evidência e
  notificação.

### Modified Capabilities
(nenhuma — a abertura de disputa pelo admin `admin_abrir_disputa` continua com
o mesmo contrato; este change só adiciona a resposta do seller em cima dela)

## Impact

- Schema: nova tabela para respostas/anexos da disputa (ex.: `disputa_respostas`
  ou `disputa_anexos`, referenciando `pedidos.disputa_aberta_em`) e RLS nova
  restringindo leitura/escrita ao seller dono da loja do pedido — checar skill
  `rls-seguranca` e `migrations-industria24` antes de numerar a migration.
  Nomes de campo/tabela exatos ficam em `design.md`, não aqui.
- Código: `src/app/(seller)/...` nova tela ou seção de pedido para o seller;
  `src/app/(admin)/admin/pedidos` para exibir a resposta do seller antes do
  estorno; `src/components/admin/AcoesPedido.tsx` e o componente equivalente
  do seller.
- Notificação: reaproveitar `src/lib/email.ts` ou `whatsapp.ts` conforme o
  canal já usado hoje para o seller (confirmar em `design.md`).
- Sem mudança na Asaas nem em `admin_estornar_pedido`/`admin_abrir_disputa`
  existentes.
