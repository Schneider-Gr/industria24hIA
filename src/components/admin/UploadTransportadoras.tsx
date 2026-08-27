"use client";

import { useState, useTransition } from "react";
import type { RelatorioImport, PreviewTabelaFrete } from "@/app/(admin)/admin/transportadoras/actions";
import type { FaixaFreteCorrigida } from "@/lib/transportadoras/parser-tabela-frete";

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
        <span className="mb-1 block text-xs text-muted">
          Cadastrar Transportadoras (CSV ou XLSX: nome, fonte, prazo_dias)
        </span>
        <input type="file" name="arquivo" accept=".csv,.xlsx" required className={inputCls} />
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

// Fluxo de duas etapas (spec admin-transportadoras/preview-import): o
// arquivo é processado e as faixas candidatas ficam em preview — nada é
// gravado até o usuário revisar e clicar em "Confirmar import".
export function UploadTabelaFrete({
  transportadoras,
  pravisualizarAction,
  confirmarAction,
}: {
  transportadoras: { id: string; nome: string }[];
  pravisualizarAction: (formData: FormData) => Promise<PreviewTabelaFrete>;
  confirmarAction: (transportadoraId: string, faixas: FaixaFreteCorrigida[]) => Promise<{ ok: number }>;
}) {
  const [pending, start] = useTransition();
  const [transportadoraId, setTransportadoraId] = useState("");
  const [preview, setPreview] = useState<PreviewTabelaFrete | null>(null);
  const [selecionadas, setSelecionadas] = useState<boolean[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [confirmado, setConfirmado] = useState<number | null>(null);

  function limpar() {
    setPreview(null);
    setSelecionadas([]);
    setConfirmado(null);
  }

  return (
    <div className="flex flex-col gap-3">
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          start(async () => {
            setErro(null);
            setConfirmado(null);
            try {
              const resultado = await pravisualizarAction(fd);
              setPreview(resultado);
              setSelecionadas(resultado.corrigidas.map(() => true));
            } catch (err) {
              setErro(err instanceof Error ? err.message : "Falha ao processar o arquivo.");
            }
          });
        }}
      >
        <label className="text-sm">
          <span className="mb-1 block text-xs text-muted">Transportadora</span>
          <select
            name="transportadora_id"
            required
            value={transportadoraId}
            onChange={(e) => {
              setTransportadoraId(e.target.value);
              limpar();
            }}
            className={inputCls}
          >
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
            Subir Transportadoras — tabela de frete (CSV ou XLSX: CEP destino, Peso (KG), Valor Atual Frete)
          </span>
          <input
            type="file"
            name="arquivo"
            accept=".csv,.xlsx"
            required
            className={inputCls}
            onChange={limpar}
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="rounded border border-line px-3 py-1.5 text-sm hover:bg-surface disabled:opacity-50"
        >
          {pending ? "Processando…" : "Pré-visualizar"}
        </button>
      </form>

      {erro && <p className="text-xs text-red-600">{erro}</p>}

      {preview && (
        <div className="rounded border border-line p-3">
          <p className="mb-2 text-xs text-muted">
            {preview.corrigidas.length} faixa(s) reconhecida(s)
            {preview.erros.length > 0 && ` · ${preview.erros.length} rejeitada(s)`}. Revise e confirme.
          </p>

          {preview.erros.length > 0 && (
            <p className="mb-2 text-xs text-red-600">{preview.erros.slice(0, 5).join(" · ")}</p>
          )}

          {preview.corrigidas.length > 0 && (
            <>
              <ul className="mb-3 max-h-64 overflow-y-auto text-xs">
                {preview.corrigidas.map((f, i) => (
                  <li key={i} className="flex items-center gap-2 border-b border-line py-1">
                    <input
                      type="checkbox"
                      checked={selecionadas[i] ?? true}
                      onChange={(e) =>
                        setSelecionadas((prev) => {
                          const next = [...prev];
                          next[i] = e.target.checked;
                          return next;
                        })
                      }
                    />
                    <span>
                      CEP {f.cepDestinoInicial}–{f.cepDestinoFinal} · {f.pesoMin}–{f.pesoMax}kg → R$
                      {f.valor.toFixed(2)}
                    </span>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  const faixas = preview.corrigidas.filter((_, i) => selecionadas[i]);
                  start(async () => {
                    setErro(null);
                    try {
                      const r = await confirmarAction(transportadoraId, faixas);
                      setConfirmado(r.ok);
                      setPreview(null);
                    } catch (err) {
                      setErro(err instanceof Error ? err.message : "Falha ao confirmar o import.");
                    }
                  });
                }}
                className="rounded bg-roxo-800 px-3 py-1.5 text-sm font-semibold text-white hover:bg-roxo-900 disabled:opacity-50"
              >
                {pending ? "Gravando…" : "Confirmar import"}
              </button>
            </>
          )}
        </div>
      )}

      {confirmado !== null && <p className="text-xs text-muted">{confirmado} faixa(s) importada(s).</p>}
    </div>
  );
}
