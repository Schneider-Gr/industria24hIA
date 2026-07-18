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
      <div className="aspect-square w-full overflow-hidden rounded-sm border border-[#E5E7EB] bg-white">
        <img
          src={principal.url}
          alt={nomeProduto}
          className="h-full w-full object-cover"
        />
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
                  ? "border-2 border-roxo-800"
                  : "border border-[#E5E7EB] hover:border-roxo-800/50"
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
