"use client";

import { useActionState, useState } from "react";
import { enviarAvaliacao, type Avaliacao, type AvaliarState } from "@/app/produto/[id]/social-actions";

function Estrelas({ nota, tamanho = 16 }: { nota: number; tamanho?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-hidden>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg
          key={i}
          width={tamanho}
          height={tamanho}
          viewBox="0 0 24 24"
          fill={i <= Math.round(nota) ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="1.5"
          className={i <= Math.round(nota) ? "text-lm-amarelo" : "text-line"}
        >
          <path d="m12 2.5 3 6.4 6.9.9-5 4.9 1.2 6.9L12 18l-6.1 3.6 1.2-6.9-5-4.9 6.9-.9Z" strokeLinejoin="round" />
        </svg>
      ))}
    </span>
  );
}

export function AvaliacoesProduto({
  produtoId,
  media,
  totalAvaliacoes,
  totalFavoritos,
  avaliacoesIniciais,
}: {
  produtoId: string;
  media: number | null;
  totalAvaliacoes: number;
  totalFavoritos: number;
  avaliacoesIniciais: Avaliacao[];
}) {
  const [aberto, setAberto] = useState(false);
  const [nota, setNota] = useState(5);
  const [state, action, pending] = useActionState<AvaliarState, FormData>(enviarAvaliacao, {
    ok: false,
  });

  return (
    <section className="mt-8 border-t border-line pt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold text-ink">Avaliações</h2>
          <div className="mt-1 flex items-center gap-2 text-sm text-ink-2">
            {media != null ? (
              <>
                <Estrelas nota={media} />
                <span className="num font-semibold text-ink">{media.toFixed(1)}</span>
                <span>
                  ({totalAvaliacoes} {totalAvaliacoes === 1 ? "avaliação" : "avaliações"})
                </span>
              </>
            ) : (
              <span className="text-muted">Ainda sem avaliações — seja o primeiro.</span>
            )}
          </div>
        </div>
        {totalFavoritos > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-lm-vermelho/10 px-3 py-1 text-[13px] font-medium text-lm-vermelho">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M20.8 8.6c0 5.6-8.8 10.6-8.8 10.6S3.2 14.2 3.2 8.6a5.4 5.4 0 0 1 9.6-3.4 5.4 5.4 0 0 1 8 3.4z" />
            </svg>
            {totalFavoritos} {totalFavoritos === 1 ? "favoritou" : "favoritaram"}
          </span>
        )}
      </div>

      {!aberto ? (
        <button
          type="button"
          onClick={() => setAberto(true)}
          className="mt-4 rounded-sm border border-lm-azul px-4 py-2 text-sm font-semibold text-lm-azul"
        >
          Avaliar este produto
        </button>
      ) : (
        <form
          action={action}
          className="mt-4 space-y-3 rounded-sm border border-line bg-white p-4"
        >
          <input type="hidden" name="produto_id" value={produtoId} />
          <input type="hidden" name="nota" value={nota} />
          <div>
            <p className="mb-1.5 text-sm font-medium text-ink">Sua nota</p>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setNota(i)}
                  aria-label={`${i} estrela${i > 1 ? "s" : ""}`}
                  className="p-0.5"
                >
                  <svg
                    width="26"
                    height="26"
                    viewBox="0 0 24 24"
                    fill={i <= nota ? "currentColor" : "none"}
                    stroke="currentColor"
                    strokeWidth="1.5"
                    className={i <= nota ? "text-lm-amarelo" : "text-line"}
                  >
                    <path d="m12 2.5 3 6.4 6.9.9-5 4.9 1.2 6.9L12 18l-6.1 3.6 1.2-6.9-5-4.9 6.9-.9Z" strokeLinejoin="round" />
                  </svg>
                </button>
              ))}
            </div>
          </div>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-ink">Comentário (opcional)</span>
            <textarea
              name="comentario"
              rows={3}
              maxLength={600}
              className="w-full rounded border border-line px-3 py-2 text-sm outline-none focus:border-lm-azul"
              placeholder="O que você achou do produto?"
            />
          </label>
          {state.error && (
            <p role="alert" className="text-sm text-erro">
              {state.error}
            </p>
          )}
          {state.ok && !state.error && (
            <p role="status" className="text-sm text-ok">
              Avaliação enviada, obrigado!
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={pending}
              className="rounded bg-lm-azul px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {pending ? "Enviando…" : "Enviar avaliação"}
            </button>
            <button
              type="button"
              onClick={() => setAberto(false)}
              className="rounded border border-line px-4 py-2 text-sm font-medium text-ink-2"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {avaliacoesIniciais.length > 0 && (
        <ul className="mt-5 space-y-4">
          {avaliacoesIniciais.map((a) => (
            <li key={a.id} className="border-t border-line pt-4 first:border-t-0 first:pt-0">
              <div className="flex items-center gap-2">
                <Estrelas nota={a.nota} tamanho={14} />
                <span className="text-[11px] text-muted">
                  {new Date(a.criado_em).toLocaleDateString("pt-BR")}
                </span>
              </div>
              {a.comentario && <p className="mt-1 text-sm text-ink-2">{a.comentario}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
