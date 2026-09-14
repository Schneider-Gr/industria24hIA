"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { BotaoNarrar, pararNarracao } from "@/components/seller/BotaoNarrar";
import { PASSOS } from "@/lib/seller/tour-passos";


type TourContextValue = {
  iniciar: () => void;
  /** Começa o tour no passo da rota dada; `false` se a rota não tem passo. */
  iniciarNaRota: (href: string) => boolean;
  temPasso: (href: string) => boolean;
  ativo: boolean;
};
const TourContext = createContext<TourContextValue | null>(null);

// Consumido pelo botão flutuante de ajuda, que precisa saber se vale oferecer
// "ver o tour desta tela" e se some enquanto o balão do tour está na frente.
export function useTour() {
  return useContext(TourContext);
}

// Botão de entrada do tour — usado na página de Tutoriais. Fica fora do
// TourProvider (não precisa saber o estado, só disparar o início).
export function TourTrigger() {
  const ctx = useContext(TourContext);
  if (!ctx) return null;
  return (
    <button
      type="button"
      onClick={ctx.iniciar}
      className="rounded-lg bg-lm-azul px-4 py-2 text-sm font-semibold text-white hover:bg-lm-azul-escuro"
    >
      Iniciar tour guiado
    </button>
  );
}

// Provider + overlay do tour. Montado uma vez no SellerShell (persiste em
// memória entre navegações dentro do (seller) layout — não precisa
// sincronizar com storage porque o layout não desmonta ao trocar de rota).
export function TourProvider({ children }: { children: React.ReactNode }) {
  const [ativo, setAtivo] = useState(false);
  const [passo, setPasso] = useState(0);
  const pathname = usePathname();
  const router = useRouter();

  function iniciar() {
    setPasso(0);
    setAtivo(true);
    if (pathname !== PASSOS[0].href) router.push(PASSOS[0].href);
  }

  function temPasso(href: string) {
    return PASSOS.some((p) => p.href === href);
  }

  // Entrada pelo botão de ajuda da própria tela: o tour abre já no passo que
  // fala dela, em vez de mandar o seller de volta ao passo 1 do dashboard.
  function iniciarNaRota(href: string) {
    const i = PASSOS.findIndex((p) => p.href === href);
    if (i < 0) return false;
    setPasso(i);
    setAtivo(true);
    return true;
  }

  function irParaPasso(i: number) {
    setPasso(i);
    if (pathname !== PASSOS[i].href) router.push(PASSOS[i].href);
  }

  function encerrar() {
    pararNarracao();
    setAtivo(false);
  }

  const step = PASSOS[passo];
  const naTelaCerta = pathname === step.href;

  // Âncora do passo: o item correspondente no menu lateral (sempre montado).
  // O balão se move até ele e um anel destaca o alvo — o usuário segue o menu
  // passo a passo. Recalcula ao trocar de passo/rota e em scroll/resize; tenta
  // por ~600ms após navegar, porque o link só ganha destaque depois do paint.
  const [rect, setRect] = useState<DOMRect | null>(null);
  useEffect(() => {
    // Quando inativo o overlay não é renderizado (gate `ativo &&`), então não
    // precisamos limpar o rect síncronamente aqui — só não medimos.
    if (!ativo) return;
    const alvo = () =>
      document.querySelector<HTMLElement>(
        `nav[aria-label="Menu do vendedor"] a[href="${step.href}"]`,
      );
    let raf = 0;
    const medir = () => {
      const el = alvo();
      setRect(el ? el.getBoundingClientRect() : null);
    };
    // Retry curto pós-navegação até o alvo aparecer/estabilizar. A 1ª medição
    // sai num rAF (não síncrona no corpo do effect) para não cascatear render.
    const inicio = performance.now();
    const loop = () => {
      medir();
      if (performance.now() - inicio < 600) raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    window.addEventListener("scroll", medir, true);
    window.addEventListener("resize", medir);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", medir, true);
      window.removeEventListener("resize", medir);
    };
  }, [ativo, passo, pathname, step.href]);

  // Balão junto ao alvo quando ancorado; senão, canto inferior ESQUERDO — o
  // direito é do FAB de Atendimento (z-50), que passaria por cima.
  const ancorado = naTelaCerta && rect != null;
  const dialogStyle: React.CSSProperties = ancorado
    ? {
        top: `clamp(0.5rem, ${rect.top}px, calc(100vh - 20rem))`,
        left: `min(${rect.right + 12}px, calc(100vw - min(360px, 100vw - 2rem) - 0.5rem))`,
      }
    : { bottom: "1rem", left: "1rem" };

  return (
    <TourContext.Provider value={{ iniciar, iniciarNaRota, temPasso, ativo }}>
      {children}
      {ativo && ancorado && (
        <div
          aria-hidden
          className="pointer-events-none fixed z-40 rounded-md ring-2 ring-lm-amarelo ring-offset-2 ring-offset-lm-marinho transition-all duration-200"
          style={{
            top: rect.top - 2,
            left: rect.left - 2,
            width: rect.width + 4,
            height: rect.height + 4,
          }}
        />
      )}
      {ativo && (
        <div
          role="dialog"
          aria-label="Tour guiado"
          style={dialogStyle}
          className="fixed z-50 w-[min(24rem,calc(100vw-2rem))] rounded-xl bg-lm-marinho p-5 text-white shadow-2xl ring-1 ring-white/15"
        >
          <div className="mb-1 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-lm-amarelo">
              Passo {passo + 1} de {PASSOS.length}
            </span>
            <button type="button" onClick={encerrar} aria-label="Fechar tour" className="text-white/70 hover:text-white">
              ✕
            </button>
          </div>
          <h3 className="mb-1 font-display text-lg font-semibold text-white">{step.titulo}</h3>
          <p className="mb-3 text-sm leading-relaxed text-white/90">{step.texto}</p>
          <div className="mb-4">
            <BotaoNarrar key={step.audio} audio={step.audio} texto={`${step.titulo}. ${step.texto}`} />
          </div>

          {!naTelaCerta && (
            <button
              type="button"
              onClick={() => router.push(step.href)}
              className="mb-3 w-full rounded-lg border border-white/30 px-3 py-2 text-sm font-semibold text-white hover:bg-white/10"
            >
              Ir para esta tela
            </button>
          )}

          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              disabled={passo === 0}
              onClick={() => irParaPasso(passo - 1)}
              className="rounded-lg border border-white/30 px-3 py-2 text-sm text-white hover:bg-white/10 disabled:opacity-40"
            >
              Voltar
            </button>
            {passo < PASSOS.length - 1 ? (
              <button
                type="button"
                onClick={() => irParaPasso(passo + 1)}
                className="rounded-lg bg-lm-amarelo px-4 py-2 text-sm font-semibold text-lm-marinho hover:brightness-95"
              >
                Próximo
              </button>
            ) : (
              <button
                type="button"
                onClick={encerrar}
                className="rounded-lg bg-ok px-4 py-2 text-sm font-semibold text-white"
              >
                Concluir
              </button>
            )}
          </div>
        </div>
      )}
    </TourContext.Provider>
  );
}
