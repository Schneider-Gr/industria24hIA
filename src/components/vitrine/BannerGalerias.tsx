"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export type CardGaleria = {
  titulo: string;
  img: string;
  href: string;
  badge?: string;
};

/**
 * Faixa com rolagem lateral genérica (padrão "Benefícios em entretenimento"
 * do ML). Reaproveitada tanto pelos banners fixos (`BannerGalerias` abaixo)
 * quanto pelas galerias dinâmicas de produto da home (`vitrine_galerias`) —
 * cada chamador decide o que renderizar via `renderItem`. Autoplay é opt-in
 * via `autoplayMs` (usado só pelos banners de campanha, não pelas galerias
 * de produto).
 */
export function GaleriaCarrossel<T>({
  titulo,
  itens,
  keyFn,
  renderItem,
  itemClassName = "w-[45%] shrink-0 snap-start sm:w-[30%] md:w-[22%] lg:w-[15%]",
  verTodosHref,
  autoplayMs,
  className = "group mx-auto mt-10 max-w-[1280px] px-4 sm:px-6",
  trilhoClassName = "",
}: {
  /** Vazio esconde o cabeçalho (fileira sem título, como a primeira da home). */
  titulo: string;
  itens: T[];
  keyFn: (item: T) => string;
  renderItem: (item: T) => React.ReactNode;
  itemClassName?: string;
  verTodosHref?: string;
  /** Intervalo em ms pra rolar 1 "página" por vez, voltando ao início ao chegar no fim. */
  autoplayMs?: number;
  /** Classes da <section>, pra quem precisa de posicionamento próprio. */
  className?: string;
  /** Classes extras do trilho de rolagem (sombra dos cards, por exemplo). */
  trilhoClassName?: string;
}) {
  const trilhoRef = useRef<HTMLDivElement>(null);
  const [pausado, setPausado] = useState(false);
  const [podeVoltar, setPodeVoltar] = useState(false);
  const [podeAvancar, setPodeAvancar] = useState(false);

  // Setas visíveis nos dois lados sempre que houver o que rolar, desabilitadas
  // nas extremidades. O ResizeObserver reavalia quando a largura muda (troca
  // de breakpoint, imagens carregando).
  useEffect(() => {
    const el = trilhoRef.current;
    if (!el) return;
    const avaliar = () => {
      const folga = el.scrollWidth - el.clientWidth;
      setPodeVoltar(el.scrollLeft > 4);
      setPodeAvancar(folga > 4 && el.scrollLeft < folga - 4);
    };
    avaliar();
    el.addEventListener("scroll", avaliar, { passive: true });
    const ro = new ResizeObserver(avaliar);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", avaliar);
      ro.disconnect();
    };
  }, [itens.length]);

  useEffect(() => {
    if (!autoplayMs || itens.length <= 1 || pausado) return;
    const id = setInterval(() => {
      const el = trilhoRef.current;
      if (!el) return;
      const fimDoScroll = el.scrollWidth - el.clientWidth - 4;
      if (el.scrollLeft >= fimDoScroll) {
        el.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        el.scrollBy({ left: el.clientWidth * 0.8, behavior: "smooth" });
      }
    }, autoplayMs);
    return () => clearInterval(id);
  }, [autoplayMs, itens.length, pausado]);

  if (itens.length === 0) return null;

  function rolar(direcao: 1 | -1) {
    const el = trilhoRef.current;
    if (!el) return;
    el.scrollBy({ left: direcao * el.clientWidth * 0.8, behavior: "smooth" });
  }

  return (
    <section className={className}>
      {(titulo || verTodosHref) && (
        <div className="mb-3 flex items-baseline justify-between gap-4">
          <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-ink sm:text-base">
            {titulo}
          </h2>
          {verTodosHref && (
            <Link
              href={verTodosHref}
              className="text-[13px] tracking-[0.04em] text-lm-azul hover:underline"
            >
              Ver todos
            </Link>
          )}
        </div>
      )}

      <div className="relative">
        <div
          ref={trilhoRef}
          onMouseEnter={() => setPausado(true)}
          onMouseLeave={() => setPausado(false)}
          onFocus={() => setPausado(true)}
          onBlur={() => setPausado(false)}
          className={`scroll-chips flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 ${trilhoClassName}`}
        >
          {itens.map((item) => (
            <div key={keyFn(item)} className={itemClassName}>
              {renderItem(item)}
            </div>
          ))}
        </div>

        {(podeVoltar || podeAvancar) && (
          <>
            <button
              type="button"
              aria-label="Anterior"
              onClick={() => rolar(-1)}
              disabled={!podeVoltar}
              className="absolute -left-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-surface text-lg text-ink shadow-[0_2px_10px_rgba(15,26,36,.18)] transition-opacity hover:border-lm-azul hover:text-lm-azul disabled:pointer-events-none disabled:opacity-0 sm:-left-3"
            >
              ‹
            </button>
            <button
              type="button"
              aria-label="Próximo"
              onClick={() => rolar(1)}
              disabled={!podeAvancar}
              className="absolute -right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-surface text-lg text-ink shadow-[0_2px_10px_rgba(15,26,36,.18)] transition-opacity hover:border-lm-azul hover:text-lm-azul disabled:pointer-events-none disabled:opacity-0 sm:-right-3"
            >
              ›
            </button>
          </>
        )}
      </div>
    </section>
  );
}

/** Faixa de cards promocionais fixos (banners de campanha, sem tabela própria). */
export function BannerGalerias({
  titulo,
  cards,
  verTodosHref,
  itemClassName = "w-[62%] shrink-0 snap-start sm:w-[38%] lg:w-[calc((100%-3*0.75rem)/4)]",
  aspectClassName = "aspect-[21/9]",
  mostrarTitulo = true,
}: {
  titulo: string;
  cards: CardGaleria[];
  verTodosHref?: string;
  /** Largura de cada card na faixa (quantos cabem por linha). */
  itemClassName?: string;
  /** Proporção da arte. Banners retrato (faixa do meio) usam aspect-[5/6]. */
  aspectClassName?: string;
  /** Off quando a arte já traz o texto embutido — o overlay preto só atrapalha. */
  mostrarTitulo?: boolean;
}) {
  return (
    <GaleriaCarrossel
      titulo={titulo}
      itens={cards}
      keyFn={(card) => card.href + card.titulo}
      verTodosHref={verTodosHref}
      itemClassName={itemClassName}
      autoplayMs={4500}
      renderItem={(card) => (
        <Link href={card.href} className="relative block overflow-hidden rounded-md">
          <div className={`${aspectClassName} w-full bg-[#F3F4F6]`}>
            <img src={card.img} alt="" className="h-full w-full object-cover" />
          </div>
          {card.badge && (
            <span className="absolute right-2 top-2 rounded-sm bg-lm-azul px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.04em] text-white">
              {card.badge}
            </span>
          )}
          {mostrarTitulo && (
            <span className="absolute bottom-0 left-0 right-0 bg-black/55 p-3 text-sm font-semibold text-white">
              {card.titulo}
            </span>
          )}
        </Link>
      )}
    />
  );
}
