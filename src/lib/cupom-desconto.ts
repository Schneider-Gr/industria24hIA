// Regra de cupom de desconto no checkout (função SQL cupom_aplicar, migration
// 0156; chamada por checkout_criar_pedido). Custeio 100% pela margem da
// plataforma (repasse_ind, 5% do valor cheio da linha):
//
//  - a regra aplicável é a de alvo mais específico: produto > categoria > loja > tudo;
//  - o preço com cupom é calculado sobre o preço BASE do produto;
//  - não acumula com o desconto progressivo: abate só a diferença entre o preço
//    de faixa vigente e o preço com cupom (zero se a faixa já é melhor);
//  - o desconto da linha nunca passa do repasse_ind da linha (piso); linha sem
//    margem não recebe desconto.
//
// linha_itens.valor continua sendo o preço cheio — o abatimento vive só em
// linha_itens.desconto_cupom e reduz apenas pedidos.valor_pedido.
//
// ponytail: réplica pura da função SQL cupom_aplicar. Se a regra mudar na
// migration, mude aqui. Checks em cupom-desconto.test.ts.

export type AlvoCupom = "produto" | "categoria" | "loja" | "tudo";
export type TipoCupom = "percentual" | "valor_fixo";

export type RegraCupom = {
  alvo: AlvoCupom;
  alvo_id: string | null;
  tipo: TipoCupom;
  valor: number;
};

export type ItemCupom = {
  produto_id: string;
  categoria_id: string | null;
  loja_id: string;
  preco_base: number; // preço unitário cheio (produtos.valor)
  preco_faixa: number; // preço unitário já com desconto progressivo
  quantidade: number;
  repasse_ind: number; // margem da plataforma na linha (round(valor * 0.05, 2))
};

export type DescontoLinha = { produto_id: string; desconto: number };

const PRECEDENCIA: AlvoCupom[] = ["produto", "categoria", "loja", "tudo"];

function alvoBate(regra: RegraCupom, item: ItemCupom): boolean {
  switch (regra.alvo) {
    case "produto":
      return regra.alvo_id === item.produto_id;
    case "categoria":
      return regra.alvo_id != null && regra.alvo_id === item.categoria_id;
    case "loja":
      return regra.alvo_id === item.loja_id;
    case "tudo":
      return true;
  }
}

function regraAplicavel(regras: RegraCupom[], item: ItemCupom): RegraCupom | null {
  for (const alvo of PRECEDENCIA) {
    const r = regras.find((regra) => regra.alvo === alvo && alvoBate(regra, item));
    if (r) return r;
  }
  return null;
}

// espelha round(x, 2) do Postgres para valores positivos (half up)
function round2(x: number): number {
  return Math.round((x + Number.EPSILON) * 100) / 100;
}

function precoComCupom(regra: RegraCupom, precoBase: number): number {
  const bruto =
    regra.tipo === "percentual"
      ? precoBase * (1 - regra.valor / 100)
      : precoBase - regra.valor;
  return Math.max(0, bruto);
}

export function aplicarCupom(regras: RegraCupom[], itens: ItemCupom[]): DescontoLinha[] {
  return itens.map((item) => {
    const regra = regraAplicavel(regras, item);
    if (!regra || item.repasse_ind <= 0) {
      return { produto_id: item.produto_id, desconto: 0 };
    }
    const precoCupom = precoComCupom(regra, item.preco_base);
    const descontoUnit = Math.max(0, item.preco_faixa - precoCupom);
    const descontoLinha = round2(descontoUnit * item.quantidade);
    return {
      produto_id: item.produto_id,
      desconto: Math.min(descontoLinha, item.repasse_ind),
    };
  });
}

// Cupom de loja (add-cupom-loja-seller): custeia pela margem do próprio
// produto, não pela plataforma — o preço final SUBSTITUI linha_itens.valor
// (mesmo mecanismo do desconto progressivo), sem piso de repasse_ind: é
// decisão de preço do seller, mesmo risco que ele já assume com faixa
// progressiva. "Aplica o melhor": preço final = min(preco_faixa, preco_cupom).
export function precoUnitarioComCupomLoja(regras: RegraCupom[], item: ItemCupom): number {
  const regra = regraAplicavel(regras, item);
  if (!regra) return item.preco_faixa;
  const precoCupom = round2(precoComCupom(regra, item.preco_base));
  return Math.min(item.preco_faixa, precoCupom);
}
