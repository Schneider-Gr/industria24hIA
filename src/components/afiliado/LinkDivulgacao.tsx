"use client";

import { useState } from "react";

export type AfiliacaoLink = {
  id: string;
  identificador: string | null;
  produto_id: string | null;
  produto_nome: string;
  aprovada: boolean;
};

/**
 * Link de divulgação do afiliado. O `?ref=` é capturado na página de produto
 * (CapturaRef) e usado por `checkout_criar_pedido` para creditar a comissão a
 * quem divulgou — antes disso o banco escolhia a afiliação mais recente.
 */
export function LinkDivulgacao({
  afiliacoes,
  origem,
}: {
  afiliacoes: AfiliacaoLink[];
  origem: string;
}) {
  const aprovadas = afiliacoes.filter((a) => a.aprovada && a.identificador && a.produto_id);
  const [selecionada, setSelecionada] = useState(aprovadas[0]?.id ?? "");
  const [copiado, setCopiado] = useState(false);

  if (aprovadas.length === 0) return null;

  const atual = aprovadas.find((a) => a.id === selecionada) ?? aprovadas[0];
  const url = `${origem}/produto/${atual.produto_id}?ref=${atual.identificador}`;

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
    <div className="rounded-md border border-aco-600 bg-aco-100 p-3.5">
      <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.08em] text-aco-600">
        Seu link de divulgação
      </p>

      {aprovadas.length > 1 && (
        <select
          value={atual.id}
          onChange={(e) => setSelecionada(e.target.value)}
          aria-label="Escolha a afiliação"
          className="mb-2 w-full rounded-sm border border-line bg-surface px-2.5 py-1.5 text-[13px] text-ink"
        >
          {aprovadas.map((a) => (
            <option key={a.id} value={a.id}>
              {a.produto_nome}
            </option>
          ))}
        </select>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded-sm border border-line bg-surface px-2.5 py-2 text-[12px] text-ink">
          {url}
        </code>
        <button
          type="button"
          onClick={copiar}
          className="rounded-sm bg-sinal px-3 py-2 text-[12px] font-medium text-white transition-colors hover:bg-sinal-escuro"
        >
          {copiado ? "Copiado ✓" : "Copiar"}
        </button>
        <a
          href={`https://wa.me/?text=${encodeURIComponent(url)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-sm border border-line bg-surface px-3 py-2 text-[12px] text-ink-2 transition-colors hover:border-aco-600"
        >
          Enviar
        </a>
      </div>

      <p role="status" className="mt-2 text-[11px] text-ink-2">
        {copiado
          ? "Link copiado. A comissão é creditada a você quando a compra sai por ele."
          : "Compras feitas por este link creditam a comissão a você."}
      </p>
    </div>
  );
}
