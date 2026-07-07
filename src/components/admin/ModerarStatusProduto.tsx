"use client";

import { useTransition } from "react";
import { setStatusProduto } from "@/app/(admin)/admin/produtos/actions";

// Aprovar/recusar produto via Server Action real (UPDATE status_produto).
export function ModerarStatusProduto({
  id,
  status,
}: {
  id: string;
  status: string;
}) {
  const [pending, start] = useTransition();

  function aplicar(novo: string) {
    const fd = new FormData();
    fd.set("id", id);
    fd.set("status", novo);
    start(() => setStatusProduto(fd));
  }

  const btn =
    "rounded px-2 py-1 text-xs font-semibold transition-colors disabled:opacity-40";

  return (
    <div className="flex gap-1.5">
      <button
        type="button"
        disabled={pending || status === "Aprovado"}
        onClick={() => aplicar("Aprovado")}
        className={`${btn} bg-ok text-white hover:bg-ok/90`}
      >
        Aprovar
      </button>
      <button
        type="button"
        disabled={pending || status === "Recusado"}
        onClick={() => aplicar("Recusado")}
        className={`${btn} bg-erro text-white hover:bg-erro/90`}
      >
        Recusar
      </button>
    </div>
  );
}
