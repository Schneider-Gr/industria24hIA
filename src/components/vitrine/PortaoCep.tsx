import { CepBar } from "@/components/vitrine/CepBar";

/**
 * Faixa translúcida sobre o topo da vitrine quando não há CEP, com ou sem
 * sessão. Desde 08/09/2026 a home não lista produto antes do CEP (padrão
 * Mercado Livre), então esta faixa e o `CardLocalizacao` são o caminho para a
 * vitrine, não um aviso opcional. Com CEP salvo, vale a regra de esconder
 * loja e produto fora da faixa de cobertura.
 */
export function PortaoCep() {
  return (
    <>
      {/* Desktop: faixa no topo, empurrando o conteúdo. */}
      <div className="hidden border-b border-white/10 bg-lm-marinho/70 backdrop-blur-sm sm:block">
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-center gap-x-4 gap-y-2 px-4 py-2 text-center sm:px-6">
          <p className="text-xs tracking-[0.04em] text-white/80">
            Informe o seu CEP para ver os produtos que chegam até você.
          </p>
          <CepBar autoAbrir />
        </div>
      </div>

      {/* Mobile: card flutuante translúcido no rodapé — banner e produtos
          continuam visíveis por baixo em vez de serem empurrados para fora
          da primeira dobra. */}
      <div className="fixed inset-x-3 bottom-3 z-40 rounded-md border border-white/15 bg-lm-marinho/85 px-3 py-2.5 shadow-lg backdrop-blur-sm sm:hidden">
        <p className="text-[11px] leading-snug tracking-[0.04em] text-white/85">
          Informe o CEP para ver os produtos que chegam até você.
        </p>
        <div className="mt-1.5 flex items-center gap-2">
          <CepBar />
        </div>
      </div>
    </>
  );
}
