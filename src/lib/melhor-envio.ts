// Cotação do Melhor Envio (POST /api/v2/me/shipment/calculate), usada pelo
// simulador de frete por produto. Sem token no servidor, a integração fica
// "pendente" (nunca preço inventado). Docs: docs.melhorenvio.com.br, cálculo
// de fretes por produtos (consultadas em 25/09/2026).

const TOKEN = process.env.MELHOR_ENVIO_TOKEN ?? "";
// Sandbox: https://sandbox.melhorenvio.com.br
const BASE = process.env.MELHOR_ENVIO_URL ?? "https://melhorenvio.com.br";
// A API recusa quantidade acima de 100 com "Serviço indisponível".
export const MAX_QTD_MELHOR_ENVIO = 100;

type Servico = { name?: string; price?: string | number; error?: string; company?: { name?: string } };

export function menorPrecoMelhorEnvio(resposta: unknown): { valor: number; servico: string } | null {
  if (!Array.isArray(resposta)) return null;
  let melhor: { valor: number; servico: string } | null = null;
  for (const s of resposta as Servico[]) {
    const valor = Number(s.price);
    if (s.error || !(valor > 0)) continue;
    if (!melhor || valor < melhor.valor) melhor = { valor, servico: [s.company?.name, s.name].filter(Boolean).join(" ") };
  }
  return melhor;
}

export type CotacaoMelhorEnvio =
  | { ok: true; valor: number; servico: string }
  | { ok: false; erro: "nao_configurado" | "sem_servico" | "provedor_indisponivel" };

export async function cotarMelhorEnvio(e: {
  cepOrigem: string;
  cepDestino: string;
  produto: { alturaCm: number; larguraCm: number; comprimentoCm: number; pesoKg: number; preco: number };
  quantidade: number;
}): Promise<CotacaoMelhorEnvio> {
  if (!TOKEN) return { ok: false, erro: "nao_configurado" };
  try {
    const res = await fetch(`${BASE}/api/v2/me/shipment/calculate`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${TOKEN}`,
        "User-Agent": "Industria24 (industria24.com.br)",
      },
      body: JSON.stringify({
        from: { postal_code: e.cepOrigem.replace(/\D/g, "") },
        to: { postal_code: e.cepDestino.replace(/\D/g, "") },
        products: [
          {
            id: "simulacao",
            width: e.produto.larguraCm,
            height: e.produto.alturaCm,
            length: e.produto.comprimentoCm,
            weight: e.produto.pesoKg,
            insurance_value: Math.round(e.produto.preco * 100) / 100,
            quantity: e.quantidade,
          },
        ],
      }),
    });
    if (!res.ok) return { ok: false, erro: "provedor_indisponivel" };
    const melhor = menorPrecoMelhorEnvio(await res.json());
    return melhor ? { ok: true, ...melhor } : { ok: false, erro: "sem_servico" };
  } catch {
    return { ok: false, erro: "provedor_indisponivel" };
  }
}
