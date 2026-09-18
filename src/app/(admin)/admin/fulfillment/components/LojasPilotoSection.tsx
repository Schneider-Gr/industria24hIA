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

interface Loja {
  id: string;
  nome: string | null;
}

export function LojasPilotoSection({
  centroId,
  lojasPiloto,
  lojas,
  nomeLoja
}: {
  centroId: string;
  lojasPiloto: LojaPiloto[];
  lojas: Loja[];
  nomeLoja: (id: string) => string;
}) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const admitidas = new Set(lojasPiloto.map((l) => l.loja_id));
  const disponiveis = lojas.filter((l) => !admitidas.has(l.id));

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
            setMessage(null);
            const form = e.currentTarget;
            const result = await adicionarLojaPiloto(new FormData(form));
            if (result.sucesso) {
              setMessage({ type: "success", text: result.mensagem ?? "Loja adicionada." });
              form.reset();
            } else {
              setMessage({ type: "error", text: result.erro ?? "Não foi possível adicionar a loja." });
            }
            setLoading(false);
          }}
        >
          <input
            type="hidden"
            name="centro_id"
            value={centroId}
          />
          <select
            name="loja_id"
            className="flex-1 px-3 py-2 border border-separator dark:border-separator-dark rounded text-sm dark:bg-input-dark"
            required
            disabled={disponiveis.length === 0}
          >
            <option value="">
              {disponiveis.length === 0 ? "Todas as lojas já admitidas" : "Selecionar loja…"}
            </option>
            {disponiveis.map((loja) => (
              <option key={loja.id} value={loja.id}>
                {loja.nome ?? loja.id}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={loading || disponiveis.length === 0}
            className="bg-ok hover:bg-ok/90 text-white px-3 py-2 rounded text-sm font-semibold disabled:opacity-50"
          >
            {loading ? "Adicionando…" : "Adicionar"}
          </button>
        </form>

        {message && (
          <div
            className={`mt-3 text-sm p-3 rounded ${
              message.type === "success"
                ? "bg-ok-bg dark:bg-ok-bg-dark text-ok dark:text-ok-light"
                : "bg-error-bg dark:bg-error-bg-dark text-error dark:text-error-light"
            }`}
          >
            {message.text}
          </div>
        )}
      </div>

      {lojasPiloto.length === 0 ? (
        <EmptyState>Nenhuma loja admitida para este centro ainda.</EmptyState>
      ) : (
        <Table headers={["Loja", "Admitida em", "Ação"]}>
          {lojasPiloto.map((loja) => (
            <tr key={loja.loja_id} className="text-ink dark:text-ink-2">
              <td className="px-4 py-3 text-sm">{nomeLoja(loja.loja_id)}</td>
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
                      setMessage(null);
                      const formData = new FormData();
                      formData.append("loja_id", loja.loja_id);
                      formData.append("centro_id", loja.centro_id);
                      // A 0190 recusa remover loja com saldo no CD: sem isto,
                      // a recusa acontecia e a tela não dizia nada.
                      const result = await removerLojaPiloto(formData);
                      setMessage(
                        result.sucesso
                          ? { type: "success", text: result.mensagem ?? "Loja removida." }
                          : { type: "error", text: result.erro ?? "Não foi possível remover a loja." }
                      );
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
