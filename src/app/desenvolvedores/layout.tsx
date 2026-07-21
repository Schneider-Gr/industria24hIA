import { VitrineHeader, VitrineFooter } from "@/components/vitrine/ui";

// Documentação técnica (estática). O passo a passo do usuário final fica em
// /integracoes; aqui é a referência para quem escreve código.
export default function DesenvolvedoresLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white">
      <VitrineHeader />
      <main className="mx-auto max-w-[880px] px-4 py-10 sm:px-6">{children}</main>
      <VitrineFooter />
    </div>
  );
}
