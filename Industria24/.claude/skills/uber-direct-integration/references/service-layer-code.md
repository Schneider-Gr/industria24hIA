# Service layer completo — Uber Direct

## Variáveis de ambiente (Vercel)

```
UBER_DIRECT_CLIENT_ID=
UBER_DIRECT_CLIENT_SECRET=
UBER_DIRECT_CUSTOMER_ID=
UBER_DIRECT_ENV=sandbox   # ou production
```

## services/delivery/types.ts

```ts
export interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  lat?: number;
  lng?: number;
}

export interface QuoteResult {
  externalQuoteId: string;
  feeCents: number;
  currency: string;
  pickupEtaMinutes: number;
  dropoffEtaMinutes: number;
  expiresAt: string;
}

export interface DeliveryResult {
  externalDeliveryId: string;
  status: string;
  trackingUrl: string;
  feeCents: number;
}

export type RefundReason =
  | "uber_never_received_order"
  | "uber_entire_order_wrong"
  | "uber_missing_items"
  | "uber_damaged_item"
  | "uber_order_delivered_late"
  | "uber_delayed_pick_up"
  | "uber_had_to_prepare_order_again"
  | "uber_never_pick_up"
  | "uber_courier_cancelled"
  | "uber_safety_issue"
  | "uber_return_trip_issue";

export interface RefundRequest {
  deliveryId: string;
  requesterEmail: string;
  ccEmails?: string[];
  reason: RefundReason;
  itemsMissing?: string[];
  notes?: string;
  amountCents: number;  // formato e5 — ver toE5Format()
  currencyCode: string;
}

export interface RefundResult {
  code: "OK" | "PERMISSION_DENIED" | "ALREADY_EXISTS" | "INVALID_ARGUMENT" | "INTERNAL";
  message: string;
}

export interface DeliveryProvider {
  createQuote(pickup: Address, dropoff: Address): Promise<QuoteResult>;
  createDelivery(params: {
    quoteId: string;
    pickup: Address;
    dropoff: Address;
    pickupName: string;
    pickupPhone: string;
    dropoffName: string;
    dropoffPhone: string;
    manifestItems: { name: string; quantity: number }[];
  }): Promise<DeliveryResult>;
  getDelivery(externalDeliveryId: string): Promise<DeliveryResult>;
  submitRefund?(refund: RefundRequest): Promise<RefundResult>;
}

// R$ 10,99 => 1099000 (1/100000 da unidade monetária)
export function toE5Format(reais: number): number {
  return Math.round(reais * 100000);
}
```

## services/delivery/uberDirect.ts

