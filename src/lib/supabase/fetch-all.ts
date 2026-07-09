// PostgREST corta qualquer select em 1000 linhas (cap do servidor) — somas
// feitas no client sobre uma página só saem erradas em silêncio. Este helper
// pagina via .range() até esgotar.
const PAGE = 1000;

type PageResult<T> = { data: T[] | null; error: { message: string } | null };

export async function fetchAll<T>(
  query: (from: number, to: number) => PromiseLike<PageResult<T>>,
): Promise<{ data: T[]; error: { message: string } | null }> {
  const all: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await query(from, from + PAGE - 1);
    if (error) return { data: all, error };
    all.push(...(data ?? []));
    if (!data || data.length < PAGE) return { data: all, error: null };
  }
}

// .in() com milhares de ids estoura o limite de URL do PostgREST — fatiar.
export function chunk<T>(arr: T[], size = 200): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}
