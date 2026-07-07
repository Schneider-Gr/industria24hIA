"use client";

import { useTransition } from "react";
import { setSituacaoLoja } from "@/app/(admin)/admin/lojas/actions";

// Ações de moderação da loja. Botões submetem a Server Action real (UPDATE).
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

  return (
    <div className="flex gap-1.5">
      <button
        type="button"
        disabled={pending || situacao === "Ativa"}
        onClick={() => aplicar("Ativa")}
        className={`${btn} bg-ok text-white hover:bg-ok/90`}
      >
        Ativar
      </button>
      <button
        type="button"
        disabled={pending || situacao === "Inativa"}
        onClick={() => aplicar("Inativa")}
        className={`${btn} bg-muted text-white hover:bg-muted/90`}
      >
        Inativar
      </button>
    </div>
  );
}
