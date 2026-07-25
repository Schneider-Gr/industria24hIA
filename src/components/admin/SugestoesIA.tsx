"use client";

import { useTransition } from "react";
import { aplicarSugestaoIA, descartarSugestaoIA } from "@/app/(admin)/admin/produtos/[id]/actions";

type Sugestao = {
  id: string;
  tipo: string;
  conteudo: string;
  motivo: string | null;
  created_at: string;
};

const rotuloTipo: Record<string, string> = {
  descricao: "Descrição sugerida",
  imagem: "Imagem sugerida",
  dados_loja: "Dados da loja",
};

// Sugestões pendentes do agente CrewAI de curadoria (produto_sugestoes_ia).
// Aplicar/descartar é sempre um clique humano — o agente nunca escreve em
// produtos/produto_imagens diretamente.
export function SugestoesIA({ produtoId, sugestoes }: { produtoId: string; sugestoes: Sugestao[] }) {
  const [pending, start] = useTransition();

  if (sugestoes.length === 0) return null;

  return (
    <div className="mb-6 space-y-3 rounded border border-aco-800/40 bg-aco-100/60 p-4">
      <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-ink-2">
        Sugestões do agente de curadoria (IA)
      </h2>
      {sugestoes.map((s) => (
        <div key={s.id} className="rounded border border-line bg-surface p-3">
          <p className="text-xs font-semibold text-ink-2">{rotuloTipo[s.tipo] ?? s.tipo}</p>
          {s.tipo === "imagem" ? (
            <img src={s.conteudo} alt="" className="mt-2 h-28 w-28 rounded object-cover" />
          ) : (
            <p className="mt-1 text-sm text-ink">{s.conteudo}</p>
          )}
          {s.motivo && <p className="mt-1 text-xs italic text-ink-2">Motivo: {s.motivo}</p>}
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                const fd = new FormData();
                fd.set("sugestaoId", s.id);
                fd.set("produtoId", produtoId);
                fd.set("tipo", s.tipo);
                fd.set("conteudo", s.conteudo);
                start(() => aplicarSugestaoIA(fd));
              }}
              className="rounded bg-ok px-3 py-1 text-xs font-semibold text-white disabled:opacity-40"
            >
              Aplicar
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                const fd = new FormData();
                fd.set("sugestaoId", s.id);
                fd.set("produtoId", produtoId);
                start(() => descartarSugestaoIA(fd));
              }}
              className="rounded border border-line px-3 py-1 text-xs font-semibold text-ink-2 disabled:opacity-40"
            >
              Descartar
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
