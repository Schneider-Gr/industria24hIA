// Extrato do pedido para o seller (PRD 052, US02). Espelha o cálculo do
// repasse em public.repasses_recalcular_pedido (0205): produto menos as
// comissões (plataforma e afiliado), mais o frete de que o seller é
// destinatário, integral e sem comissão. A fonte de verdade do valor pago é o
// banco; isto é só a leitura para a tela.

export type LinhaExtrato = {
  valor: number | null;
  repasse_ind: number | null;
  repasse_afiliado: number | null;
  valor_frete: number | null;
  frete_destinatario: string | null;
};

export type Extrato = {
  produtos: number;
  comissao: number;
  freteSeller: number;
  freteTerceiro: number;
  /** Frete de pedido anterior à 0205: não entra no repasse. */
  freteAnterior: number;
  aReceber: number;
};

const centavos = (v: number | null) => Math.round((v ?? 0) * 100);

export function extratoPedido(linhas: LinhaExtrato[]): Extrato {
  let produtos = 0;
  let comissao = 0;
  let freteSeller = 0;
  let freteTerceiro = 0;
  let freteAnterior = 0;
  for (const l of linhas) {
    produtos += centavos(l.valor);
    comissao += centavos(l.repasse_ind) + centavos(l.repasse_afiliado);
    const frete = centavos(l.valor_frete);
    if (l.frete_destinatario === "seller") freteSeller += frete;
    else if (l.frete_destinatario === "terceiro") freteTerceiro += frete;
    else freteAnterior += frete;
  }
  return {
    produtos: produtos / 100,
    comissao: comissao / 100,
    freteSeller: freteSeller / 100,
    freteTerceiro: freteTerceiro / 100,
    freteAnterior: freteAnterior / 100,
    aReceber: (produtos - comissao + freteSeller) / 100,
  };
}
