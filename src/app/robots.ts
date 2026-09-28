import type { MetadataRoute } from "next";

const SITE_URL = "https://industria24.com.br";

// Só /api/ fica bloqueado. As áreas privadas saem do índice pelo header
// X-Robots-Tag: noindex (next.config.ts); se estivessem aqui no Disallow o
// Google não leria o header, e listar /admin etc. só anunciava os painéis.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/"] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
