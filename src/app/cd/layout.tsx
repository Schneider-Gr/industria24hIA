import { MetaPixel } from "@/components/MetaPixel";

// Mesmo escopo do pixel de /venda-no-industria: só landing de captação de
// seller, nunca a vitrine. Aqui o público é o seller do Estoque Indústria.
export default function CdLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <MetaPixel />
    </>
  );
}
