/**
 * Placeholders de carregamento. Nunca spinner central: as barras têm as
 * mesmas medidas do conteúdo final de `ProdutoCard` (aspect-square, nome de
 * 2 linhas com min-h-[2.5em], preço 18px) para não haver layout shift.
 */

export function SkeletonProdutoCard() {
  return (
    <div className="flex flex-col overflow-hidden rounded-md border border-line bg-surface">
      <div className="aspect-square w-full animate-pulse bg-[#F3F4F6]" />
      <div className="flex flex-1 flex-col p-3">
        <div className="min-h-[2.5em] space-y-1">
          <div className="h-[0.9em] w-full animate-pulse rounded-sm bg-[#F3F4F6]" />
          <div className="h-[0.9em] w-3/5 animate-pulse rounded-sm bg-[#F3F4F6]" />
        </div>
        <div className="mt-auto pt-1">
          <div className="h-[18px] w-24 animate-pulse rounded-sm bg-[#F3F4F6]" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonGradeProdutos({ quantidade = 6 }: { quantidade?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-6">
      {Array.from({ length: quantidade }, (_, i) => (
        <SkeletonProdutoCard key={i} />
      ))}
    </div>
  );
}

/** Faixa de chips de data do mercado futuro. */
export function SkeletonChips({ quantidade = 6 }: { quantidade?: number }) {
  return (
    <div className="flex gap-2 overflow-hidden pb-2">
      {Array.from({ length: quantidade }, (_, i) => (
        <div key={i} className="h-[38px] w-[130px] shrink-0 animate-pulse rounded-md bg-[#F3F4F6]" />
      ))}
    </div>
  );
}

export function SkeletonTituloSecao() {
  return (
    <div className="mb-4 space-y-2">
      <div className="h-3 w-28 animate-pulse rounded-sm bg-[#F3F4F6]" />
      <div className="h-7 w-64 animate-pulse rounded-sm bg-[#F3F4F6]" />
    </div>
  );
}
