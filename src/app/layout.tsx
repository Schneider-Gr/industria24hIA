import type { Metadata } from "next";
import { Geist, Instrument_Sans } from "next/font/google";
import "./globals.css";

// Fontes do DESIGN.md: Instrument Sans (corpo/UI), Geist (preços/dados),
// Cabinet Grotesk (títulos) via Fontshare no <head> — não existe no next/font/google.
const instrumentSans = Instrument_Sans({
  variable: "--font-instrument-sans",
  subsets: ["latin"],
});

const geist = Geist({
  variable: "--font-geist",
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
    <html
      lang="pt-BR"
      className={`${instrumentSans.variable} ${geist.variable} h-full antialiased`}
    >
      <head>
        <link
          href="https://api.fontshare.com/v2/css?f[]=cabinet-grotesk@500,700,800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
