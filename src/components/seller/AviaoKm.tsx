"use client";

// Botão avião do produto: três bandas de frete (moto, carro, caminhão) com
// tarifa mínima e R$/km, e o simulador de quantidade que ajuda a descobrir
// esses valores (dona, 25/09/2026; migration 0201). <dialog> nativo: foco e
// Esc de graça.

import { useActionState, useRef, useState } from "react";
import { salvarBandas, type BandasState } from "@/app/(seller)/seller/produtos/km-actions";
import { SimuladorFreteProduto } from "@/components/seller/SimuladorFreteProduto";
import { IconAviao } from "@/components/seller/icons";
import { CLASSES, NOME_CLASSE, type Bandas } from "@/lib/logistica-parceiro/simulador-produto";

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const inputCls =
  "w-full rounded border border-line bg-surface px-2 py-1.5 text-sm outline-none focus:border-aco-600 num";
const faixaPeso = (ateKg: number, i: number) =>
  ateKg === Infinity ? `acima de ${CLASSES[i - 1].ateKg} kg` : `até ${ateKg} kg`;

type Texto = Record<string, { tarifaMinima: string; valorKm: string }>;
const paraTexto = (b: Bandas): Texto =>
  Object.fromEntries(
    CLASSES.map((c) => [c.classe, { tarifaMinima: b[c.classe].tarifaMinima?.toFixed(2) ?? "", valorKm: b[c.classe].valorKm?.toFixed(2) ?? "" }]),
  );
const numOuNull = (t: string) => (t.trim() === "" ? null : Number(t.replace(",", ".")));

export function AviaoKm({
  produto,
}: {
  produto: { id: string; nome: string; permite_logistica_afiliado: boolean; quantidade_minima: number | null; bandas: Bandas };
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [state, action, pending] = useActionState<BandasState, FormData>(salvarBandas, { ok: false });
  const [texto, setTexto] = useState<Texto>(() => paraTexto(produto.bandas));
  // Flag antiga da 0079 nasce true; sem nenhuma banda o parceiro não está de fato ativo.
  const ativo = produto.permite_logistica_afiliado && CLASSES.some((c) => produto.bandas[c.classe].valorKm != null);
  const bandasEmEdicao = Object.fromEntries(
    CLASSES.map((c) => [c.classe, { tarifaMinima: numOuNull(texto[c.classe].tarifaMinima), valorKm: numOuNull(texto[c.classe].valorKm) }]),
  ) as Bandas;
  const muda = (classe: string, campo: "tarifaMinima" | "valorKm", v: string) =>
    setTexto({ ...texto, [classe]: { ...texto[classe], [campo]: v } });

  return (
    <>
      <button
        type="button"
        onClick={() => ref.current?.showModal()}
        title={ativo ? "Parceiro de entrega ativo" : "Ativar parceiro de entrega"}
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
        className="m-auto w-full max-w-3xl rounded-lg border border-line bg-surface p-6 text-left backdrop:bg-black/40"
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
        <p className="mt-1 text-sm text-ink-2">
          {produto.nome} · {ativo ? "ativo" : "desligado"}
        </p>
        <p className="mt-2 text-xs text-muted">
          Frete = o maior entre a tarifa mínima e km (só a ida) × R$/km do veículo que o peso do pedido exige, mais porto e
          ajudantes. Use o simulador abaixo para achar os valores antes de salvar.
        </p>

        <form action={action} className="mt-4">
          <input type="hidden" name="id" value={produto.id} />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead className="text-xs text-muted">
                <tr>
                  <th className="py-1 pr-3">Veículo</th>
                  <th className="py-1 pr-3">Tarifa mínima (R$)</th>
                  <th className="py-1">R$/km</th>
                </tr>
              </thead>
              <tbody>
                {CLASSES.map((c, i) => (
                  <tr key={c.classe} className="border-t border-line">
                    <td className="py-2 pr-3">
                      <span className="font-semibold">{NOME_CLASSE[c.classe]}</span>
                      <span className="block text-xs text-muted">{faixaPeso(c.ateKg, i)}</span>
                    </td>
                    <td className="py-2 pr-3">
                      <input
                        name={`tarifa_minima_${c.classe}`}
                        type="number"
                        min="0"
                        step="0.01"
                        value={texto[c.classe].tarifaMinima}
                        onChange={(e) => muda(c.classe, "tarifaMinima", e.target.value)}
                        placeholder="sem tarifa"
                        className={inputCls}
                      />
                    </td>
                    <td className="py-2">
                      <input
                        name={`valor_km_${c.classe}`}
                        type="number"
                        min={c.pisoKm}
                        step="0.01"
                        value={texto[c.classe].valorKm}
                        onChange={(e) => muda(c.classe, "valorKm", e.target.value)}
                        placeholder={`piso ${brl(c.pisoKm)}`}
                        className={inputCls}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="submit"
              name="acao"
              value="salvar"
              disabled={pending}
              className="rounded bg-aco-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {ativo ? "Salvar bandas" : "Salvar e ativar parceiro"}
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
          </div>
        </form>
        {state.erro && <p className="mt-2 text-sm text-erro">{state.erro}</p>}
        {state.ok && state.msg && <p className="mt-2 text-sm text-ok">{state.msg}</p>}

        <div className="mt-5">
          <SimuladorFreteProduto
            produtoId={produto.id}
            quantidadeInicial={produto.quantidade_minima ?? 1}
            bandas={bandasEmEdicao}
            onUsarValorKm={(classe, v) => muda(classe, "valorKm", v.toFixed(2))}
          />
        </div>
      </dialog>
    </>
  );
}
