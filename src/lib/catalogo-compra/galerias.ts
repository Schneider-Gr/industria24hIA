import type { SupabaseClient } from "@supabase/supabase-js";
import { lojaCobreCep, type FaixaCep } from "@/lib/cep";

type ProdutoGaleria = { id: string; nome: string; valor: number; loja_id: string; img: string | null };
type ProdutoDescontoGaleria = ProdutoGaleria & { menorPreco: number };

export type GaleriaVitrine =
  | { id: string; titulo: string; tipo: "lancamento" | "mais_baratos" | "custom"; produtos: ProdutoGaleria[] }
  | { id: string; titulo: string; tipo: "desconto_progressivo"; produtos: ProdutoDescontoGaleria[] };

async function buscarImagens(supabase: SupabaseClient, ids: string[]) {
  const mapa = new Map<string, string>();
  if (!ids.length) return mapa;
  const { data } = await supabase
    .from("produto_imagens")
    .select("produto_id, url, ordem")
    .in("produto_id", ids)
    .order("ordem", { ascending: true });
  (data ?? []).forEach((img) => {
    if (!mapa.has(img.produto_id)) mapa.set(img.produto_id, img.url);
  });
  return mapa;
}

/**
 * Resolve as galerias ativas de `vitrine_galerias` (migration 0092) para a
 * home. Cada tipo calculado (lancamento/mais_baratos/desconto_progressivo) é
 * filtrado pela mesma cobertura de CEP já usada no resto da home
 * (`lojaCobreCep`); `custom` usa os vínculos manuais de `vitrine_galeria_produtos`.
 */
export async function buscarGaleriasVitrine(
  supabase: SupabaseClient,
  faixas: FaixaCep[],
  cepComprador: string | null,
): Promise<GaleriaVitrine[]> {
  const cobreLoja = (lojaId: string) => !cepComprador || lojaCobreCep(faixas, lojaId, cepComprador);

  const { data: galerias } = await supabase
    .from("vitrine_galerias")
    .select("id, tipo, titulo, ordem")
    .eq("ativo", true)
    .order("ordem", { ascending: true });

  if (!galerias || galerias.length === 0) return [];

  // Cada galeria é independente das outras — resolvidas em paralelo em vez
  // de em fila (waterfall estrutural, issue #333).
  const resolvidas = await Promise.all(
    galerias.map((galeria) => resolverGaleria(supabase, galeria, cobreLoja)),
  );
  return resolvidas.filter((g): g is GaleriaVitrine => g !== null);
}

async function resolverGaleria(
  supabase: SupabaseClient,
  galeria: { id: string; tipo: string; titulo: string },
  cobreLoja: (lojaId: string) => boolean,
): Promise<GaleriaVitrine | null> {
  if (galeria.tipo === "lancamento" || galeria.tipo === "mais_baratos") {
    const { data: produtos } = await supabase
      .from("produtos")
      .select("id, nome, valor, loja_id")
      .gt("valor", 0)
      .eq("status_produto", "Aprovado")
      .order(galeria.tipo === "lancamento" ? "created_at" : "valor", {
        ascending: galeria.tipo === "mais_baratos",
      })
      .limit(12);
    const filtrados = (produtos ?? []).filter((p) => cobreLoja(p.loja_id));
    if (!filtrados.length) return null;
    const imagens = await buscarImagens(supabase, filtrados.map((p) => p.id));
    return {
      id: galeria.id,
      titulo: galeria.titulo,
      tipo: galeria.tipo,
      produtos: filtrados.map((p) => ({ ...p, img: imagens.get(p.id) ?? null })),
    };
  }

  if (galeria.tipo === "desconto_progressivo") {
    const { data: promocoes } = await supabase
      .from("promocoes_progressivas")
      .select("produto_id, faixas")
      .eq("ativo", true);
    const ids = (promocoes ?? []).map((p) => p.produto_id);
    if (!ids.length) return null;
    const [{ data: produtos }, imagens] = await Promise.all([
      supabase.from("produtos").select("id, nome, valor, loja_id").in("id", ids).gt("valor", 0),
      buscarImagens(supabase, ids),
    ]);
    const itens = (promocoes ?? [])
      .map((promo) => {
        const produto = (produtos ?? []).find((p) => p.id === promo.produto_id);
        if (!produto || !cobreLoja(produto.loja_id)) return null;
        const faixasPromo = Array.isArray(promo.faixas)
          ? (promo.faixas as { valor_unitario: number }[])
          : [];
        const menorPreco = faixasPromo.reduce((min, f) => Math.min(min, f.valor_unitario), produto.valor);
        return { ...produto, menorPreco, img: imagens.get(produto.id) ?? null };
      })
      .filter((p): p is ProdutoDescontoGaleria => p !== null);
    if (!itens.length) return null;
    return { id: galeria.id, titulo: galeria.titulo, tipo: "desconto_progressivo", produtos: itens };
  }

  if (galeria.tipo === "custom") {
    const { data: vinculos } = await supabase
      .from("vitrine_galeria_produtos")
      .select("produto_id, ordem")
      .eq("galeria_id", galeria.id)
      .order("ordem", { ascending: true });
    const ids = (vinculos ?? []).map((v) => v.produto_id);
    if (!ids.length) return null;
    const [{ data: produtos }, imagens] = await Promise.all([
      supabase.from("produtos").select("id, nome, valor, loja_id").in("id", ids).gt("valor", 0),
      buscarImagens(supabase, ids),
    ]);
    const produtoPorId = new Map((produtos ?? []).map((p) => [p.id, p]));
    const itens = ids
      .map((id) => produtoPorId.get(id))
      .filter((p): p is NonNullable<typeof p> => !!p && cobreLoja(p.loja_id))
      .map((p) => ({ ...p, img: imagens.get(p.id) ?? null }));
    if (!itens.length) return null;
    return { id: galeria.id, titulo: galeria.titulo, tipo: "custom", produtos: itens };
  }

  return null;
}
