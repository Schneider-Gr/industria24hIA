"use client";

// Botão avião do produto (#804): bandas de frete por veículo (tarifa mínima e
// R$/km), quantidade mínima por pedido e o simulador por região com travessia.
// <dialog> nativo: foco e Esc de graça.

import { useActionState, useRef, useState, useTransition } from "react";
import { salvarKmProduto, simularAviao, type KmState, type SimulacaoState } from "@/app/(seller)/seller/produtos/km-actions";
import { SimuladorAviao, ROTULOS, type AjustesRegiao } from "@/components/seller/SimuladorAviao";
import { IconAviao } from "@/components/seller/icons";
import { CLASSES, NOME_CLASSE, type Bandas, type NomeClasse } from "@/lib/logistica-parceiro/simulador-km";

// ponytail: destinos de referência fixos (Manaus, onde estão as lojas), com CEP
// validado no ViaCEP em 25/09; o seller pode editar. Longe = Manaquiri, cuja rota
// passa pela balsa da Ceasa (FERRY na Routes API, verificado em 25/09).
const DESTINOS_PADRAO = [
  "Rua Marechal Deodoro, Centro, Manaus - AM, 69005-000",
  "Avenida Noel Nutels, Cidade Nova, Manaus - AM, 69090-000",
  "Manaquiri - AM",
];

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const inputCls = "w-full rounded border border-line bg-surface px-2 py-1.5 text-sm outline-none focus:border-aco-600 num";
const faixaPeso = (i: number) => (CLASSES[i].ateKg === Infinity ? `acima de ${CLASSES[i - 1].ateKg} kg` : `até ${CLASSES[i].ateKg} kg`);
const numOuNull = (t: string) => (t.trim() === "" ? null : Number(t.replace(",", ".")));
type Texto = Record<NomeClasse, { tarifaMinima: string; valorKm: string }>;
const paraTexto = (b: Bandas) =>
  Object.fromEntries(
    CLASSES.map((c) => [c.classe, { tarifaMinima: b[c.classe].tarifaMinima?.toFixed(2) ?? "", valorKm: b[c.classe].valorKm?.toFixed(2) ?? "" }]),
  ) as Texto;
const ajustesVazios = (): AjustesRegiao => ({ travessiaId: [null, null, null], balsaEditada: [null, null, null], manual: [null, null, null], aCombinar: [false, false, false] });

export function AviaoKm({
  produto,
}: {
  produto: { id: string; nome: string; permite_logistica_afiliado: boolean; quantidade_minima: number | null; bandas: Bandas };
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [state, action, pending] = useActionState<KmState, FormData>(salvarKmProduto, { ok: false });
  // Controlados: o React 19 limpa o form após a action, e o simulador usa os mesmos valores.
  const [texto, setTexto] = useState<Texto>(() => paraTexto(produto.bandas));
  const [qtd, setQtd] = useState(String(produto.quantidade_minima ?? 1));
  const [destinos, setDestinos] = useState(DESTINOS_PADRAO);
  const [ajustes, setAjustes] = useState<AjustesRegiao>(ajustesVazios);
  const [sim, setSim] = useState<SimulacaoState | null>(null);
  const [simulando, start] = useTransition();
  // Flag antiga da 0079 nasce true; sem nenhuma banda o parceiro não está de fato ativo.
  const ativo = produto.permite_logistica_afiliado && CLASSES.some((c) => produto.bandas[c.classe].valorKm != null);

  const bandas = Object.fromEntries(
    CLASSES.map((c) => [c.classe, { tarifaMinima: numOuNull(texto[c.classe].tarifaMinima), valorKm: numOuNull(texto[c.classe].valorKm) }]),
  ) as Bandas;
  const muda = (classe: NomeClasse, campo: "tarifaMinima" | "valorKm", v: string) =>
    setTexto((t) => ({ ...t, [classe]: { ...t[classe], [campo]: v } }));
  const qtdNum = Math.max(1, Math.floor(Number(qtd) || 1));

  function simular(a: AjustesRegiao = ajustes) {
    start(async () => {
      setSim(
        await simularAviao({
          produtoId: produto.id,
          qtd: qtdNum,
          bandas,
          destinos,
          travessiaId: a.travessiaId,
          balsaEditada: a.balsaEditada.map((v) => (v == null ? null : Number(v.replace(",", ".")) || 0)),
          manual: a.manual,
        }),
      );
    });
  }

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
        className="m-auto w-full max-w-5xl rounded-lg border border-line bg-surface p-6 text-left backdrop:bg-black/40"
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
          Frete = o maior entre a tarifa mínima e km de estrada (só a ida) × R$/km do veículo que o peso do pedido exige, mais a balsa
          quando a rota atravessa o rio. Simule para ver o custo em cada região e o pedido mínimo viável.
        </p>

        <form action={action} className="mt-4 space-y-3">
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
                      <span className="block text-xs text-muted">{faixaPeso(i)}</span>
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

          <div className="grid gap-3 sm:grid-cols-4">
            <label className="block text-sm">
              <span className="text-ink-2">Quantidade mínima por pedido</span>
              <input name="quantidade_minima" type="number" min="1" step="1" value={qtd} onChange={(e) => setQtd(e.target.value)} className={`mt-1 ${inputCls}`} />
            </label>
            {destinos.map((d, i) => (
              <label key={i} className="block text-sm">
                <span className="text-ink-2">{ROTULOS[i]}</span>
                <input
                  value={d}
                  onChange={(ev) => setDestinos(destinos.map((x, j) => (j === i ? ev.target.value : x)))}
                  className={`mt-1 ${inputCls}`}
                />
              </label>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => simular()}
              disabled={simulando}
              className="rounded border border-aco-600 px-4 py-2 text-sm font-semibold text-aco-600 hover:bg-aco-600/10 disabled:opacity-60"
            >
              {simulando ? "Calculando…" : "Simular"}
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
          <SimuladorAviao
            estado={sim}
            ajustes={ajustes}
            setAjustes={setAjustes}
            onResimular={(a) => simular(a)}
            qtdAtual={qtdNum}
            onUsar={({ qtd: q, classe, valorKm }) => {
              if (q != null) setQtd(String(q));
              if (classe && valorKm != null) muda(classe, "valorKm", valorKm.toFixed(2));
            }}
          />
        )}
      </dialog>
    </>
  );
}
