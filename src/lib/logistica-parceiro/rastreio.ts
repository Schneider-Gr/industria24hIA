// Rastreio em tempo real da corrida (OpenSpec entregador-rastreio-zonas-rotas,
// grupos 2 e 3). Regras puras, usadas pelo navegador do entregador (o que e
// quando enviar) e pelo do comprador (se o ponto ainda é "ao vivo").
// Quem pode gravar e ler é decidido pela RLS da 0212, não aqui.

import { distanciaKm } from "@/lib/geo";

const STATUS_RASTREAVEIS = new Set(["Coletada", "EmTransito"]);
const INTERVALO_MIN_MS = 20_000;
const DESLOCAMENTO_MIN_KM = 0.05;
const AO_VIVO_MAX_MIN = 3;

export type PontoGps = { lat: number; lng: number; em: number };

/** Mesma regra da policy `pode_gravar_posicao_corrida`: fora disso o banco recusa. */
export function rastreavel(status: string | null | undefined): boolean {
  return STATUS_RASTREAVEIS.has(status ?? "");
}

/** Um ponto a cada 20 s ou a cada 50 m, o que vier primeiro (bateria e escrita no banco). */
export function deveEnviarPosicao(ultimo: PontoGps | null, atual: PontoGps): boolean {
  if (!ultimo) return true;
  if (atual.em - ultimo.em >= INTERVALO_MIN_MS) return true;
  const km = distanciaKm({ lat: ultimo.lat, lon: ultimo.lng }, { lat: atual.lat, lon: atual.lng });
  return km >= DESLOCAMENTO_MIN_KM;
}

export function minutosDesde(iso: string, agora: number): number {
  return Math.floor((agora - new Date(iso).getTime()) / 60_000);
}

/** Abaixo de 3 min o ponto é mostrado como ao vivo; acima, com a idade dele. */
export function estaAoVivo(iso: string, agora: number): boolean {
  return agora - new Date(iso).getTime() < AO_VIVO_MAX_MIN * 60_000;
}

export function textoUltimaAtualizacao(iso: string, agora: number): string {
  return estaAoVivo(iso, agora) ? "Ao vivo" : `Última atualização há ${minutosDesde(iso, agora)} min`;
}
