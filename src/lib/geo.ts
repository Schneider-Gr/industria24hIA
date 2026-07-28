// Trajeto (distância + duração + link de mapa) via Google Routes API.
// Server-only: a chave nunca sai daqui.
//
// Substitui src/lib/maps.ts (Distance Matrix, Legacy desde 01/03/2025), que
// devolvia null tanto para "sem chave" quanto para "sem rota" — a UI não
// conseguia cumprir a regra do CLAUDE.md de mostrar "integração pendente" em
// vez de número plausível. Agora o erro é dado, não exceção.
//
// Fase 1 do escopo em docs/prd/roteirizacao-escopo-modulo-geo.md.

const KEY = (process.env.GOOGLE_MAPS_API_KEY ?? "").replace(/^﻿/, "").trim();

export const isGeoConfigurado = KEY.length > 0;

export type Trajeto = {
  distancia_m: number;
  duracao_s: number;
  link_mapa: string;
};

export type Resultado =
  | { ok: true; valor: Trajeto }
  | { ok: false; erro: "nao_configurado" | "sem_rota" | "teto_de_custo" | "provedor_indisponivel" };

/** Link do Google Maps. Puro, sem rede, sem chave: sempre funciona, inclusive
 *  com a integração pendente. Aceita CEP, endereço ou "lat,lng". */
export function linkTrajeto(origem: string, destino: string): string {
  const o = encodeURIComponent(origem);
  const d = encodeURIComponent(destino);
  return `https://www.google.com/maps/dir/?api=1&origin=${o}&destination=${d}`;
}

// ponytail: teto de custo em memória, por instância. Serverless reinicia e
// zera, então é um freio contra loop, não uma cota exata. Contador em tabela
// quando o gasto real justificar (fase 2 do escopo).
const TETO_DIA = Number(process.env.GEO_MAX_CHAMADAS_DIA ?? 5000);
let dia = "";
let chamadas = 0;

/** Distância e duração entre dois pontos. Aceita CEP, endereço completo ou
 *  "lat,lng" — a Routes API resolve os três como endereço, com regionCode BR.
 *  NUNCA lança por causa do provedor: erro HTTP vira { ok: false }. */
export async function calcularTrajeto(origem: string, destino: string): Promise<Resultado> {
  if (!isGeoConfigurado) return { ok: false, erro: "nao_configurado" };

  const hoje = new Date().toISOString().slice(0, 10);
  if (hoje !== dia) {
    dia = hoje;
    chamadas = 0;
  }
  if (chamadas >= TETO_DIA) return { ok: false, erro: "teto_de_custo" };
  chamadas++;

  try {
    const res = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": KEY,
        "X-Goog-FieldMask": "routes.distanceMeters,routes.duration",
      },
      body: JSON.stringify({
        origin: { address: origem },
        destination: { address: destino },
        travelMode: "DRIVE",
        regionCode: "BR",
        languageCode: "pt-BR",
      }),
    });
    if (!res.ok) return { ok: false, erro: "provedor_indisponivel" };

    const body = (await res.json()) as { routes?: { distanceMeters?: number; duration?: string }[] };
    const rota = body.routes?.[0];
    if (!rota?.distanceMeters || !rota.duration) return { ok: false, erro: "sem_rota" };

    return {
      ok: true,
      valor: {
        distancia_m: rota.distanceMeters,
        duracao_s: parseInt(rota.duration, 10), // a API devolve "1234s"
        link_mapa: linkTrajeto(origem, destino),
      },
    };
  } catch {
    return { ok: false, erro: "provedor_indisponivel" };
  }
}
