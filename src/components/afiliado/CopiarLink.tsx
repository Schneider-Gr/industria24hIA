"use client";

import { useState } from "react";

export function CopiarLink({ url }: { url: string }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      setCopiado(false);
    }
  }

  return (
    <div className="rounded-sm border border-line bg-surface p-2">
      <p className="mb-1 text-[11px] font-medium uppercase tracking-[0.08em] text-secundario">
        Link público da coleção
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded-sm border border-line bg-white px-2.5 py-2 text-[12px] text-ink">
          {url}
        </code>
        <button
          type="button"
          onClick={copiar}
          className="rounded-sm bg-sinal px-3 py-2 text-[12px] font-medium text-white transition-colors hover:bg-sinal-escuro"
        >
          {copiado ? "Copiado ✓" : "Copiar"}
        </button>
      </div>
    </div>
  );
}
