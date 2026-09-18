"use client";

import { useState } from "react";
import { Table, EmptyState } from "@/components/admin/ui";
import { adicionarLojaPiloto, removerLojaPiloto } from "../actions";

interface LojaPiloto {
  loja_id: string;
  centro_id: string;
  criado_em: string;
  criado_por: string | null;
}

export function LojasPilotoSection({
  centroId,
  lojasPiloto
}: {
  centroId: string;
  lojasPiloto: LojaPiloto[];
}) {
  const [loading, setLoading] = useState(false);

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-card-dark rounded p-4 border border-separator dark:border-separator-dark">
        <p className="text-sm text-ink dark:text-ink-2 font-semibold mb-2">
          Adicionar Loja ao Piloto
        </p>
        <form
          className="flex gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            setLoading(true);
            const formData = new FormData(e.currentTarget);
            await adicionarLojaPiloto(formData);
            setLoading(false);
          }}
        >
          <input
            type="hidden"
            name="centro_id"
            value={centroId}
          />
          <input
            type="text"
            name="loja_id"
            placeholder="ID da loja (UUID)"
            className="flex-1 px-3 py-2 border border-separator dark:border-separator-dark rounded text-sm dark:bg-input-dark"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-ok hover:bg-ok/90 text-white px-3 py-2 rounded text-sm font-semibold disabled:opacity-50"
          >
            {loading ? "Adicionando…" : "Adicionar"}
          </button>
        </form>
      </div>

      {lojasPiloto.length === 0 ? (
        <EmptyState>Nenhuma loja admitida para este centro ainda.</EmptyState>
      ) : (
        <Table headers={["Loja ID", "Admitida em", "Ação"]}>
          {lojasPiloto.map((loja) => (
            <tr key={loja.loja_id} className="text-ink dark:text-ink-2">
              <td className="px-4 py-3 font-mono text-xs">{loja.loja_id}</td>
              <td className="px-4 py-3 text-sm">
                {new Date(loja.criado_em).toLocaleDateString("pt-BR")}
              </td>
              <td className="px-4 py-3">
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (
                      confirm(
                        "Remover esta loja do programa piloto? Verifique se não há saldo no CD."
                      )
                    ) {
                      setLoading(true);
                      const formData = new FormData();
                      formData.append("loja_id", loja.loja_id);
                      formData.append("centro_id", loja.centro_id);
                      await removerLojaPiloto(formData);
                      setLoading(false);
                    }
                  }}
                >
                  <button
                    type="submit"
                    disabled={loading}
                    className="text-xs bg-error-bg dark:bg-error-bg-dark text-error dark:text-error-light rounded px-2 py-1 hover:bg-error/10 disabled:opacity-50"
                  >
                    Remover
                  </button>
                </form>
              </td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}
