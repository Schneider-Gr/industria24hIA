# Schema Prisma — Delivery

```prisma
enum DeliveryProviderType {
  UBER_DIRECT
  TRANSPORTADORA
  RETIRADA_LOJA
}

enum DeliveryStatus {
  PENDING
  QUOTED
  CREATED
  PICKUP_ETA
  PICKED_UP
  DROPOFF_ETA
  DELIVERED
  CANCELED
  FAILED
}

model DeliveryQuote {
  id                String   @id @default(cuid())
  orderId           String
  order             Order    @relation(fields: [orderId], references: [id])
  provider          DeliveryProviderType
  externalQuoteId   String?  // id da cotação no Uber Direct (dqt_...)
  feeCents          Int
  currency          String   @default("BRL")
  pickupEta         DateTime?
  dropoffEta        DateTime?
  expiresAt         DateTime?
  createdAt         DateTime @default(now())
}

model Delivery {
  id                String   @id @default(cuid())
  orderId           String   @unique
  order             Order    @relation(fields: [orderId], references: [id])
  provider          DeliveryProviderType
  externalDeliveryId String?  // id da entrega no Uber Direct (del_...)
  status            DeliveryStatus @default(PENDING)
  trackingUrl       String?
  pickupAddress     Json
  dropoffAddress    Json
  feeCents          Int?
  courierName       String?
  courierPhone      String?
  lastWebhookAt     DateTime?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}
```

⚠️ Sempre confirmar o nome real do model `Order` no schema Prisma atual do projeto antes de aplicar a migration — os nomes de relacionamento aqui são placeholder até validação contra o schema real.

Se o volume de reembolsos justificar histórico/auditoria separado, considerar uma tabela `DeliveryRefundLog` em vez de sobrescrever campos em `Delivery` — decisão fica para quando houver volume real de dados para avaliar.
