import type { MetadataRoute } from "next";

const SITE_URL = "https://industria24.com.br";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/admin",
          "/seller",
          "/afiliado",
          "/parceiro",
          "/entregador",
          "/checkout",
          "/carrinho",
          "/pedido",
          "/meus-pedidos",
          "/mensagens",
          "/login",
          "/cadastro",
          "/definir-senha",
          "/acessos",
          "/atalhos",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
