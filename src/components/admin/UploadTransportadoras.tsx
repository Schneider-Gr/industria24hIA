"use client";

import { useState, useTransition } from "react";
import type { RelatorioImport } from "@/app/(admin)/admin/transportadoras/actions";

const inputCls =
  "rounded border border-line bg-surface px-2 py-1 text-sm outline-none focus:border-roxo-800";

function Relatorio({ r }: { r: RelatorioImport }) {
  return (
    <p className="mt-2 text-xs text-muted">
      {r.ok}/{r.total} linhas importadas.
      {r.erros.length > 0 && (
        <span className="mt-1 block text-red-600">{r.erros.slice(0, 5).join(" · ")}</span>
      )}
    </p>
  );
}

export function UploadListaTransportadoras({
  action,
}: {
  action: (formData: FormData) => Promise<RelatorioImport>;
}) {
  const [pending, start] = useTransition();
  const [relatorio, setRelatorio] = useState<RelatorioImport | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  return (
    <form
      className="flex flex-wrap items-end gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        start(async () => {
          setErro(null);
          try {
            setRelatorio(await action(fd));
          } catch (err) {
            setErro(err instanceof Error ? err.message : "Falha ao importar.");
          }
        });
      }}
    >
      <label className="text-sm">
        <span className="mb-1 block text-xs text-muted">Cadastrar Transportadoras (CSV: nome, fonte, prazo_dias)</span>
        <input type="file" name="arquivo" accept=".csv" required className={inputCls} />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded border border-line px-3 py-1.5 text-sm hover:bg-surface disabled:opacity-50"
      >
        {pending ? "Enviando…" : "Cadastrar Transportadoras"}
      </button>
      {erro && <p className="text-xs text-red-600">{erro}</p>}
      {relatorio && <Relatorio r={relatorio} />}
    </form>
  );
}

export function UploadTabelaFrete({
  transportadoras,
  action,
}: {
  transportadoras: { id: string; nome: string }[];
  action: (formData: FormData) => Promise<RelatorioImport>;
}) {
  const [pending, start] = useTransition();
  const [relatorio, setRelatorio] = useState<RelatorioImport | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  return (
    <form
      className="flex flex-wrap items-end gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        start(async () => {
          setErro(null);
          try {
            setRelatorio(await action(fd));
          } catch (err) {
            setErro(err instanceof Error ? err.message : "Falha ao importar.");
          }
        });
      }}
    >
      <label className="text-sm">
        <span className="mb-1 block text-xs text-muted">Transportadora</span>
        <select name="transportadora_id" required className={inputCls}>
          <option value="">Selecione…</option>
          {transportadoras.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nome}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm">
        <span className="mb-1 block text-xs text-muted">
          Subir Transportadoras — tabela de frete (CSV: CEP destino, Peso (KG), Valor Atual Frete)
        </span>
        <input type="file" name="arquivo" accept=".csv" required className={inputCls} />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-roxo-800 px-3 py-1.5 text-sm font-semibold text-white hover:bg-roxo-900 disabled:opacity-50"
      >
        {pending ? "Enviando…" : "Subir Transportadoras"}
      </button>
      {erro && <p className="text-xs text-red-600">{erro}</p>}
      {relatorio && <Relatorio r={relatorio} />}
    </form>
  );
}
