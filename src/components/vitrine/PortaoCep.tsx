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
    <div className="border-b border-white/10 bg-aco-900/70 backdrop-blur-sm">
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
  );
}
