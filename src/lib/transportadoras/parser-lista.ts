// Upload 1: cadastro em massa de transportadoras (nome/fonte/prazo). Parser
// síncrono simples — reporta linhas rejeitadas sem travar as válidas.

const FONTES_VALIDAS = ["interna", "mercado_envios", "uber_direct", "tabela_importada"] as const;
export type FonteTransportadora = (typeof FONTES_VALIDAS)[number];

export type LinhaTransportadoraBruta = {
  nome?: string;
  fonte?: string;
  prazo_dias?: string;
};

export type TransportadoraValida = {
  nome: string;
  fonte: FonteTransportadora;
  prazoDias: number | null;
};

export type LinhaRejeitada = { linha: LinhaTransportadoraBruta; motivo: string };

export function parseListaTransportadoras(linhas: LinhaTransportadoraBruta[]): {
  validas: TransportadoraValida[];
  rejeitadas: LinhaRejeitada[];
} {
  const validas: TransportadoraValida[] = [];
  const rejeitadas: LinhaRejeitada[] = [];

  for (const linha of linhas) {
    const nome = (linha.nome ?? "").trim();
    if (!nome) {
      rejeitadas.push({ linha, motivo: "Nome é obrigatório." });
      continue;
    }

    const fonte = (linha.fonte ?? "").trim();
    if (!FONTES_VALIDAS.includes(fonte as FonteTransportadora)) {
      rejeitadas.push({ linha, motivo: `Fonte "${fonte}" inválida (use: ${FONTES_VALIDAS.join(", ")}).` });
      continue;
    }

    const prazoStr = (linha.prazo_dias ?? "").trim();
    const prazoDias = prazoStr === "" ? null : Number(prazoStr);
    if (prazoDias !== null && (!Number.isFinite(prazoDias) || prazoDias < 0)) {
      rejeitadas.push({ linha, motivo: "Prazo (dias) inválido." });
      continue;
    }

    validas.push({ nome, fonte: fonte as FonteTransportadora, prazoDias });
  }

  return { validas, rejeitadas };
}
