import Link from "next/link";
import { CepBar } from "@/components/vitrine/CepBar";

/**
 * Faixa translúcida sobre o topo da vitrine quando não há CEP nem sessão:
 * pede o CEP sem bloquear a navegação — os produtos seguem listados abaixo.
 * Com CEP salvo, vale a regra já existente de esconder loja/produto fora da
 * faixa de cobertura.
 */
export function PortaoCep() {
  return (
    <>
      {/* Desktop: faixa no topo, empurrando o conteúdo. */}
      <div className="hidden border-b border-white/10 bg-aco-900/70 backdrop-blur-sm sm:block">
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-center gap-x-4 gap-y-2 px-4 py-2 text-center sm:px-6">
          <p className="text-xs tracking-[0.04em] text-white/80">
            Informe o seu CEP para ver só os produtos que chegam até você.
          </p>
          <CepBar />
          <p className="text-xs text-white/60">
            ou{" "}
            <Link href="/login" className="text-white underline underline-offset-2">
              entrar
            </Link>
          </p>
        </div>
      </div>

      {/* Mobile: card flutuante translúcido no rodapé — banner e produtos
          continuam visíveis por baixo em vez de serem empurrados para fora
          da primeira dobra. */}
      <div className="fixed inset-x-3 bottom-3 z-40 rounded-md border border-white/15 bg-aco-900/85 px-3 py-2.5 shadow-lg backdrop-blur-sm sm:hidden">
        <p className="text-[11px] leading-snug tracking-[0.04em] text-white/85">
          Veja só os produtos que chegam até você.
        </p>
        <div className="mt-1.5 flex items-center justify-between gap-2">
          <CepBar />
          <Link
            href="/login"
            className="text-[11px] text-white/70 underline underline-offset-2"
          >
            entrar
          </Link>
        </div>
      </div>
    </>
  );
}
