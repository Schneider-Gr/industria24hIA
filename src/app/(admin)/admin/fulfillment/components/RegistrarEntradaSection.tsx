"use client";

import { useState } from "react";
import { registrarEntrada } from "../actions";

interface Posicao {
  id: string;
  codigo: string;
  bloqueado: boolean;
}

export function RegistrarEntradaSection({
  centroId,
  posicoes
}: {
  centroId: string;
  posicoes: Posicao[];
}) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  if (posicoes.length === 0) {
    return (
      <div className="bg-alert-bg dark:bg-alert-bg-dark rounded p-4 border border-alert dark:border-alert-dark">
        <p className="text-alert dark:text-alert-light font-semibold text-sm">
          ℹ Nenhuma posição cadastrada no CD. Cadastre posições em lote antes de registrar entrada.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-md">
      <form
        className="space-y-4 bg-white dark:bg-card-dark rounded p-4 border border-separator dark:border-separator-dark"
        onSubmit={async (e) => {
          e.preventDefault();
          setLoading(true);
          setMessage(null);
          const formData = new FormData(e.currentTarget);
          const result = await registrarEntrada(formData);
          if (result.sucesso) {
            setMessage({ type: "success", text: result.mensagem });
            (e.currentTarget as HTMLFormElement).reset();
          } else {
            setMessage({ type: "error", text: result.erro });
          }
          setLoading(false);
        }}
      >
        <input type="hidden" name="centro_id" value={centroId} />

        <div>
          <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1">
            Produto ID
          </label>
          <input
            type="text"
            name="produto_id"
            placeholder="UUID do produto"
            className="w-full px-3 py-2 border border-separator dark:border-separator-dark rounded text-sm dark:bg-input-dark"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1">
            Posição
          </label>
          <select
            name="endereco_id"
            className="w-full px-3 py-2 border border-separator dark:border-separator-dark rounded text-sm dark:bg-input-dark"
            required
          >
            <option value="">Selecionar posição…</option>
            {posicoes
              .filter((p) => !p.bloqueado)
              .map((pos) => (
                <option key={pos.id} value={pos.id}>
                  {pos.codigo}
                </option>
              ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1">
            Quantidade
          </label>
          <input
            type="number"
            name="quantidade"
            placeholder="Número positivo"
            className="w-full px-3 py-2 border border-separator dark:border-separator-dark rounded text-sm dark:bg-input-dark"
            required
            min="1"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1">
            Motivo
          </label>
          <textarea
            name="motivo"
            placeholder="Descrever a origem da entrada (obrigatório)"
            className="w-full px-3 py-2 border border-separator dark:border-separator-dark rounded text-sm dark:bg-input-dark"
            required
            rows={3}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-ok hover:bg-ok/90 text-white px-4 py-2 rounded font-semibold disabled:opacity-50"
        >
          {loading ? "Registrando…" : "Registrar Entrada"}
        </button>

        {message && (
          <div
            className={`text-sm p-3 rounded ${
              message.type === "success"
                ? "bg-ok-bg dark:bg-ok-bg-dark text-ok dark:text-ok-light"
                : "bg-error-bg dark:bg-error-bg-dark text-error dark:text-error-light"
            }`}
          >
            {message.text}
          </div>
        )}
      </form>
    </div>
  );
}
