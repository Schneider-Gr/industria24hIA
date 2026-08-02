"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ItemCarrinho } from "@/components/carrinho/carrinho";

// Modal de retenção (padrão Mercado Livre: avisar antes de sair, não bloquear).
// Escopo deliberadamente restrito à reserva de Venda Futura: é o único
// benefício do carrinho que realmente se perde ao sair (a reserva tem prazo
// e pode ser tomada por outro comprador) — o resto do carrinho persiste em
// localStorage normalmente, avisar sobre "perder o carrinho" seria falso.
export function ModalRetencaoCheckout({ itens }: { itens: ItemCarrinho[] }) {
  const router = useRouter();
  const [destinoPendente, setDestinoPendente] = useState<string | null>(null);
  const permitirSaida = useRef(false);
  const temReservaVendaFutura = itens.some((i) => i.venda_futura_id);

  useEffect(() => {
    if (!temReservaVendaFutura) return;

    function aoClicar(e: MouseEvent) {
      if (permitirSaida.current) return;
      const alvo = (e.target as HTMLElement)?.closest("a[href]") as HTMLAnchorElement | null;
      if (!alvo) return;
      const destino = new URL(alvo.href, window.location.href);
      if (destino.pathname === window.location.pathname) return; // âncora na mesma página
      e.preventDefault();
      e.stopPropagation();
      setDestinoPendente(destino.pathname + destino.search);
    }

    function aoTentarFechar(e: BeforeUnloadEvent) {
      e.preventDefault();
      e.returnValue = "";
    }

    document.addEventListener("click", aoClicar, true);
    window.addEventListener("beforeunload", aoTentarFechar);
    return () => {
      document.removeEventListener("click", aoClicar, true);
      window.removeEventListener("beforeunload", aoTentarFechar);
    };
  }, [temReservaVendaFutura]);

  if (!temReservaVendaFutura || !destinoPendente) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-4 sm:items-center" role="dialog" aria-modal="true">
      <div className="w-full max-w-sm rounded-md bg-white p-5 shadow-xl">
        <h2 className="font-display text-base font-bold text-ink">
          Você tem uma reserva do Mercado Futuro
        </h2>
        <p className="mt-2 text-sm text-ink-2">
          Se sair agora, sua reserva de preço travado não fica garantida — outro
          comprador pode reservar o lote antes de você voltar.
        </p>
        <div className="mt-4 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setDestinoPendente(null)}
            className="w-full rounded bg-lm-azul px-4 py-2.5 text-sm font-semibold text-white hover:bg-lm-azul-escuro"
          >
            Continuar comprando
          </button>
          <button
            type="button"
            onClick={() => {
              permitirSaida.current = true;
              router.push(destinoPendente);
            }}
            className="w-full rounded border border-line px-4 py-2.5 text-sm font-medium text-ink-2"
          >
            Sair mesmo assim
          </button>
        </div>
      </div>
    </div>
  );
}
