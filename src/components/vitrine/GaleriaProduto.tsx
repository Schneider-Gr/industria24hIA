"use client";

import { useRef, useState } from "react";
import { BotaoFavorito } from "@/components/vitrine/BotaoFavorito";
import { BotaoCompartilhar } from "@/components/vitrine/BotaoCompartilhar";

// Galeria interativa (DESIGN.md, padrão 2026-07-17, inspirado no Mercado
// Livre): miniaturas clicáveis trocam a foto principal sem reload. Recebe
// exatamente as `produto_imagens` já buscadas hoje na página de produto —
// nenhuma mudança de schema.

type ImagemProduto = { url: string; ordem: number };

export function GaleriaProduto({
  imagens,
  nomeProduto,
  produtoId,
}: {
  imagens: ImagemProduto[];
  nomeProduto: string;
  produtoId: string;
}) {
  const ordenadas = [...imagens].sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));
  const [ativa, setAtiva] = useState(0);
  const inicioX = useRef(0);

  if (ordenadas.length === 0) {
    return (
      <div className="mx-auto flex aspect-square w-full max-w-[280px] sm:max-w-[360px] items-center justify-center rounded-sm border border-[#E5E7EB] bg-[#F3F4F6]">
        <span className="text-sm text-[#7C7C7C]">Sem foto</span>
      </div>
    );
  }

  const indiceAtivo = Math.min(ativa, ordenadas.length - 1);
  const principal = ordenadas[indiceAtivo];

  // Swipe touch (mobile): compara X inicial e final do toque, sem lib —
  // troca de foto no threshold de 40px, mesmo estado (setAtiva) do clique
  // na miniatura que já existe.
  function aoTocarInicio(e: React.TouchEvent) {
    inicioX.current = e.touches[0].clientX;
  }
  function aoTocarFim(e: React.TouchEvent) {
    const deltaX = e.changedTouches[0].clientX - inicioX.current;
    if (Math.abs(deltaX) < 40 || ordenadas.length < 2) return;
    setAtiva((i) => {
      const proximo = deltaX < 0 ? i + 1 : i - 1;
      return Math.max(0, Math.min(ordenadas.length - 1, proximo));
    });
  }

  return (
    <div className="space-y-3">
      <div
        className="relative mx-auto aspect-square w-full max-w-[280px] touch-pan-y select-none overflow-hidden rounded-sm border border-[#E5E7EB] bg-white sm:max-w-[360px]"
        onTouchStart={aoTocarInicio}
        onTouchEnd={aoTocarFim}
      >
        <img
          src={principal.url}
          alt={nomeProduto}
          className="h-full w-full object-cover"
        />

        <div className="absolute right-3 top-3 flex flex-col gap-2">
          <BotaoFavorito produtoId={produtoId} />
          <BotaoCompartilhar titulo={nomeProduto} />
        </div>

        {ordenadas.length > 1 && (
          <>
            <span className="absolute bottom-3 right-3 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-semibold text-white">
              {indiceAtivo + 1} / {ordenadas.length}
            </span>
            <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
              {ordenadas.map((img, i) => (
                <span
                  key={`dot-${img.url}-${img.ordem}`}
                  className={`h-1.5 rounded-full transition-all ${
                    i === indiceAtivo ? "w-4 bg-lm-azul" : "w-1.5 bg-white/70"
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>
      {ordenadas.length > 1 && (
        <div className="mx-auto grid max-w-[280px] sm:max-w-[360px] grid-cols-4 gap-2">
          {ordenadas.map((img, i) => (
            <button
              key={`${img.url}-${img.ordem}`}
              type="button"
              onClick={() => setAtiva(i)}
              aria-label={`Ver foto ${i + 1} de ${ordenadas.length}`}
              aria-pressed={i === indiceAtivo}
              className={`aspect-square overflow-hidden rounded-sm bg-white transition-colors ${
                i === indiceAtivo
                  ? "border-2 border-lm-azul"
                  : "border border-[#E5E7EB] hover:border-lm-azul/50"
              }`}
            >
              <img src={img.url} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
