"use client";

// Botão avião do produto (PRD 053, US01): liga o parceiro de entrega com o
// R$/km do produto e simula uma entrega. Paridade com o popup "Parceiro de
// entrega" do Bubble. <dialog> nativo: foco, Esc e backdrop de graça.

import { useActionState, useRef } from "react";
import { salvarKmAfiliado, type KmAfiliadoState } from "@/app/(seller)/seller/produtos/km-actions";
import { SimuladorKm } from "@/components/seller/SimuladorKm";
import { IconAviao } from "@/components/seller/icons";

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function AviaoKm({
  produto,
  piso,
  origemPadrao,
}: {
  produto: { id: string; nome: string; permite_logistica_afiliado: boolean; valor_km_afiliado: number | null };
  piso: number;
  origemPadrao: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [state, action, pending] = useActionState<KmAfiliadoState, FormData>(salvarKmAfiliado, { ok: false });
  // Flag antiga da 0079 nasce true; sem R$/km o parceiro não está de fato ativo.
  const ativo = produto.permite_logistica_afiliado && produto.valor_km_afiliado != null;
  const valorAtual = produto.valor_km_afiliado;

  return (
    <>
      <button
        type="button"
        onClick={() => ref.current?.showModal()}
        title={ativo ? `Parceiro de entrega ativo: ${brl(valorAtual!)}/km` : "Ativar parceiro de entrega"}
        aria-label={`Parceiro de entrega de ${produto.nome}`}
        className={`rounded border border-line px-2 py-1 hover:bg-surface ${ativo ? "text-aco-600" : "text-muted opacity-50"}`}
      >
        <IconAviao />
      </button>

      <dialog
        ref={ref}
        // Clique no fundo escuro fecha. O alvo precisa ser o próprio <dialog> (Enter
        // ou Espaço num botão gera clique em (0,0), mas com o botão como alvo) e a
        // posição fora da caixa (o padding interno também tem o <dialog> como alvo).
        onClick={(e) => {
          if (e.target !== e.currentTarget) return;
          const r = e.currentTarget.getBoundingClientRect();
          const fora = e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
          if (fora) e.currentTarget.close();
        }}
        className="m-auto w-full max-w-2xl rounded-lg border border-line bg-surface p-6 text-left backdrop:bg-black/40"
      >
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-base font-semibold text-ink">Parceiro de entrega</h2>
          <button
            type="button"
            onClick={() => ref.current?.close()}
            aria-label="Fechar"
            title="Fechar"
            className="-mr-2 -mt-2 rounded px-2 py-1 text-lg leading-none text-muted hover:bg-line/40 hover:text-ink"
          >
            ✕
          </button>
        </div>
        <p className="mt-1 text-sm text-ink-2">{produto.nome}</p>
        <p className="mt-2 text-sm text-ink-2">
          {ativo ? `Ativo a ${brl(valorAtual!)} por km.` : "Desligado."} Piso da loja: {brl(piso)} por km.
        </p>

        <form action={action} className="mt-4 flex flex-wrap items-end gap-2">
          <input type="hidden" name="id" value={produto.id} />
          <label className="block text-sm">
            <span className="text-ink-2">Valor por km (R$)</span>
            <input
              name="valor_km"
              type="number"
              min={piso}
              step="0.01"
              defaultValue={(valorAtual ?? piso).toFixed(2)}
              className="mt-1 w-32 rounded border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-aco-600"
            />
          </label>
          <button
            type="submit"
            name="acao"
            value="salvar"
            disabled={pending}
            className="rounded bg-aco-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {ativo ? "Salvar" : "Ativar parceiro"}
          </button>
          {ativo && (
            <button
              type="submit"
              name="acao"
              value="desligar"
              formNoValidate
              disabled={pending}
              className="rounded border border-line px-4 py-2 text-sm font-semibold text-erro hover:bg-erro/10 disabled:opacity-60"
            >
              Desligar
            </button>
          )}
          <button
            type="button"
            onClick={() => ref.current?.close()}
            className="rounded border border-line px-4 py-2 text-sm font-semibold text-ink-2 hover:bg-surface"
          >
            Fechar
          </button>
        </form>
        {state.erro && <p className="mt-2 text-sm text-erro">{state.erro}</p>}
        {state.ok && state.msg && <p className="mt-2 text-sm text-ok">{state.msg}</p>}

        <div className="mt-5">
          <SimuladorKm origemPadrao={origemPadrao} piso={piso} valorKmPadrao={valorAtual ?? piso} />
        </div>
      </dialog>
    </>
  );
}
