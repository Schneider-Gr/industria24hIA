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
    "rounded-md px-2 py-1 text-xs font-medium transition-colors disabled:opacity-40";

  return (
    <div className="flex gap-1.5">
      <button
        type="button"
        disabled={pending || status === "Aprovado"}
        onClick={() => aplicar("Aprovado")}
        className={`${btn} bg-emerald-600 text-white hover:bg-emerald-700`}
      >
        Aprovar
      </button>
      <button
        type="button"
        disabled={pending || status === "Recusado"}
        onClick={() => aplicar("Recusado")}
        className={`${btn} bg-red-600 text-white hover:bg-red-700`}
      >
        Recusar
      </button>
    </div>
  );
}
