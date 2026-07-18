"use client";

import { useState } from "react";

type Imagem = { url: string; ordem: number };

/**
 * Galeria da página de produto: imagem principal + thumbnails clicáveis
 * (thumbnail ativo com borda aco-600, identidade "Aço & Sinal"). Só client
 * por causa da troca de imagem selecionada — os dados vêm do server.
 */
export function GaleriaProduto({ imagens, nome }: { imagens: Imagem[]; nome: string }) {
  const [ativa, setAtiva] = useState(0);

  if (imagens.length === 0) {
    return (
      <div className="flex aspect-square w-full items-center justify-center rounded-sm border border-[#E5E7EB] bg-[#F3F4F6]">
        <span className="text-sm text-[#7C7C7C]">Sem foto</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="aspect-square w-full overflow-hidden rounded-sm border border-[#E5E7EB] bg-white">
        <img src={imagens[ativa].url} alt={nome} className="h-full w-full object-cover" />
      </div>
      {imagens.length > 1 && (
        <div className="grid grid-cols-5 gap-2">
          {imagens.map((img, i) => (
            <button
              key={img.url + img.ordem}
              type="button"
              onClick={() => setAtiva(i)}
              aria-label={`Ver imagem ${i + 1}`}
              aria-current={i === ativa}
              className={`aspect-square overflow-hidden rounded-sm border bg-white transition-colors ${
                i === ativa ? "border-2 border-aco-600" : "border-[#E5E7EB] hover:border-aco-600"
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
