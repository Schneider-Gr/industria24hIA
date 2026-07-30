"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { gerarLoteDescontosIA } from "./ia-actions";

export function GerarLoteIA({ produtos }: { produtos: { id: string; nome: string }[] }) {
  const router = useRouter();
  const [produtoId, setProdutoId] = useState(produtos[0]?.id ?? "");
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function gerar() {
    if (!produtoId) return;
    setMsg(null);
    startTransition(async () => {
      const res = await gerarLoteDescontosIA(produtoId);
      if (res.ok && res.faixas) {
        setMsg({
          ok: true,
          text: `Lote aplicado: ${res.faixas
            .map((f) => `a partir de ${f.min_qtd}: R$ ${f.valor_unitario.toFixed(2)}`)
            .join(" · ")}`,
        });
        router.refresh();
      } else {
        setMsg({ ok: false, text: res.error ?? "Falha ao gerar lote." });
      }
    });
  }

  if (produtos.length === 0) return null;

  return (
    <div className="mb-8 rounded border border-line bg-white p-4">
      <h2 className="mb-3 text-[15px] font-semibold text-ink">Gerar lote de descontos progressivos por IA</h2>
      <div className="grid gap-3 sm:grid-cols-4 sm:items-end">
        <div className="sm:col-span-2">
          <label htmlFor="ia_produto_id" className="mb-1 block text-[12px] font-medium text-muted uppercase tracking-wider">
            Produto
          </label>
          <select
            id="ia_produto_id"
            value={produtoId}
            onChange={(e) => setProdutoId(e.target.value)}
            className="w-full rounded border border-line px-3 py-2 text-sm text-ink"
          >
            {produtos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
        </div>

        <div>
          <button
            type="button"
            onClick={gerar}
            disabled={pending || !produtoId}
            className="rounded bg-sinal px-4 py-2 text-sm font-semibold text-white hover:bg-sinal-escuro disabled:opacity-50"
          >
            {pending ? "Gerando..." : "Gerar lote com IA"}
          </button>
        </div>
      </div>

      {msg && (
        <p className={`mt-3 text-sm ${msg.ok ? "text-ink" : "text-red-600"}`}>{msg.text}</p>
      )}
    </div>
  );
}
