"use client";

import { useState, useTransition } from "react";
import { definirRole } from "@/app/(admin)/admin/usuarios/actions";

const ROLES = ["super_admin", "moderador", "financeiro"] as const;

// Só renderizado pra quem já é is_super_admin() (checado na page). Promove
// qualquer usuário a admin com o role escolhido, ou troca o role de um
// admin existente — RPC audita em auditoria_eventos.
export function SeletorRole({ userId, roleAtual }: { userId: string; roleAtual: string | null }) {
  const [role, setRole] = useState(roleAtual ?? "moderador");
  const [pending, start] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  function aplicar() {
    setErro(null);
    const fd = new FormData();
    fd.set("user_id", userId);
    fd.set("role", role);
    start(async () => {
      try {
        await definirRole(fd);
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Falha ao definir role.");
      }
    });
  }

  return (
    <div className="flex items-center gap-1.5">
      <select
        value={role}
        onChange={(e) => setRole(e.target.value)}
        className="rounded border border-line bg-transparent px-1.5 py-1 text-xs"
      >
        {ROLES.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </select>
      <button
        type="button"
        disabled={pending}
        onClick={aplicar}
        className="rounded bg-aco-600 px-2 py-1 text-xs font-semibold text-white disabled:opacity-40"
      >
        {roleAtual ? "Aplicar" : "Promover"}
      </button>
      {erro && <p className="text-xs text-erro">{erro}</p>}
    </div>
  );
}
