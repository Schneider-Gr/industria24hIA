"use client";

import { useState, useTransition } from "react";
import type { ResultadoForm } from "@/app/(seller)/seller/transportadoras/actions";

type No = { id: string; nome: string; caminho: string };

// Categorias atendidas (PRD 049 US07): o nó vale para os nós abaixo; sem nó,
// a transportadora leva todos os produtos. A árvore tem ~18 mil nós, então a
// escolha é por busca, não por lista.
export function CategoriasTransportadora({
  transportadoraId,
  iniciais,
  contagem,
  buscar,
  salvar,
}: {
  transportadoraId: string;
  iniciais: No[];
  /** Quantos produtos da loja cada nó cobre (nó e descendentes). */
  contagem: Record<string, number>;
  buscar: (termo: string) => Promise<No[]>;
  salvar: (transportadoraId: string, nos: string[]) => Promise<ResultadoForm>;
}) {
  const [marcados, setMarcados] = useState<No[]>(iniciais);
  const [resultados, setResultados] = useState<No[]>([]);
  const [termo, setTermo] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [pendente, start] = useTransition();

  return (
    <div className="flex flex-col gap-2 text-sm">
      {marcados.length === 0 ? (
        <p className="text-xs text-muted">Nenhuma categoria marcada: esta transportadora leva todos os produtos.</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {marcados.map((n) => (
            <li key={n.id} className="flex items-center gap-1 rounded border border-line px-2 py-0.5 text-xs">
              <span title={n.caminho}>{n.nome}</span>
              {contagem[n.id] !== undefined && (
                <span className="text-muted">· cobre {contagem[n.id]} produto(s) da sua loja</span>
              )}
              <button
                type="button"
                aria-label={`Remover ${n.nome}`}
                className="ml-1 text-muted hover:text-red-600"
                onClick={() => setMarcados((m) => m.filter((x) => x.id !== n.id))}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={termo}
          onChange={(e) => setTermo(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              start(async () => setResultados(await buscar(termo)));
            }
          }}
          placeholder="Buscar categoria (ex.: cimento)"
          className="w-64 rounded border border-line bg-surface px-2 py-1 text-sm outline-none focus:border-roxo-800"
        />
        <button
          type="button"
          disabled={pendente}
          onClick={() => start(async () => setResultados(await buscar(termo)))}
          className="rounded border border-line px-3 py-1 text-xs hover:bg-surface disabled:opacity-50"
        >
          Buscar
        </button>
      </div>
      {resultados.length > 0 && (
        <ul className="max-h-48 overflow-y-auto rounded border border-line text-xs">
          {resultados.map((n) => (
            <li key={n.id} className="flex items-center justify-between gap-2 border-b border-line px-2 py-1">
              <span>{n.caminho}</span>
              <button
                type="button"
                disabled={marcados.some((m) => m.id === n.id)}
                onClick={() => setMarcados((m) => [...m, n])}
                className="text-roxo-800 hover:underline disabled:text-muted disabled:no-underline"
              >
                Marcar
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={pendente}
          onClick={() =>
            start(async () => {
              const r = await salvar(
                transportadoraId,
                marcados.map((n) => n.id),
              );
              setMsg(r.ok ? "Categorias salvas. As contagens atualizam ao recarregar." : (r.erro ?? "Falha ao salvar."));
            })
          }
          className="rounded bg-roxo-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-roxo-900 disabled:opacity-50"
        >
          Salvar categorias
        </button>
        {msg && <span className="text-xs text-muted">{msg}</span>}
      </div>
    </div>
  );
}