```ts
import type { DeliveryProvider, Address, QuoteResult, DeliveryResult, RefundRequest, RefundResult } from "./types";

const AUTH_URL = "https://auth.uber.com/oauth/v2/token";
const API_BASE = "https://api.uber.com/v1";

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.token;
  }
  const res = await fetch(AUTH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.UBER_DIRECT_CLIENT_ID!,
      client_secret: process.env.UBER_DIRECT_CLIENT_SECRET!,
      grant_type: "client_credentials",
      scope: "eats.deliveries",
    }),
  });
  if (!res.ok) throw new Error(`Uber Direct auth failed: ${res.status}`);
  const data = await res.json();
  cachedToken = { token: data.access_token, expiresAt: Date.now() + (data.expires_in - 60) * 1000 };
  return cachedToken.token;
}

function formatAddress(a: Address) {
  return JSON.stringify({
    street_address: [a.street],
    city: a.city,
    state: a.state,
    zip_code: a.zipCode,
    country: a.country,
  });
}

export const uberDirectProvider: DeliveryProvider = {
  async createQuote(pickup, dropoff): Promise<QuoteResult> {
    const token = await getAccessToken();
    const customerId = process.env.UBER_DIRECT_CUSTOMER_ID!;
    const res = await fetch(`${API_BASE}/customers/${customerId}/delivery_quotes`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        pickup_address: formatAddress(pickup),
        dropoff_address: formatAddress(dropoff),
      }),
    });
    if (!res.ok) throw new Error(`Uber Direct quote failed: ${res.status}`);
    const data = await res.json();
    return {
      externalQuoteId: data.id,
      feeCents: data.fee,
      currency: data.currency_type,
      pickupEtaMinutes: data.pickup_duration,
      dropoffEtaMinutes: data.duration,
      expiresAt: data.expires,
    };
  },

  async createDelivery(params): Promise<DeliveryResult> {
    const token = await getAccessToken();
    const customerId = process.env.UBER_DIRECT_CUSTOMER_ID!;
    const res = await fetch(`${API_BASE}/customers/${customerId}/deliveries`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        quote_id: params.quoteId,
        pickup_address: formatAddress(params.pickup),
        pickup_name: params.pickupName,
        pickup_phone_number: params.pickupPhone,
        dropoff_address: formatAddress(params.dropoff),
        dropoff_name: params.dropoffName,
        dropoff_phone_number: params.dropoffPhone,
        manifest_items: params.manifestItems,
      }),
    });
    if (!res.ok) throw new Error(`Uber Direct delivery failed: ${res.status}`);
    const data = await res.json();
    return {
      externalDeliveryId: data.id,
      status: data.status,
      trackingUrl: data.tracking_url,
      feeCents: data.fee,
    };
  },

  async getDelivery(externalDeliveryId): Promise<DeliveryResult> {
    const token = await getAccessToken();
    const customerId = process.env.UBER_DIRECT_CUSTOMER_ID!;
    const res = await fetch(`${API_BASE}/customers/${customerId}/deliveries/${externalDeliveryId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`Uber Direct status fetch failed: ${res.status}`);
    const data = await res.json();
    return {
      externalDeliveryId: data.id,
      status: data.status,
      trackingUrl: data.tracking_url,
      feeCents: data.fee,
    };
  },

  async submitRefund(refund: RefundRequest): Promise<RefundResult> {
    const token = await getAccessToken();
    const customerId = process.env.UBER_DIRECT_CUSTOMER_ID!;
    const res = await fetch(`${API_BASE}/direct/${customerId}/submit_refund`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        delivery_id: refund.deliveryId,
        requester_email_id: refund.requesterEmail,
        cc_email_ids: refund.ccEmails ?? [],
        refund_reason: refund.reason,
        items_missing: refund.itemsMissing,
        notes: refund.notes,
        total_refund_amount: {
          amount: refund.amountCents,
          currency_code: refund.currencyCode,
        },
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(`Uber Direct refund failed [${data.code}]: ${data.message}`);
    }
    return { code: data.code, message: data.message };
  },
};
```

## services/delivery/index.ts

```ts
import { uberDirectProvider } from "./uberDirect";
import type { DeliveryProvider } from "./types";

export function selectProviderType(order: { categorySlug: string; totalWeightKg: number }) {
  const uberEligibleCategories = ["ofertas-relampago", "supermercado-hortifruti", "eletronicos", "cestas-assinaturas"];
  if (uberEligibleCategories.includes(order.categorySlug) && order.totalWeightKg <= 30) {
    return "UBER_DIRECT" as const;
  }
  return "TRANSPORTADORA" as const;
}

export function getProvider(type: "UBER_DIRECT"): DeliveryProvider {
  if (type === "UBER_DIRECT") return uberDirectProvider;
  throw new Error(`Provider ${type} não implementado ainda`);
}
```

## API routes (Next.js App Router — apps/web)

```
apps/web/app/api/delivery/quote/route.ts        # POST: cria cotação no checkout
apps/web/app/api/delivery/create/route.ts       # POST: cria entrega após pagamento confirmado
apps/web/app/api/webhooks/uber-direct/route.ts  # POST: recebe status updates (validar assinatura)
apps/admin/app/api/delivery/refund/route.ts     # POST: abre reembolso (admin/seller only)
```
