"use client";

import { useState, useTransition } from "react";
import type { RelatorioImport } from "@/app/(admin)/admin/transportadoras/actions";
import type { PreviewTabela } from "@/lib/transportadoras/parser-tabela-frete";

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

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// Duas etapas (spec admin-transportadoras/tabela-frete): o arquivo vira
// preview (contagens, amostra, erros por linha, sobreposições) e nada é
// gravado. "Confirmar" reenvia o mesmo arquivo: o servidor faz o parse de
// novo e troca a tabela inteira pela RPC substituir_faixas_transportadora,
// então o navegador nunca manda faixas prontas para gravar.
export function UploadTabelaFrete({
  transportadoras,
  pravisualizarAction,
  confirmarAction,
}: {
  transportadoras: { id: string; nome: string }[];
  pravisualizarAction: (formData: FormData) => Promise<PreviewTabela>;
  confirmarAction: (formData: FormData) => Promise<{ ok: number }>;
}) {
  const [pending, start] = useTransition();
  const [preview, setPreview] = useState<PreviewTabela | null>(null);
  const [dados, setDados] = useState<FormData | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [confirmado, setConfirmado] = useState<number | null>(null);

  function limpar() {
    setPreview(null);
    setDados(null);
    setConfirmado(null);
  }

  if (transportadoras.length === 0) {
    return <p className="text-xs text-muted">Cadastre uma transportadora antes de subir a tabela de frete.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <form
        className="flex flex-wrap items-end gap-3"
        onChange={limpar}
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          start(async () => {
            setErro(null);
            setConfirmado(null);
            try {
              setPreview(await pravisualizarAction(fd));
              setDados(fd);
            } catch (err) {
              setErro(err instanceof Error ? err.message : "Falha ao processar o arquivo.");
            }
          });
        }}
      >
        <label className="text-sm">
          <span className="mb-1 block text-xs text-muted">Transportadora</span>
          <select name="transportadora_id" required defaultValue="" className={inputCls}>
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
            Tabela de faixas (CSV com ; ou XLSX, aba &quot;Faixas&quot;)
          </span>
          <input type="file" name="arquivo" accept=".csv,.xlsx" required className={inputCls} />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="rounded border border-line px-3 py-1.5 text-sm hover:bg-surface disabled:opacity-50"
        >
          {pending && !preview ? "Processando…" : "Pré-visualizar"}
        </button>
        <a href="/modelos/tabela-frete-transportadora.csv" download className="text-xs text-roxo-800 hover:underline">
          Baixar modelo
        </a>
      </form>
      <p className="text-xs text-muted">
        Colunas: CepInicial, CepFinal, PesoInicial, PesoFinal e Valor (obrigatórias); Prazo Entrega Minimo, Prazo
        Entrega Maximo, AdValorem, KgAdicional, ICMS, Frete Minimo, Taxa Fixa por Envio, CepOrigemInicial e
        CepOrigemFinal (opcionais). Faixas de peso não podem se encostar: use 0 a 30 e 30,001 a 100.
      </p>

      {erro && <p className="text-xs text-red-600">{erro}</p>}

      {preview && (
        <div className="rounded border border-line p-3 text-xs">
          {preview.recusa ? (
            <p className="text-red-600">{preview.recusa}</p>
          ) : (
            <>
              <p className="mb-2 text-muted">
                {preview.faixasValidas} faixa(s) válida(s)
                {preview.totalErros > 0 && ` · ${preview.totalErros} linha(s) com erro, que não serão gravadas`}
                {preview.ignoradas > 0 && ` · ${preview.ignoradas} ignorada(s) (Valor vazio ou Atende = N)`}. A
                tabela nova substitui a anterior inteira.
              </p>
              {preview.avisos.map((a) => (
                <p key={a} className="mb-1 text-amber-700">
                  {a}
                </p>
              ))}
              {preview.conflitos.length > 0 && (
                <p className="mb-2 text-red-600">
                  Faixas sobrepostas (mesmo CEP de origem, CEP de destino e peso). Corrija e envie de novo:{" "}
                  {preview.conflitos.map((c) => `linhas ${c.a} e ${c.b}`).join(" · ")}
                </p>
              )}
              {preview.erros.length > 0 && (
                <ul className="mb-2 max-h-32 overflow-y-auto text-red-600">
                  {preview.erros.map((e) => (
                    <li key={e.numero}>
                      Linha {e.numero}: {e.motivo}
                    </li>
                  ))}
                </ul>
              )}
              {preview.amostra.length > 0 && (
                <ul className="mb-3 max-h-64 overflow-y-auto">
                  {preview.amostra.map((f) => (
                    <li key={f.numero} className="border-b border-line py-1">
                      Linha {f.numero}: CEP {f.cepDestinoInicial}–{f.cepDestinoFinal}
                      {f.cepOrigemInicial !== null && ` (origem ${f.cepOrigemInicial}–${f.cepOrigemFinal})`} ·{" "}
                      {f.pesoMin}–{f.pesoMax} kg → {brl(f.valor)}
                      {f.prazoMax !== null && ` · ${f.prazoMin ?? 0} a ${f.prazoMax} dias úteis`}
                    </li>
                  ))}
                  {preview.faixasValidas > preview.amostra.length && (
                    <li className="py-1 text-muted">
                      … e mais {preview.faixasValidas - preview.amostra.length} faixa(s)
                    </li>
                  )}
                </ul>
              )}
              <button
                type="button"
                disabled={pending || !preview.podeGravar || !dados}
                onClick={() => {
                  if (!dados) return;
                  start(async () => {
                    setErro(null);
                    try {
                      const r = await confirmarAction(dados);
                      setConfirmado(r.ok);
                      setPreview(null);
                    } catch (err) {
                      setErro(err instanceof Error ? err.message : "Falha ao gravar a tabela.");
                    }
                  });
                }}
                className="rounded bg-roxo-800 px-3 py-1.5 text-sm font-semibold text-white hover:bg-roxo-900 disabled:opacity-50"
              >
                {pending ? "Gravando…" : "Confirmar e substituir a tabela"}
              </button>
            </>
          )}
        </div>
      )}

      {confirmado !== null && <p className="text-xs text-muted">{confirmado} faixa(s) gravada(s).</p>}
    </div>
  );
}
