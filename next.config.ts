import type { NextConfig } from "next";
import path from "node:path";
import { withSentryConfig } from "@sentry/nextjs";

// Headers de segurança aplicados a todas as rotas. O domínio servia nu
// (sem HSTS/CSP/X-Frame etc.) — auditoria de 2026-07-21.
//
// O Content-Security-Policy saiu daqui: agora é emitido por request no
// `src/proxy.ts` (variante estrita com nonce nos painéis + /login, variante
// com 'unsafe-inline' nas rotas públicas pra preservar Static/ISR). Header
// estático não consegue nonce por request.
const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // geolocation=(self): o modal de CEP oferece "Utilizar localizacao
  // automatica". Com geolocation=() o navegador rejeita a chamada antes de
  // perguntar ao usuario, e o botao falha sempre. Camera e microfone seguem
  // desligados — nada no app usa.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
];

// Áreas logadas, fluxo de compra, auth e resultado de busca: sem valor no
// Google (conteúdo por usuário ou duplicado da vitrine). `/x/:path*` casa
// `/x` e `/x/...`, mas não `/x-outra` (vender ≠ vender-como-afiliado).
const NOINDEX_PREFIXES = [
  "admin", "seller", "afiliado", "parceiro", "entregador", "corridas",
  "checkout", "carrinho", "pedido", "meus-pedidos", "mensagens",
  "minhas-cotacoes", "favoritos", "avisos", "cupons", "vender",
  "login", "cadastro", "definir-senha", "auth", "acessos", "atalhos",
  "busca",
];

const nextConfig: NextConfig = {
  // Raiz explícita: há outros lockfiles acima (C:\Users\andre) e o Next chutava
  // a raiz errada do workspace. Fixa em web/.
  turbopack: { root: path.resolve(__dirname) },
  // next/image só otimiza host declarado. As fotos de produto/loja vivem no
  // Storage do Supabase; o que vier de outro host continua em <img> cru
  // (ver ehImagemOtimizavel em components/vitrine/ui.tsx).
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**.supabase.co", pathname: "/storage/v1/object/public/**" }],
    // 60 para miniatura de card (ver FotoProduto), 75 para o hero.
    qualities: [60, 75],
  },
  // CSP é emitido no proxy.ts (nonce por request). Aqui só os headers estáticos.
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // Service worker do app do entregador (push): sem cache, para toda
      // correção chegar ao aparelho na próxima abertura.
      { source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }] },
      // noindex por header cobre de uma vez páginas, layouts e rotas sem
      // metadata. Essas rotas NÃO podem estar no Disallow do robots.ts: com
      // Disallow o Google nunca lê o header e a URL já indexada fica no índice.
      ...NOINDEX_PREFIXES.map((p) => ({
        source: `/${p}/:path*`,
        headers: [{ key: "X-Robots-Tag", value: "noindex" }],
      })),
    ];
  },
  // /seja-fornecedor virou /venda-no-industria. O 308 fica permanente: a URL
  // antiga está impressa no pitch de vendas de 32 slides que o Key Account usa
  // em campo, e não dá para reimprimir o material que já foi distribuído.
  async redirects() {
    return [
      { source: "/seja-fornecedor", destination: "/venda-no-industria", permanent: true },
      // LP do Estoque Indústria mora em /armazeneconosco; /cd e /fulfillment foram nomes anteriores.
      { source: "/cd", destination: "/armazeneconosco", permanent: true },
      { source: "/fulfillment", destination: "/armazeneconosco", permanent: true },
    ];
  },
  // Painel Uber Direct está configurado com a URL sem /api (PRD 008) — traz
  // para a convenção do projeto (webhooks recebidos vivem sob /api/*).
  async rewrites() {
    return [
      { source: "/webhooks/uber-direct", destination: "/api/webhooks/uber-direct" },
      // vender.industria24.com.br serve a LP de captação de seller (#542) sem
      // duplicar página: a raiz do subdomínio reescreve para
      // /venda-no-industria. Rewrite, não redirect, para o visitante ficar no
      // domínio da campanha. Qualquer outro caminho do subdomínio cai no app
      // normal.
      {
        source: "/",
        has: [{ type: "host", value: "vender.industria24.com.br" }],
        destination: "/venda-no-industria",
      },
    ];
  },
};

// org/project e SENTRY_AUTH_TOKEN só são usados no build da Vercel para
// upload de source maps; ausentes, o build segue sem upload (só um aviso).
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
  disableLogger: true,
});
