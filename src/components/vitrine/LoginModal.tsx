"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { FormularioLogin } from "@/components/vitrine/FormularioLogin";
import { ContasTeste } from "@/components/vitrine/ContasTeste";

/**
 * "Entrar" do header abre um card translúcido sobre a página atual — a
 * vitrine continua visível por baixo, sem trocar de rota. A página /login
 * segue existindo para acesso direto e para os redirects de sessão.
 */
export function LoginModal() {
  const [aberto, setAberto] = useState(false);
  const [aba, setAba] = useState<"entrar" | "testes">("entrar");
  const pathname = usePathname();

  useEffect(() => {
    if (!aberto) return;
    function aoTeclar(e: KeyboardEvent) {
      if (e.key === "Escape") setAberto(false);
    }
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [aberto]);

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        aria-haspopup="dialog"
        aria-expanded={aberto}
        className="rounded-sm px-3 py-1.5 text-[13px] tracking-[0.04em] text-white/90 transition-colors hover:bg-white/10 hover:text-white"
      >
        Entrar
      </button>

      {aberto && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Entrar"
          onClick={() => setAberto(false)}
          className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-aco-900/40 px-4 py-16 backdrop-blur-[2px]"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[330px] rounded-md border border-white/40 bg-white/85 p-4 shadow-[0_16px_48px_rgba(15,26,36,.28)] backdrop-blur-md"
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="font-display text-base font-semibold uppercase tracking-[0.08em] text-ink">
                  Entrar
                </h2>
                <p className="mt-1 text-[12px] text-ink-2">
                  {aba === "entrar"
                    ? "Acesse o painel da sua loja ou a administração."
                    : "Atalhos por módulo (ambiente de testes)."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAberto(false)}
                aria-label="Fechar"
                className="-mr-1 -mt-1 rounded-sm px-2 py-1 text-lg leading-none text-ink-2 hover:bg-aco-100 hover:text-aco-600"
              >
                ×
              </button>
            </div>

            <div className="mb-4 flex gap-1 border-b border-line">
              {(["entrar", "testes"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  role="tab"
                  aria-selected={aba === t}
                  onClick={() => setAba(t)}
                  className={`-mb-px border-b-2 px-3 py-1.5 text-[12px] tracking-[0.04em] transition-colors ${
                    aba === t
                      ? "border-sinal font-medium text-ink"
                      : "border-transparent text-ink-2 hover:text-aco-600"
                  }`}
                >
                  {t === "entrar" ? "Entrar" : "Contas de teste"}
                </button>
              ))}
            </div>

            {aba === "entrar" ? (
              <FormularioLogin next={pathname} aoEntrar={() => setAberto(false)} />
            ) : (
              <ContasTeste aoEntrar={() => setAberto(false)} />
            )}
          </div>
        </div>
      )}
    </>
  );
}
