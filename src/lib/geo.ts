// Trajeto (distância + duração + link de mapa) via Google Routes API.
// Server-only: a chave nunca sai daqui.
//
// Substitui src/lib/maps.ts (Distance Matrix, Legacy desde 01/03/2025), que
// devolvia null tanto para "sem chave" quanto para "sem rota" — a UI não
// conseguia cumprir a regra do CLAUDE.md de mostrar "integração pendente" em
// vez de número plausível. Agora o erro é dado, não exceção.
//
// Fase 1 do escopo em docs/prd/roteirizacao-escopo-modulo-geo.md.

// ponytail: aceita os dois nomes - a variavel no projeto Vercel entrou como
// GOOGLE_MAPS_API. Unificar num env add depois; ate la o codigo nao quebra.
//
// Fica com a primeira chave que tem conteudo, nao com a primeira que existe.
// Com `??`, uma GOOGLE_MAPS_API_KEY definida e vazia mascarava a
// GOOGLE_MAPS_API boa — foi exatamente o que derrubou a localizacao
// automatica em producao (08/09), enquanto o preview, que so tem a segunda,
// funcionava.
const KEY =
  [process.env.GOOGLE_MAPS_API_KEY, process.env.GOOGLE_MAPS_API]
    .map((v) => (v ?? "").replace(/^﻿/, "").trim())
    .find((v) => v.length > 0) ?? "";

export const isGeoConfigurado = KEY.length > 0;

/** O provedor falhava em silêncio: qualquer status != OK virava
 *  "provedor_indisponivel" e a causa (chave inválida, API não habilitada,
 *  billing, restrição) morria aqui. Agora vai para o log do servidor, que é
 *  onde o diagnóstico pode ser feito sem adivinhação. */
function logaFalhaGoogle(onde: string, status: string | undefined, mensagem: string | undefined) {
  console.error(`[geo] ${onde} falhou: status=${status ?? "?"} ${mensagem ?? ""}`.trim());
}

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

/** Debita uma chamada do teto do dia. false = teto estourado. Compartilhado
 *  por Routes e Geocoding: a cota é da chave, não do endpoint. */
function consomeCota(): boolean {
  const hoje = new Date().toISOString().slice(0, 10);
  if (hoje !== dia) {
    dia = hoje;
    chamadas = 0;
  }
  if (chamadas >= TETO_DIA) return false;
  chamadas++;
  return true;
}

/** Distância e duração entre dois pontos. Aceita CEP, endereço completo ou
 *  "lat,lng" — a Routes API resolve os três como endereço, com regionCode BR.
 *  NUNCA lança por causa do provedor: erro HTTP vira { ok: false }. */
