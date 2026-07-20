import Link from "next/link";
import { CepBar } from "@/components/vitrine/CepBar";

/**
 * Home sem CEP e sem sessão: em vez de listar produtos de qualquer região,
 * pede o CEP (ou login). Produtos fora da faixa de cobertura da loja nunca
 * aparecem — a mesma regra já aplicada em home, categoria e busca.
 */
export function PortaoCep() {
  return (
    <section className="mx-auto max-w-[560px] px-4 py-16 text-center sm:px-6">
      <h1 className="font-display text-xl font-bold uppercase tracking-[0.08em] text-ink">
        Onde você quer receber?
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-ink-2">
        Informe o seu CEP para ver os produtos das indústrias que entregam na
        sua região. Só mostramos o que realmente chega até você.
      </p>

      <div className="mt-6 flex flex-col items-center gap-3">
        <div className="rounded-sm bg-aco-900 px-4 py-2">
          <CepBar />
        </div>
        <p className="text-xs text-muted">
          Já tem conta?{" "}
          <Link href="/login" className="text-aco-600 underline underline-offset-2">
            Entrar
          </Link>
        </p>
      </div>
    </section>
  );
}
