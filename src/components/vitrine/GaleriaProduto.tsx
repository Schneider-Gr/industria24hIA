"use client";

import { useState } from "react";

// Galeria interativa (DESIGN.md, padrão 2026-07-17, inspirado no Mercado
// Livre): miniaturas clicáveis trocam a foto principal sem reload. Recebe
// exatamente as `produto_imagens` já buscadas hoje na página de produto —
// nenhuma mudança de schema.

type ImagemProduto = { url: string; ordem: number };

export function GaleriaProduto({
  imagens,
  nomeProduto,
}: {
  imagens: ImagemProduto[];
  nomeProduto: string;
}) {
  const ordenadas = [...imagens].sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));
  const [ativa, setAtiva] = useState(0);

  if (ordenadas.length === 0) {
    return (
      <div className="flex aspect-square w-full items-center justify-center rounded-sm border border-[#E5E7EB] bg-[#F3F4F6]">
        <span className="text-sm text-[#7C7C7C]">Sem foto</span>
      </div>
    );
  }

  const indiceAtivo = Math.min(ativa, ordenadas.length - 1);
  const principal = ordenadas[indiceAtivo];

  return (
    <div className="space-y-3">
      <div className="relative aspect-square w-full overflow-hidden rounded-sm border border-[#E5E7EB] bg-white">
        <img
          src={principal.url}
          alt={nomeProduto}
          className="h-full w-full object-cover"
        />

        {/* Favoritar: sem tabela de favoritos no schema — botão decorativo
            desabilitado em vez de fingir que salva algo (CLAUDE.md regra 1). */}
        <button
          type="button"
          disabled
          title="Favoritos ainda não estão disponíveis"
          className="absolute right-3 top-3 flex h-10 w-10 cursor-not-allowed items-center justify-center rounded-full bg-red-signal/90 text-white shadow-md"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M20.8 8.6c0 5.6-8.8 10.6-8.8 10.6S3.2 14.2 3.2 8.6a5.4 5.4 0 0 1 9.6-3.4 5.4 5.4 0 0 1 8 3.4z" />
          </svg>
        </button>

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
                    i === indiceAtivo ? "w-4 bg-purple-royal" : "w-1.5 bg-white/70"
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>
      {ordenadas.length > 1 && (
        <div className="grid grid-cols-4 gap-2">
          {ordenadas.map((img, i) => (
            <button
              key={`${img.url}-${img.ordem}`}
              type="button"
              onClick={() => setAtiva(i)}
              aria-label={`Ver foto ${i + 1} de ${ordenadas.length}`}
              aria-pressed={i === indiceAtivo}
              className={`aspect-square overflow-hidden rounded-sm bg-white transition-colors ${
                i === indiceAtivo
                  ? "border-2 border-aco-600"
                  : "border border-[#E5E7EB] hover:border-aco-600/50"
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
