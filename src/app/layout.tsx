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

export const metadata: Metadata = {
  title: "Indústria 24h",
  description: "Marketplace B2B industrial da Amazônia — compre direto da indústria.",
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
