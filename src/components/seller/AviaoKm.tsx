"use client";

// Botão avião do produto (decisão da dona, 25/09/2026): o seller define o R$/km
// e a quantidade mínima, simula o frete para perto, médio e longe e ajusta os
// dois até a entrega ficar viável. <dialog> nativo: foco e Esc de graça.

import { useActionState, useRef, useState, useTransition } from "react";
import {
  salvarKmProduto,
  simularKmProduto,
  type KmState,
  type SimulacaoState,
} from "@/app/(seller)/seller/produtos/km-actions";
import { IconAviao } from "@/components/seller/icons";
import { LIMITE_IDEAL, LIMITE_VIAVEL, type Faixa } from "@/lib/logistica-parceiro/simulador-km";

// ponytail: destinos de referência fixos (Manaus, onde estão as lojas), com CEP
// validado no ViaCEP em 25/09; o seller pode editar. Viram configuração por
// loja se a dona pedir.
const DESTINOS_PADRAO = [
  "Rua Marechal Deodoro, Centro, Manaus - AM, 69005-000",
  "Avenida Noel Nutels, Cidade Nova, Manaus - AM, 69090-000",
  "Iranduba - AM, 69415-000",
];
const ROTULOS = ["Perto", "Médio", "Longe"];

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const pct = (v: number) => `${Math.round(v * 100)}%`;
const num = (t: string) => Number(t.replace(",", ".")) || 0;
const inputCls =
  "mt-1 w-full rounded border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-aco-600";
const COR: Record<Faixa, string> = { otimo: "text-ok", viavel: "text-aco-600", inviavel: "text-erro" };
const NOME: Record<Faixa, string> = { otimo: "ótimo", viavel: "viável", inviavel: "inviável" };

