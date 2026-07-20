"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { FormularioLogin } from "@/components/vitrine/FormularioLogin";

/**
 * "Entrar" do header abre um card translúcido sobre a página atual — a
 * vitrine continua visível por baixo, sem trocar de rota. A página /login
 * segue existindo para acesso direto e para os redirects de sessão.
 */
export function LoginModal() {
  const [aberto, setAberto] = useState(false);
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
            className="w-full max-w-[400px] rounded-md border border-white/40 bg-white/85 p-5 shadow-[0_16px_48px_rgba(15,26,36,.28)] backdrop-blur-md"
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="font-display text-base font-semibold uppercase tracking-[0.08em] text-ink">
                  Entrar
                </h2>
                <p className="mt-1 text-[13px] text-ink-2">
                  Acesse o painel da sua loja ou a administração.
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

            <FormularioLogin next={pathname} aoEntrar={() => setAberto(false)} />
          </div>
        </div>
      )}
    </>
  );
}