export async function calcularTrajeto(origem: string, destino: string): Promise<Resultado> {
  if (!isGeoConfigurado) return { ok: false, erro: "nao_configurado" };

  if (!consomeCota()) return { ok: false, erro: "teto_de_custo" };

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

// ---------------------------------------------------------------------------
// Coordenadas: CEP → lat/lng (Geocoding API) e distância em linha reta.
// Usado pelo filtro de raio da vitrine (PRD 026). A Routes API acima é precisa
// mas custa uma chamada por par origem/destino — inviável num laço de dezenas
// de produtos por render. Aqui a chamada paga acontece só na fronteira
// CEP → coordenada, e o resultado é cacheado em `ceps_geo` (src/lib/ceps-geo.ts).

export type Coordenada = { lat: number; lon: number };

export type ErroGeo = "nao_configurado" | "sem_resultado" | "teto_de_custo" | "provedor_indisponivel";

export type ResultadoCoordenada =
  | { ok: true; valor: Coordenada }
  | { ok: false; erro: ErroGeo };

/** Distância em linha reta (haversine), em km. Pura: sem rede, sem chave. */
export function distanciaKm(a: Coordenada, b: Coordenada): number {
  const R = 6371; // raio médio da Terra em km
  const rad = (g: number) => (g * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Coordenada de um CEP brasileiro. NUNCA lança: erro do provedor vira
 *  { ok: false }, e quem chama trata como "sem coordenada" (produto visível). */
export async function geocodificarCep(cep: string): Promise<ResultadoCoordenada> {
  if (!isGeoConfigurado) return { ok: false, erro: "nao_configurado" };

  const limpo = cep.replace(/\D/g, "");
  if (limpo.length !== 8) return { ok: false, erro: "sem_resultado" };

  if (!consomeCota()) return { ok: false, erro: "teto_de_custo" };

  try {
    const url =
      "https://maps.googleapis.com/maps/api/geocode/json" +
      `?components=postal_code:${limpo}|country:BR&key=${encodeURIComponent(KEY)}`;
    const res = await fetch(url);
    if (!res.ok) return { ok: false, erro: "provedor_indisponivel" };

    const body = (await res.json()) as {
      status?: string;
      error_message?: string;
      results?: { geometry?: { location?: { lat?: number; lng?: number } } }[];
    };
    // ZERO_RESULTS é resposta legítima (CEP inexistente), não falha de provedor.
    if (body.status === "ZERO_RESULTS") return { ok: false, erro: "sem_resultado" };
    if (body.status !== "OK") {
      logaFalhaGoogle("geocodificarCep", body.status, body.error_message);
      return { ok: false, erro: "provedor_indisponivel" };
    }

    const loc = body.results?.[0]?.geometry?.location;
    if (typeof loc?.lat !== "number" || typeof loc?.lng !== "number") {
      return { ok: false, erro: "sem_resultado" };
    }
    return { ok: true, valor: { lat: loc.lat, lon: loc.lng } };
  } catch {
    return { ok: false, erro: "provedor_indisponivel" };
  }
}

/** Reverse geocoding: lat/lng do navegador → CEP + cidade/UF, para o banner de
 *  "usar minha localização". Sem CEP no resultado o endereço ainda serve para
 *  exibir a cidade, então o campo vem opcional. */
export type EnderecoAproximado = { cep: string; cidade: string; uf: string };

export async function enderecoDaCoordenada(
  ponto: Coordenada,
): Promise<{ ok: true; valor: EnderecoAproximado } | { ok: false; erro: ErroGeo }> {
  if (!isGeoConfigurado) return { ok: false, erro: "nao_configurado" };
  if (!consomeCota()) return { ok: false, erro: "teto_de_custo" };

  try {
    // Sem `result_type=postal_code`: esse filtro fazia o Google devolver
    // ZERO_RESULTS em qualquer ponto sem CEP indexado, mesmo quando ele sabia a
    // cidade. Agora pedimos o resultado normal e procuramos o CEP em todos eles.
    const url =
      "https://maps.googleapis.com/maps/api/geocode/json" +
      `?latlng=${ponto.lat},${ponto.lon}&language=pt-BR&key=${encodeURIComponent(KEY)}`;
    const res = await fetch(url);
    if (!res.ok) {
      logaFalhaGoogle("enderecoDaCoordenada", `HTTP ${res.status}`, undefined);
      return { ok: false, erro: "provedor_indisponivel" };
    }

    const body = (await res.json()) as {
      status?: string;
      error_message?: string;
      results?: {
        address_components?: { short_name?: string; long_name?: string; types?: string[] }[];
      }[];
    };
    if (body.status === "ZERO_RESULTS") return { ok: false, erro: "sem_resultado" };
    if (body.status !== "OK") {
      logaFalhaGoogle("enderecoDaCoordenada", body.status, body.error_message);
      return { ok: false, erro: "provedor_indisponivel" };
    }

    const acha = (
      comps: { long_name?: string; short_name?: string; types?: string[] }[],
      tipo: string,
    ) => comps.find((c) => c.types?.includes(tipo));

    // O CEP costuma aparecer só nos resultados mais específicos; cidade/UF, em
    // qualquer um. Varre todos e fica com a primeira ocorrência de cada.
    let cep = "";
    let cidade = "";
    let uf = "";
    for (const r of body.results ?? []) {
      const comps = r.address_components ?? [];
      if (!cep) cep = (acha(comps, "postal_code")?.long_name ?? "").replace(/\D/g, "");
      if (!cidade)
        cidade =
          acha(comps, "administrative_area_level_2")?.long_name ??
          acha(comps, "locality")?.long_name ??
          "";
      if (!uf) uf = acha(comps, "administrative_area_level_1")?.short_name ?? "";
      if (cep.length === 8 && cidade && uf) break;
    }
    if (cep.length !== 8) return { ok: false, erro: "sem_resultado" };

    return { ok: true, valor: { cep, cidade, uf } };
  } catch (e) {
    logaFalhaGoogle("enderecoDaCoordenada", "excecao", String(e));
    return { ok: false, erro: "provedor_indisponivel" };
  }
}
