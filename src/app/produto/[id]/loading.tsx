import { VitrineHeader, VitrineFooter } from "@/components/vitrine/ui";

/** Esqueleto da PDP: medidas próximas do conteúdo final (galeria + painel) para
 * não haver layout shift — mesmo padrão de src/components/vitrine/Skeletons.tsx. */
export default function ProdutoLoading() {
  return (
    <>
      <VitrineHeader />
      <main className="mx-auto max-w-[1280px] px-4 py-5 pb-28 md:py-7 md:pb-8">
        <div className="mb-3 h-4 w-40 animate-pulse rounded-sm bg-line/60" />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-10">
          <div className="aspect-square w-full animate-pulse rounded-sm bg-line/60" />
          <div className="flex flex-col gap-4">
            <div className="h-4 w-32 animate-pulse rounded-sm bg-line/60" />
            <div className="h-7 w-3/4 animate-pulse rounded-sm bg-line/60" />
            <div className="h-24 w-full animate-pulse rounded-md bg-line/40" />
          </div>
        </div>
      </main>
      <VitrineFooter />
    </>
  );
}