export function AviaoKm({
  produto,
  piso,
}: {
  produto: {
    id: string;
    nome: string;
    permite_logistica_afiliado: boolean;
    valor_km_afiliado: number | null;
    quantidade_minima: number | null;
  };
  piso: number;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [state, action, pending] = useActionState<KmState, FormData>(salvarKmProduto, { ok: false });
  // Controlados: o React 19 limpa o form após a action, e o simulador usa os mesmos valores.
  const [valorKm, setValorKm] = useState((produto.valor_km_afiliado ?? piso).toFixed(2));
  const [qtd, setQtd] = useState(String(produto.quantidade_minima ?? 1));
  const [destinos, setDestinos] = useState(DESTINOS_PADRAO);
  const [porto, setPorto] = useState("");
  const [ajudantes, setAjudantes] = useState("0");
  const [valorAjudante, setValorAjudante] = useState("");
  const [sim, setSim] = useState<SimulacaoState | null>(null);
  const [simulando, start] = useTransition();
  // Flag antiga da 0079 nasce true; sem R$/km o parceiro não está de fato ativo.
  const ativo = produto.permite_logistica_afiliado && produto.valor_km_afiliado != null;

  function simular() {
    start(async () => {
      setSim(
        await simularKmProduto({
          produtoId: produto.id,
          valorKm: num(valorKm),
          qtd: Math.max(1, Math.floor(num(qtd))),
          destinos,
          porto: num(porto),
          ajudantes: Math.floor(num(ajudantes)),
          valorAjudante: num(valorAjudante),
        }),
      );
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => ref.current?.showModal()}
        title={ativo ? `Parceiro de entrega ativo: ${brl(produto.valor_km_afiliado!)}/km` : "Ativar parceiro de entrega"}
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
          {produto.nome} ·{" "}
          {ativo ? `ativo a ${brl(produto.valor_km_afiliado!)}/km, mínimo ${produto.quantidade_minima ?? 1} un.` : "desligado"} · piso
          da loja {brl(piso)}/km
        </p>

        <form action={action} className="mt-4 space-y-3">
          <input type="hidden" name="id" value={produto.id} />
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="text-ink-2">Valor por km (R$)</span>
              <input
                name="valor_km"
                type="number"
                min={piso}
                step="0.01"
                value={valorKm}
                onChange={(e) => setValorKm(e.target.value)}
                className={`${inputCls} num`}
              />
            </label>
            <label className="block text-sm">
              <span className="text-ink-2">Quantidade mínima por pedido</span>
              <input
                name="quantidade_minima"
                type="number"
                min="1"
                step="1"
                value={qtd}
                onChange={(e) => setQtd(e.target.value)}
                className={`${inputCls} num`}
              />
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block text-sm">
              <span className="text-ink-2">Porto ou balsa (R$)</span>
              <input type="number" min="0" step="0.01" value={porto} onChange={(e) => setPorto(e.target.value)} placeholder="0,00" className={`${inputCls} num`} />
            </label>
            <label className="block text-sm">
              <span className="text-ink-2">Ajudantes</span>
              <input type="number" min="0" step="1" value={ajudantes} onChange={(e) => setAjudantes(e.target.value)} className={`${inputCls} num`} />
            </label>
            <label className="block text-sm">
              <span className="text-ink-2">Valor por ajudante (R$)</span>
              <input type="number" min="0" step="0.01" value={valorAjudante} onChange={(e) => setValorAjudante(e.target.value)} placeholder="0,00" className={`${inputCls} num`} />
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {destinos.map((d, i) => (
              <label key={i} className="block text-sm">
                <span className="text-ink-2">{ROTULOS[i]}</span>
                <input value={d} onChange={(ev) => setDestinos(destinos.map((x, j) => (j === i ? ev.target.value : x)))} className={inputCls} />
              </label>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={simular}
              disabled={simulando}
              className="rounded border border-aco-600 px-4 py-2 text-sm font-semibold text-aco-600 hover:bg-aco-600/10 disabled:opacity-60"
            >
              {simulando ? "Calculando…" : "Simular frete"}
            </button>
            <button
              type="submit"
              name="acao"
              value="salvar"
              disabled={pending}
              className="rounded bg-aco-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {ativo ? "Salvar" : "Salvar e ativar parceiro"}
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

        {sim && !sim.ok && <p className="mt-3 text-sm text-erro">{sim.erro}</p>}
        {sim?.ok && (
          <div className="mt-4 space-y-2 text-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left">
                <thead className="text-xs text-muted">
                  <tr>
                    <th className="py-1 pr-3">Destino</th>
                    <th className="py-1 pr-3">Frete</th>
                    <th className="py-1 pr-3">No pedido</th>
                    <th className="py-1">Quantidade mínima</th>
                  </tr>
                </thead>
                <tbody>
                  {sim.resultados.map((r, i) => (
                    <tr key={i} className="border-t border-line align-top">
                      <td className="py-2 pr-3">
                        <span className="font-semibold">{ROTULOS[i]}</span>
                        <span className="block text-xs text-muted">{r.destino}</span>
                      </td>
                      {"erro" in r ? (
                        <td colSpan={3} className="py-2 text-xs text-erro">{r.erro}</td>
                      ) : (
                        <>
                          <td className="py-2 pr-3 num">
                            <span className="font-semibold text-ink">{brl(r.frete)}</span>
                            <span className="block text-xs text-muted">{r.km.toLocaleString("pt-BR")} km</span>
                          </td>
                          <td className={`py-2 pr-3 num ${COR[r.faixa]}`}>
                            {pct(r.pct)} de {brl(r.pedido)}
                            <span className="block text-xs">{NOME[r.faixa]}</span>
                          </td>
                          <td className="py-2 text-xs">
                            <button type="button" onClick={() => setQtd(String(r.qtdViavel))} className="block text-aco-600 underline underline-offset-2">
                              viável a partir de {r.qtdViavel} un.
                            </button>
                            <button type="button" onClick={() => setQtd(String(r.qtdIdeal))} className="mt-1 block text-ok underline underline-offset-2">
                              ideal a partir de {r.qtdIdeal} un.
                            </button>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted">
              Frete = km (só a ida) × R$/km + porto + ajudantes. Até {pct(LIMITE_IDEAL)} do pedido é ótimo, até{" "}
              {pct(LIMITE_VIAVEL)} é viável. Clique numa quantidade para usá-la e depois em Salvar.
            </p>
          </div>
        )}
      </dialog>
    </>
  );
}
