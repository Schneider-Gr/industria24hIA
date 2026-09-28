// Alerta em pop-up no painel do seller: o que chegou do comprador e pede
// resposta (cotação de frete, disputa, mensagem). Regras puras aqui; a busca
// fica em alertas-actions.ts e a tela em AlertasPopup.tsx.

export type TipoAlerta = "cotacao" | "disputa" | "mensagem";

export type Alerta = {
  chave: string;
  tipo: TipoAlerta;
  titulo: string;
  trecho: string;
  href: string;
  quando: string;
};

const cortar = (t: string, n = 120) => (t.length > n ? `${t.slice(0, n - 1)}…` : t);

export function montarAlertas(e: {
  cotacoes: { id: string; criado_em: string; produto: string; quantidade: number; lugar: string }[];
  disputas: { id: string; aberta_em: string; motivo: string | null; descricao: string | null }[];
  mensagens: { id: string; conversa_id: string; created_at: string; corpo: string }[];
}): Alerta[] {
  const alertas: Alerta[] = [
    ...e.cotacoes.map((c) => ({
      chave: `cotacao-${c.id}`,
      tipo: "cotacao" as const,
      titulo: "Novo pedido de cotação de frete",
      trecho: cortar(`${c.produto}, ${c.quantidade} un. · entrega em ${c.lugar}`),
      href: `/seller/cotacoes-frete/${c.id}`,
      quando: c.criado_em,
    })),
    ...e.disputas.map((d) => ({
      chave: `disputa-${d.id}`,
      tipo: "disputa" as const,
      titulo: "Disputa aberta pelo comprador",
      trecho: cortar(d.descricao || (d.motivo ?? "").replace(/_/g, " ") || "Veja os detalhes"),
      href: `/seller/disputas/${d.id}`,
      quando: d.aberta_em,
    })),
    ...e.mensagens.map((m) => ({
      chave: `mensagem-${m.id}`,
      tipo: "mensagem" as const,
      titulo: "Nova mensagem do comprador",
      trecho: cortar(m.corpo),
      href: `/seller/mensagens/${m.conversa_id}`,
      quando: m.created_at,
    })),
  ];
  return alertas.sort((a, b) => b.quando.localeCompare(a.quando));
}

export function alertasNovos(alertas: Alerta[], vistos: ReadonlySet<string>): Alerta[] {
  return alertas.filter((a) => !vistos.has(a.chave));
}

/** Lista de chaves já vistas, limitada para não crescer sem fim no navegador. */
export function lembrarVistos(anteriores: string[], novos: string[], limite = 200): string[] {
  const lista = [...anteriores.filter((k) => !novos.includes(k)), ...novos];
  return lista.slice(-limite);
}
