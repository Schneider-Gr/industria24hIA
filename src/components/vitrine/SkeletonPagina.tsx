import { VitrineHeader, VitrineFooter } from "@/components/vitrine/ui";
import { SkeletonGradeProdutos, SkeletonTituloSecao } from "@/components/vitrine/Skeletons";

/** Esqueleto de página de listagem da vitrine (home, categoria, busca). */
export function SkeletonPagina({ secoes = 2 }: { secoes?: number }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <VitrineHeader />
      <main className="flex-1">
        {Array.from({ length: secoes }, (_, i) => (
          <section key={i} className="mx-auto mt-8 max-w-[1280px] px-4 sm:px-6">
            <SkeletonTituloSecao />
            <SkeletonGradeProdutos />
          </section>
        ))}
      </main>
      <VitrineFooter />
    </div>
  );
}
