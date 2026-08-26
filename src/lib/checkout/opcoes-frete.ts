// Monta as opções de frete exibidas no checkout (PRD 008, Milestone 1).
// Uber Direct só entra quando NENHUMA transportadora interna cobre o CEP —
// leitura de "fallback" adotada para o item em aberto do PRD §2.5 (Uber
// Direct sempre visível vs só quando falta cobertura interna).

export type OpcaoFrete =
  | { tipo: "interna"; transportadoraId: string | null; nome: string; valor: number }
  | {
      tipo: "uber_direct";
      transportadoraId: string;
      nome: string;
      valor: number;
      prazoMin: number | null;
      cotacaoExternaId: string;
      expiraEm: string;
    };

export function montarOpcaoInterna(
  transportadoraId: string | null,
  nome: string,
  percentual: number,
  valorItens: number,
): OpcaoFrete {
  return {
    tipo: "interna",
    transportadoraId,
    nome,
    valor: Math.round(((valorItens * percentual) / 100) * 100) / 100,
  };
}

export function montarOpcaoUberDirect(
  transportadoraId: string,
  cotacaoExternaId: string,
  feeCentavos: number,
  duracaoMin: number | null,
  expiraEm: string,
): OpcaoFrete {
  return {
    tipo: "uber_direct",
    transportadoraId,
    nome: "Entrega expressa (Uber Direct)",
    valor: Math.round(feeCentavos) / 100,
    prazoMin: duracaoMin,
    cotacaoExternaId,
    expiraEm,
  };
}

// Interna cobre o CEP → só ela aparece (evita custo/complexidade da via
// terceirizada nos casos já resolvidos internamente, decisão do PRD §5a).
// Sem cobertura interna → Uber Direct aparece se cotável; sem nenhuma das
// duas, lista vazia (checkout mantém o erro atual de CEP sem cobertura).
export function decidirOpcoesFrete(
  interna: OpcaoFrete | null,
  uberDirect: OpcaoFrete | null,
): OpcaoFrete[] {
  if (interna) return [interna];
  if (uberDirect) return [uberDirect];
  return [];
}
