"use client";

import { useId, useState } from "react";
import { buscarDica } from "@/lib/seller/dicas";

// Ajuda contextual ao lado da configuração (spec
// `seller-ajuda-contextual/dicas-campo`). Duas variantes, escolhidas pelo
// peso da dica na fonte de dados: `fixa` sempre visível (campo cujo erro
// custa dinheiro), `sob-demanda` atrás de um botão. Sem hover: o seller opera
// no celular.

function MarcaRascunho() {
  return (
    <span className="mt-1 block text-[11px] italic text-muted">
      Explicação preliminar, em revisão pela equipe.
    </span>
  );
}

export function Dica({ tela, campo }: { tela: string; campo: string }) {
  const dica = buscarDica(tela, campo);
  const painelId = useId();
  const [aberta, setAberta] = useState(false);

  // Campo sem dica cadastrada não reserva espaço nem mostra ícone vazio.
  if (!dica) return null;

  const rascunho = dica.origem === "rascunho";

  if (dica.peso === "fixa") {
    return (
      <span className="mt-1 block text-xs leading-relaxed text-muted">
        {dica.texto}
        {rascunho && <MarcaRascunho />}
      </span>
    );
  }

  return (
    <span className="mt-1 block">
      <button
        type="button"
        onClick={() => setAberta((v) => !v)}
        aria-expanded={aberta}
        aria-controls={painelId}
        className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-line text-[11px] font-semibold text-muted hover:border-aco-600 hover:text-aco-600"
      >
        ?<span className="sr-only">Ajuda sobre este campo</span>
      </button>
      {aberta && (
        <span
          id={painelId}
          className="mt-1 block rounded border border-line bg-surface p-2 text-xs leading-relaxed text-ink-2"
        >
          {dica.texto}
          {rascunho && <MarcaRascunho />}
        </span>
      )}
    </span>
  );
}
