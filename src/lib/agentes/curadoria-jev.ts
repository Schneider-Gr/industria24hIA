// Parecer de curadoria do produto pelo Jev (substitui o agente LangSmith, que
// só rodava quando a regra de presença achava gap e nunca gravou um parecer em
// produção). A regra determinística (curadoria-regras.ts) segue decidindo o que
// falta; o Jev julga o que regra de tamanho não vê: se o anúncio faz sentido.
// O texto é montado aqui em código (o Jev não gera texto) e a decisão continua
// sendo só sugestão: quem aprova é o admin.

import { consultarJev, type Noul, type RespostaNoul } from "@/lib/catalogo-compra/jev-taxonomia";
import type { Gap } from "./curadoria-regras";

export type DecisaoSugerida = "aprovado" | "reprovado" | "sugestao";
export type ParecerProduto = { decisaoSugerida: DecisaoSugerida; texto: string };
export type ProdutoCuradoria = { nome: string; descricao: string | null; categoria: string | null };

// Uma proposição por Noul (doc TypeSafe). As três primeiras: "sim" é bom.
export const PERGUNTAS_CURADORIA = {
  nome_claro: {
    type: "noul",
    instructions: "O `produto.nome` deixa claro qual produto está à venda, sem precisar abrir o anúncio?",
  },
  descricao_do_mesmo_item: {
    type: "noul",
    instructions: "A `produto.descricao` fala do mesmo item que o `produto.nome`?",
  },
  categoria_coerente: {
    type: "noul",
    instructions: "O produto descrito em `produto` pertence à categoria `produto.categoria`?",
  },
  venda_restrita: {
    type: "noul",
    instructions:
      "O `produto` é de venda proibida ou que exige licença especial no Brasil, como medicamento, arma, munição, fogos de artifício, animal silvestre, agrotóxico de uso restrito ou produto falsificado?",
  },
} satisfies Record<string, Noul>;

// Eval de 24/09 (jev-1.13.0): 127 aprovados + 8 anúncios ruins montados.
// Ruins: nome vago 0,09, descrição de outro item 0,01, categoria errada 0,03 a
// 0,04; restritos 0,82 a 0,96 contra no máximo 0,24 nos aprovados. Com 0,5 nas
// perguntas de qualidade, 22 aprovados viravam sugestão (muito ruído, ex.:
// "Salsa" em Hortifrúti 0,15); com 0,2, cerca de 6, e os 8 ruins seguem pegos.
export const LIMIAR_OK = 0.2;
export const LIMIAR_RESTRITA = 0.8;

const AJUSTES: Record<"nome_claro" | "descricao_do_mesmo_item" | "categoria_coerente", string> = {
  nome_claro: "O título não deixa claro qual é o produto. Inclua tipo, material ou medida.",
  descricao_do_mesmo_item: "A descrição não parece falar do mesmo item do título. Revise para descrever este produto.",
  categoria_coerente: "A categoria escolhida não parece corresponder ao produto. Confira a categoria.",
};

/** Política em código: restrito reprova; gap ou pergunta abaixo do limiar vira sugestão; senão aprova. */
export function decidirParecer(respostas: Partial<Record<keyof typeof PERGUNTAS_CURADORIA, number>>, gaps: Gap[]): ParecerProduto {
  if ((respostas.venda_restrita ?? 0) >= LIMIAR_RESTRITA) {
    return { decisaoSugerida: "reprovado", texto: "Possível item de venda proibida ou que exige licença. Verifique antes de publicar." };
  }
  const ajustes = [
    ...gaps.map((g) => g.mensagem),
    ...(Object.keys(AJUSTES) as (keyof typeof AJUSTES)[]).filter((k) => (respostas[k] ?? 1) < LIMIAR_OK).map((k) => AJUSTES[k]),
  ];
  if (ajustes.length) return { decisaoSugerida: "sugestao", texto: ajustes.join("\n") };
  return { decisaoSugerida: "aprovado", texto: "Anúncio completo e coerente." };
}

/** Parecer pelo Jev; sem chave ou em erro, cai só nas regras (null se não houver gap). */
export async function gerarParecerProdutoJev(produto: ProdutoCuradoria, gaps: Gap[]): Promise<ParecerProduto | null> {
  const apiKey = process.env.TYPESAFE_API_KEY;
  // Sem descrição ou sem categoria a pergunta não tem o que julgar: o gap já cobre.
  const perguntas = Object.fromEntries(
    Object.entries(PERGUNTAS_CURADORIA).filter(
      ([k]) => (k !== "descricao_do_mesmo_item" || produto.descricao?.trim()) && (k !== "categoria_coerente" || produto.categoria),
    ),
  );
  if (!apiKey) return gaps.length ? decidirParecer({}, gaps) : null;
  try {
    const r = await consultarJev<RespostaNoul>(
      apiKey,
      { produto: { nome: produto.nome.slice(0, 200), descricao: produto.descricao?.slice(0, 1_500) ?? "", categoria: produto.categoria ?? "" } },
      perguntas,
    );
    return decidirParecer(Object.fromEntries(Object.entries(r).map(([k, a]) => [k, a.noul])), gaps);
  } catch (e) {
    console.error("[curadoria-jev]", e);
    return gaps.length ? decidirParecer({}, gaps) : null;
  }
}
