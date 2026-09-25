// Painel de pendências do frete e cobertura por categoria (spec
// seller-transportadoras/cadastro-transportadora). A transportadora leva os
// produtos do nó marcado e dos nós abaixo; sem nó marcado, leva tudo (PRD 049,
// decisão 6).

import { cepOrigemDoProduto } from "./cep-origem";

export type MapaPais = Map<string, string | null>;

/** O nó e todos os ancestrais dele, até a raiz. */
function linhagem(no: string, pais: MapaPais): Set<string> {
  const vistos = new Set<string>();
  let atual: string | null | undefined = no;
  while (atual && !vistos.has(atual)) {
    vistos.add(atual);
    atual = pais.get(atual);
  }
  return vistos;
}

export function transportadoraCobre(nos: Set<string>, taxonomiaNoId: string | null, pais: MapaPais): boolean {
  if (nos.size === 0) return true;
  if (!taxonomiaNoId) return false;
  for (const n of linhagem(taxonomiaNoId, pais)) if (nos.has(n)) return true;
  return false;
}

export function contarCobertos(
  no: string,
  produtos: { taxonomiaNoId: string | null }[],
  pais: MapaPais,
): number {
  const alvo = new Set([no]);
  return produtos.filter((p) => p.taxonomiaNoId && transportadoraCobre(alvo, p.taxonomiaNoId, pais)).length;
}

export type TransportadoraPendencia = {
  id: string;
  nome: string;
  ativo: boolean;
  faixasAtivas: number;
  nos: Set<string>;
  revisarCategorias: boolean;
  /** Global ativada pela loja: o seller não sobe tabela nem mexe em categoria dela. */
  propria?: boolean;
};

export type ProdutoPendencia = {
  id: string;
  nome: string;
  taxonomiaNoId: string | null;
  peso: number | null;
  altura: number | null;
  largura: number | null;
  comprimento: number | null;
  cepProduto: string | null;
};

export function calcularPendencias(entrada: {
  transportadoras: TransportadoraPendencia[];
  produtos: ProdutoPendencia[];
  cepLoja: string | null;
  pais: MapaPais;
}) {
  const { transportadoras, produtos, cepLoja, pais } = entrada;
  const ativas = transportadoras.filter((t) => t.ativo);
  const proprias = ativas.filter((t) => t.propria !== false);
  const utilizaveis = ativas.filter((t) => t.faixasAtivas > 0);

  const semFaixa = proprias.filter((t) => t.faixasAtivas === 0);
  const revisarCategorias = proprias.filter((t) => t.revisarCategorias);
  const semMedidas = produtos.filter(
    (p) => !(p.peso && p.peso > 0) || !p.altura || !p.largura || !p.comprimento,
  );
  // Sem nenhuma transportadora utilizável, "sem transportadora" repetiria o
  // "sem faixa" para todos os produtos; o painel mostra só a causa.
  const semTransportadora =
    utilizaveis.length === 0
      ? []
      : produtos.filter((p) => !utilizaveis.some((t) => transportadoraCobre(t.nos, p.taxonomiaNoId, pais)));
  const semCepOrigem = produtos.filter((p) => cepOrigemDoProduto(p.cepProduto, cepLoja).cep === null);

  return {
    semFaixa,
    revisarCategorias,
    semMedidas,
    semTransportadora,
    semCepOrigem,
    total:
      semFaixa.length + revisarCategorias.length + semMedidas.length + semTransportadora.length + semCepOrigem.length,
  };
}
