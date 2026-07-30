"use client";

import { useRouter } from "next/navigation";
import type { Loja } from "@/components/vitrine/ui";

export function LojaSeletor({ lojas }: { lojas: Loja[] }) {
  const router = useRouter();

  return (
    <select
      defaultValue=""
      onChange={(e) => {
        if (e.target.value) router.push(`/loja/${e.target.value}`);
      }}
      className="w-full max-w-sm rounded-md border border-line bg-surface px-4 py-3 text-sm font-medium"
    >
      <option value="" disabled>
        Escolha uma loja
      </option>
      {lojas.map((loja) => {
        const localizacao = [loja.cidade, loja.estado].filter(Boolean).join("/");
        return (
          <option key={loja.id} value={loja.id}>
            {loja.nome}
            {localizacao ? ` — ${localizacao}` : ""}
          </option>
        );
      })}
    </select>
  );
}
