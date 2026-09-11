import { MetaPixel } from "@/components/MetaPixel";

// Escopo do pixel: só a landing de captação de seller. É o único tráfego que a
// campanha do Meta paga hoje, e manter o pixel fora da vitrine evita mandar
// para a Meta a navegação de compra de quem nunca viu um anúncio.
export default function VendaNoIndustriaLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <MetaPixel />
    </>
  );
}
