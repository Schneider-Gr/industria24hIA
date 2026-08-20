import { createPublicClient } from "@/lib/supabase/public";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { limparBBCode } from "@/lib/bbcode";
import { categoriaParaGoogleProductCategory } from "@/lib/google-product-category";
import { permalinkProduto } from "@/lib/slug";

// Feed de produtos para Google Merchant Center (RSS 2.0 / Google Shopping).
// Schema atual de `produtos` não tem marca/GTIN (ver openspec change
// seo-indexacao-ia/design.md) — usa identifier_exists=false em vez de
// inventar valor. Revalida 1x/dia: Merchant Center já agenda o próprio
// crawl do feed, não precisa de dado mais fresco que isso.
export const revalidate = 86400;

const SITE_URL = "https://industria24.com.br";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  if (!isSupabaseConfigured) {
    return new Response("Supabase não configurado", { status: 503 });
  }

  const supabase = createPublicClient();

  const { data: produtos } = await supabase
    .from("produtos")
    .select("id, nome, descricao, valor, estoque_atual, categoria_id")
    .eq("status_produto", "Aprovado")
    .limit(5000);

  const produtoIds = (produtos ?? []).map((p) => p.id);
  const categoriaIds = [...new Set((produtos ?? []).map((p) => p.categoria_id).filter((v): v is string => Boolean(v)))];

  const [{ data: imagens }, { data: categorias }] = await Promise.all([
    produtoIds.length
      ? supabase
          .from("produto_imagens")
          .select("produto_id, url, ordem")
          .in("produto_id", produtoIds)
          .order("ordem", { ascending: true })
      : Promise.resolve({ data: [] as { produto_id: string; url: string; ordem: number }[] }),
    categoriaIds.length
      ? supabase.from("categorias").select("id, nome").in("id", categoriaIds)
      : Promise.resolve({ data: [] as { id: string; nome: string }[] }),
  ]);

  const primeiraImagem = new Map<string, string>();
  for (const img of imagens ?? []) {
    if (!primeiraImagem.has(img.produto_id)) primeiraImagem.set(img.produto_id, img.url);
  }
  const nomeCategoria = new Map((categorias ?? []).map((c) => [c.id, c.nome]));

  const items = (produtos ?? [])
    .filter((p) => primeiraImagem.has(p.id))
    .map((p) => {
      const descricao = p.descricao ? limparBBCode(p.descricao) : p.nome;
      const disponibilidade = p.estoque_atual > 0 ? "in stock" : "out of stock";
      const googleCategoria = categoriaParaGoogleProductCategory(nomeCategoria.get(p.categoria_id ?? ""));
      return `    <item>
      <g:id>${escapeXml(p.id)}</g:id>
      <title>${escapeXml(p.nome)}</title>
      <description>${escapeXml(descricao)}</description>
      <link>${SITE_URL}${permalinkProduto(p.id, p.nome)}</link>
      <g:image_link>${escapeXml(primeiraImagem.get(p.id)!)}</g:image_link>
      <g:availability>${disponibilidade}</g:availability>
      <g:price>${Number(p.valor).toFixed(2)} BRL</g:price>
      <g:condition>new</g:condition>
      <g:identifier_exists>false</g:identifier_exists>
      <g:google_product_category>${escapeXml(googleCategoria)}</g:google_product_category>
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>Indústria 24h — Catálogo de produtos</title>
    <link>${SITE_URL}</link>
    <description>Feed de produtos aprovados da Indústria 24h para Google Merchant Center.</description>
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
}
