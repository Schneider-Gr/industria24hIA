"use client";

import { useTransition } from "react";
import { setSituacaoLoja } from "@/app/(admin)/admin/lojas/actions";

const ROTULO: Record<string, string> = {
  Ativa: "Ativa",
  Inativa: "Inativa",
  EmAnalise: "Em análise",
};

// Ações de moderação da loja. Botões submetem a Server Action real (UPDATE).
// Loja nova nasce "EmAnalise" (migration 0152): daí "Aprovar" (→ Ativa) e
// "Recusar" (→ Inativa) a partir desse estado.
export function ModerarSituacaoLoja({
  id,
  situacao,
}: {
  id: string;
  situacao: string;
}) {
  const [pending, start] = useTransition();

  function aplicar(nova: string) {
    const fd = new FormData();
    fd.set("id", id);
    fd.set("situacao", nova);
    start(() => setSituacaoLoja(fd));
  }

  const btn =
    "rounded px-2 py-1 text-xs font-semibold transition-colors disabled:opacity-40";
  const emAnalise = situacao === "EmAnalise";

  return (
    <div className="flex items-center gap-1.5">
      <span className="rounded bg-line/40 px-2 py-1 text-xs font-medium text-ink-2">
        {ROTULO[situacao] ?? situacao}
      </span>
      <button
        type="button"
        disabled={pending || situacao === "Ativa"}
        onClick={() => aplicar("Ativa")}
        className={`${btn} bg-ok text-white hover:bg-ok/90`}
      >
        {emAnalise ? "Aprovar" : "Ativar"}
      </button>
      <button
        type="button"
        disabled={pending || situacao === "Inativa"}
        onClick={() => aplicar("Inativa")}
        className={`${btn} bg-muted text-white hover:bg-muted/90`}
      >
        {emAnalise ? "Recusar" : "Inativar"}
      </button>
    </div>
  );
}
