// Regras puras do dashboard do admin: resolução da janela de período a partir
// do `?range=` e as agregações derivadas (ticket médio, taxa de conversão,
// variação vs. período anterior). Fora do componente para ter teste próprio,
// conforme a convenção do projeto (lógica de negócio em `lib/*` + `.test.ts`).

export type RangeKey = "30d" | "90d" | "mes" | "tudo";

export const RANGE_KEYS: readonly RangeKey[] = ["30d", "90d", "mes", "tudo"];

export const RANGE_LABEL: Record<RangeKey, string> = {
  "30d": "30 dias",
  "90d": "90 dias",
  mes: "Mês atual",
  tudo: "Tudo",
};

const DIA_MS = 24 * 60 * 60 * 1000;

/** Aceita só os valores conhecidos; qualquer outra coisa cai no default 30d. */
export function parseRange(raw: string | undefined | null): RangeKey {
  return (RANGE_KEYS as readonly string[]).includes(raw ?? "")
    ? (raw as RangeKey)
    : "30d";
}

export type Janela = {
  /** Início da janela, ISO, inclusivo. */
  desde: string;
  /** Fim da janela (= agora), ISO, exclusivo. */
  ate: string;
  /** Início da janela anterior de mesma duração; null quando não comparável. */
  desdeAnterior: string | null;
  /** Fim da janela anterior (= `desde`); null quando não comparável. */
  ateAnterior: string | null;
  /** `tudo` não tem período anterior definido. */
  comparavel: boolean;
};

export function resolverJanela(range: RangeKey, agora: Date = new Date()): Janela {
  const ate = agora.toISOString();

  if (range === "tudo") {
    return {
      desde: new Date(0).toISOString(),
      ate,
      desdeAnterior: null,
      ateAnterior: null,
      comparavel: false,
    };
  }

  if (range === "mes") {
    const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);
    const inicioMesAnterior = new Date(
      agora.getFullYear(),
      agora.getMonth() - 1,
      1,
    );
    return {
      desde: inicioMes.toISOString(),
      ate,
      desdeAnterior: inicioMesAnterior.toISOString(),
      ateAnterior: inicioMes.toISOString(),
      comparavel: true,
    };
  }

  const dias = range === "30d" ? 30 : 90;
  const desde = new Date(agora.getTime() - dias * DIA_MS);
  const desdeAnterior = new Date(desde.getTime() - dias * DIA_MS);
  return {
    desde: desde.toISOString(),
    ate,
    desdeAnterior: desdeAnterior.toISOString(),
    ateAnterior: desde.toISOString(),
    comparavel: true,
  };
}

export function ticketMedio(gmv: number, nPedidos: number): number {
  return nPedidos > 0 ? gmv / nPedidos : 0;
}

const STATUS_PAGO = "Pagamento Realizado";
const STATUS_A_RECEBER = "Aguardando Pagamento";

/** % (0..100) de pedidos que chegaram a "Pagamento Realizado". */
export function taxaConversao(
  pedidos: readonly { status_pedido: string | null }[],
): number {
  if (pedidos.length === 0) return 0;
  const pagos = pedidos.filter((p) => p.status_pedido === STATUS_PAGO).length;
  return (pagos / pedidos.length) * 100;
}

/** Σ valor_pedido dos pedidos ainda aguardando pagamento. */
export function gmvAReceber(
  pedidos: readonly { status_pedido: string | null; valor_pedido: number | null }[],
): number {
  return pedidos
    .filter((p) => p.status_pedido === STATUS_A_RECEBER)
    .reduce((s, p) => s + (p.valor_pedido ?? 0), 0);
}

export type Direcao = "up" | "down" | "flat";
export type Delta = { pct: number; direcao: Direcao };

/**
 * Variação percentual de `atual` sobre `anterior`. Retorna null quando não há
 * base de comparação (anterior 0 ou não finito) — o card então não mostra selo.
 */
export function calcularDelta(atual: number, anterior: number): Delta | null {
  if (!Number.isFinite(anterior) || anterior === 0) return null;
  const pct = ((atual - anterior) / anterior) * 100;
  const direcao: Direcao =
    Math.abs(pct) < 0.5 ? "flat" : pct > 0 ? "up" : "down";
  return { pct, direcao };
}
