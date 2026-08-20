import type { MetadataRoute } from "next";
import { createPublicClient } from "@/lib/supabase/public";
import { isSupabaseConfigured } from "@/lib/supabase/env";

const SITE_URL = "https://industria24.com.br";

// Páginas estáticas do marketplace público (fora de área logada/admin).
const PAGINAS_ESTATICAS: Array<{ path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }> = [
  { path: "/", priority: 1, changeFrequency: "hourly" },
  { path: "/busca", priority: 0.6, changeFrequency: "hourly" },
  { path: "/coletivas", priority: 0.7, changeFrequency: "hourly" },
  { path: "/compra-coletiva", priority: 0.5, changeFrequency: "weekly" },
  { path: "/leilao", priority: 0.6, changeFrequency: "hourly" },
  { path: "/corridas", priority: 0.4, changeFrequency: "daily" },
  { path: "/seja-fornecedor", priority: 0.5, changeFrequency: "monthly" },
  { path: "/seja-parceiro", priority: 0.5, changeFrequency: "monthly" },
  { path: "/vender", priority: 0.5, changeFrequency: "monthly" },
  { path: "/vender-como-afiliado", priority: 0.5, changeFrequency: "monthly" },
  { path: "/integracoes", priority: 0.4, changeFrequency: "monthly" },
  { path: "/desenvolvedores", priority: 0.4, changeFrequency: "monthly" },
  { path: "/desenvolvedores/autenticacao", priority: 0.3, changeFrequency: "monthly" },
  { path: "/desenvolvedores/referencia", priority: 0.3, changeFrequency: "monthly" },
  { path: "/desenvolvedores/rastreamento", priority: 0.3, changeFrequency: "monthly" },
];

// Slugs de termos publicados hoje na tabela (ver src/app/termos/[slug]/page.tsx).
const SLUGS_TERMOS = [
  "mercado-futuro",
  "afiliados",
  "parceiro-logistico",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const estaticas: MetadataRoute.Sitemap = PAGINAS_ESTATICAS.map((p) => ({
    url: `${SITE_URL}${p.path}`,
    lastModified: new Date(),
    changeFrequency: p.changeFrequency,
    priority: p.priority,
  }));

  const termos: MetadataRoute.Sitemap = SLUGS_TERMOS.map((slug) => ({
    url: `${SITE_URL}/termos/${slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly",
    priority: 0.3,
  }));

  if (!isSupabaseConfigured) {
    // Sem env do Supabase (build local sem .env.local) — devolve só as
    // páginas estáticas, nunca URL inventada de produto/loja/categoria.
    return [...estaticas, ...termos];
  }

  const supabase = createPublicClient();

  const [{ data: produtos }, { data: lojas }, { data: categorias }, { data: coletivas }] = await Promise.all([
    supabase.from("produtos").select("id, created_at").eq("status_produto", "Aprovado").limit(5000),
    supabase.from("lojas_vitrine").select("id").limit(2000),
    supabase.from("categorias").select("id").limit(500),
    supabase
      .from("compras_coletivas")
      .select("id, created_at")
      .in("status", ["Aberta", "Viavel"])
      .limit(1000),
  ]);

  const produtosSitemap: MetadataRoute.Sitemap = (produtos ?? []).map((p) => ({
    url: `${SITE_URL}/produto/${p.id}`,
    lastModified: p.created_at ? new Date(p.created_at) : new Date(),
    changeFrequency: "daily",
    priority: 0.8,
  }));

  const lojasSitemap: MetadataRoute.Sitemap = (lojas ?? []).map((l) => ({
    url: `${SITE_URL}/loja/${l.id}`,
    lastModified: new Date(),
    changeFrequency: "daily",
    priority: 0.6,
  }));

  const categoriasSitemap: MetadataRoute.Sitemap = (categorias ?? []).map((c) => ({
    url: `${SITE_URL}/categoria/${c.id}`,
    lastModified: new Date(),
    changeFrequency: "daily",
    priority: 0.7,
  }));

  const coletivasSitemap: MetadataRoute.Sitemap = (coletivas ?? []).map((c) => ({
    url: `${SITE_URL}/coletiva/${c.id}`,
    lastModified: c.created_at ? new Date(c.created_at) : new Date(),
    changeFrequency: "hourly",
    priority: 0.6,
  }));

  return [...estaticas, ...termos, ...produtosSitemap, ...lojasSitemap, ...categoriasSitemap, ...coletivasSitemap];
}
