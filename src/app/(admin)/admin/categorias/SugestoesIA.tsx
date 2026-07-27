"use client";

import { useState, useTransition } from "react";
import {
  sugerirCategoriasIA,
  aplicarSugestaoIA,
  type SugestaoCategoria,
} from "./actions";

const btnCls =
  "rounded bg-laranja px-3 py-1.5 text-sm font-semibold text-white hover:bg-laranja-escuro disabled:opacity-50";

export function SugestoesIA() {
  const [sugestoes, setSugestoes] = useState<SugestaoCategoria[] | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function gerar() {
    setErro(null);
    setMensagem(null);
    startTransition(async () => {
      const resultado = await sugerirCategoriasIA();
      if ("erro" in resultado) {
        setErro(resultado.erro);
        setSugestoes(null);
        return;
      }
      setSugestoes(resultado.sugestoes);
      setMensagem(resultado.mensagem ?? null);
    });
  }

  return (
    <div className="mb-8 rounded-lg border border-line bg-surface p-4 dark:border-line dark:bg-surface">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-ink dark:text-ink">
            Sugestões de categoria por IA
          </h3>
          <p className="text-sm text-ink/70 dark:text-ink/70">
            Analisa produtos sem categoria e sugere novas categorias/subcategorias.
          </p>
        </div>
        <button type="button" className={btnCls} onClick={gerar} disabled={pending}>
          {pending ? "Gerando..." : "Sugerir com IA"}
        </button>
      </div>

      {erro && <p className="mt-3 text-sm text-erro">{erro}</p>}
      {mensagem && <p className="mt-3 text-sm text-ink/70">{mensagem}</p>}

      {sugestoes && sugestoes.length > 0 && (
        <div className="mt-4 space-y-4">
          {sugestoes.map((s) => (
            <form
              action={aplicarSugestaoIA}
              key={s.categoria}
              className="rounded border border-line p-3"
            >
              <input type="hidden" name="categoria" value={s.categoria} />
              <div className="flex items-center justify-between">
                <span className="font-medium text-ink dark:text-ink">{s.categoria}</span>
                <button type="submit" className={btnCls}>
                  Aplicar
                </button>
              </div>

              {s.subcategorias.length > 0 && (
                <ul className="mt-2 flex flex-wrap gap-3">
                  {s.subcategorias.map((sub) => (
                    <li key={sub} className="flex items-center gap-1 text-sm">
                      <input
                        type="checkbox"
                        name="subcategorias"
                        value={sub}
                        defaultChecked
                        id={`${s.categoria}-${sub}`}
                      />
                      <label htmlFor={`${s.categoria}-${sub}`}>{sub}</label>
                    </li>
                  ))}
                </ul>
              )}

              {s.produtos_exemplo.length > 0 && (
                <p className="mt-2 text-xs text-ink/60 dark:text-ink/60">
                  Exemplos: {s.produtos_exemplo.join(", ")}
                </p>
              )}
            </form>
          ))}
        </div>
      )}
    </div>
  );
}
