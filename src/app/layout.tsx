import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { CarrinhoProvider } from "@/components/carrinho/carrinho";

// Fidelidade tipográfica ao site real (industria24h.com.br usa Inter em
// toda a UI) — decisão 2026-07-09, substitui a tipografia autoral anterior
// (Cabinet Grotesk/Instrument Sans/Geist) do DESIGN.md v1.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const SITE_URL = "https://industria24.com.br";
const DESCRICAO = "Marketplace B2B industrial da Amazônia — compre direto da indústria.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Indústria 24h",
    template: "%s · Indústria 24h",
  },
  description: DESCRICAO,
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
  },
  openGraph: {
    title: "Indústria 24h",
    description: DESCRICAO,
    url: SITE_URL,
    siteName: "Indústria 24h",
    images: [{ url: "/logo-industria24h.png", width: 231, height: 41, alt: "Indústria 24h" }],
    locale: "pt_BR",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Indústria 24h",
    description: DESCRICAO,
    images: ["/logo-industria24h.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col"><CarrinhoProvider>{children}</CarrinhoProvider></body>
    </html>
  );
}
