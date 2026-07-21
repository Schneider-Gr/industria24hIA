"use client";

import { useState, useTransition } from "react";
import { aceitarTermos } from "@/components/termos/aceite-actions";

export type DocumentoTermos = { slug: string; titulo: string };

/**
 * Opt-in obrigatório na primeira entrada no painel: sem aceite, o conteúdo do
 * painel não é renderizado (o bloqueio é no server, ver os layouts).
 */
export function PortaoTermos({
  documentos,
  caminho,
  descricao,
}: {
  documentos: DocumentoTermos[];
  caminho: string;
  descricao: string;
}) {
  const [marcado, setMarcado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, startTransition] = useTransition();

  function confirmar() {
    setErro(null);
    startTransition(async () => {
      const r = await aceitarTermos(
        documentos.map((d) => d.slug),
        caminho,
      );
      if (r?.erro) setErro(r.erro);
    });
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-[560px] flex-col justify-center px-4 py-12">
      <h1 className="font-display text-lg font-semibold uppercase tracking-[0.08em] text-ink">
        Aceite dos termos
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-ink-2">{descricao}</p>

      <div className="mt-5 rounded-md border border-line bg-surface p-5">
        <ul className="space-y-2">
          {documentos.map((d) => (
            <li key={d.slug}>
              <a
                href={`/termos/${d.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-aco-600 underline underline-offset-2"
              >
                {d.titulo}
              </a>
            </li>
          ))}
        </ul>

        <label className="mt-5 flex cursor-pointer items-start gap-2 text-sm text-ink">
          <input
            type="checkbox"
            checked={marcado}
            onChange={(e) => setMarcado(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-[#e8590c]"
          />
          <span>
            Li e concordo com {documentos.length > 1 ? "os documentos" : "o documento"}{" "}
            acima.
          </span>
        </label>

        {erro && (
          <p role="alert" className="mt-3 rounded-sm border border-red-700 bg-red-50 p-3 text-sm text-red-700">
            {erro}
          </p>
        )}

        <button
          type="button"
          disabled={!marcado || pendente}
          onClick={confirmar}
          className="mt-4 w-full rounded-sm bg-sinal px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-sinal-escuro disabled:opacity-40"
        >
          {pendente ? "Registrando…" : "Aceitar e continuar"}
        </button>

        <p className="mt-3 text-[11px] text-muted">
          Registramos a data e a versão do texto aceito.
        </p>
      </div>
    </div>
  );
}
