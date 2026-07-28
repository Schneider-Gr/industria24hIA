import type { Metadata } from "next";
import { Archivo, Inter } from "next/font/google";
import "./globals.css";
import { CarrinhoProvider } from "@/components/carrinho/carrinho";
import { ChatWidget } from "@/components/bot/ChatWidget";
import { TabBarMobile } from "@/components/vitrine/TabBarMobile";

// Identidade "Aço & Sinal" (DESIGN.md 2026-07-16): Archivo nos títulos
// (display industrial), Inter no corpo/UI e números (tabular).
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

const SITE_URL = "https://industria24.com.br";
const DESCRICAO =
  "Compre direto da indústria de Manaus, sem atravessador — marketplace B2B com entrega rápida.";

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
    <html lang="pt-BR" className={`${inter.variable} ${archivo.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <CarrinhoProvider>
          <div className="pb-14 md:pb-0">{children}</div>
        </CarrinhoProvider>
        <ChatWidget />
        <TabBarMobile />
      </body>
    </html>
  );
}
