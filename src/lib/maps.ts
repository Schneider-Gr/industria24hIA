// Google Maps Distance Matrix + link de trajeto. Server-only.
// Sem GOOGLE_MAPS_API_KEY: isMapsConfigured=false e as telas mostram
// "integração pendente" (regra do projeto: proibido mock).

const KEY = (process.env.GOOGLE_MAPS_API_KEY ?? "").replace(/^﻿/, "").trim();

export const isMapsConfigured = KEY.length > 0;

export type Trajeto = {
  distancia_m: number;
  duracao_s: number;
  link_mapa: string;
};

export function linkTrajeto(origem: string, destino: string): string {
  const o = encodeURIComponent(origem);
  const d = encodeURIComponent(destino);
  return `https://www.google.com/maps/dir/?api=1&origin=${o}&destination=${d}`;
}

export async function calcularTrajeto(
  origem: string,
  destino: string
): Promise<Trajeto | null> {
  if (!isMapsConfigured) return null;
  const url =
    `https://maps.googleapis.com/maps/api/distancematrix/json` +
    `?origins=${encodeURIComponent(origem)}&destinations=${encodeURIComponent(destino)}` +
    `&region=br&key=${KEY}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Distance Matrix falhou: HTTP ${res.status}`);
  }
  const body = (await res.json()) as {
    status: string;
    rows?: { elements?: { status: string; distance?: { value: number }; duration?: { value: number } }[] }[];
  };
  const el = body.rows?.[0]?.elements?.[0];
  if (body.status !== "OK" || !el || el.status !== "OK" || !el.distance || !el.duration) {
    return null; // rota não encontrada para o par informado
  }
  return {
    distancia_m: el.distance.value,
    duracao_s: el.duration.value,
    link_mapa: linkTrajeto(origem, destino),
  };
}
