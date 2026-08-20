// Mapeamento categoria.nome (Indústria 24h) -> google_product_category, na
// taxonomia oficial do Google (https://support.google.com/merchants/answer/6324436).
// Categorias são CRUD dinâmico do admin (sem lista fixa no schema — ver
// src/app/(admin)/admin/categorias/actions.ts), então este mapa nunca cobre
// 100%: categoria sem entrada aqui cai no fallback genérico, correto mas
// menos específico. Atualizar esta lista quando o admin cadastrar categoria
// nova relevante — não adivinhar taxonomia aqui sem checar o texto oficial.
const FALLBACK = "Business & Industrial";

const MAPA: Record<string, string> = {
  // ex.: "Ferramentas": "Hardware > Tools",
};

export function categoriaParaGoogleProductCategory(nomeCategoria: string | null | undefined): string {
  if (!nomeCategoria) return FALLBACK;
  return MAPA[nomeCategoria] ?? FALLBACK;
}
