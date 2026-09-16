import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

// Aceita tanto o client tipado quanto o genérico usado em `vitrine-home.ts`.
type Client = SupabaseClient<Database> | SupabaseClient;

// Produto em ruptura = aprovado, mas sem saldo à vista E sem venda futura com
// estoque. A regra mora na view `produtos_vendaveis` (migration 0173); aqui só
// lemos o complemento dela.
//
// Por que uma lista de ids em vez de ler a view direto nas listagens: as telas
// de catálogo trazem as imagens por embed (`produto_imagens(url, ordem)`), e o
// PostgREST não expõe a relação reversa a partir de uma view. Ler `produtos` e
// excluir estes ids mantém o embed e a regra num lugar só.
//
// ponytail: `not in` com a lista inteira — em 16/09/2026 são 4 ids de 115
// produtos, e a lista só cresce com produto sem nenhuma forma de venda. Se um
// dia passar de algumas centenas, trocar por um filtro server-side (coluna
// materializada por trigger ou RPC de listagem).
export async function idsEmRuptura(supabase: Client): Promise<string[]> {
  const { data } = await (supabase as SupabaseClient<Database>)
    .from("produtos_em_ruptura")
    .select("id");
  return (data ?? []).map((p) => p.id).filter((id): id is string => Boolean(id));
}

/** Formato que o PostgREST espera em `.not("id", "in", ...)`. */
export function listaNotIn(ids: string[]): string {
  return `(${ids.join(",")})`;
}
