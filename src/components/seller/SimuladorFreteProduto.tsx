"use client";

import { useState, useTransition, type RefObject } from "react";
import { simularFreteProduto, type SimuladorProdutoState } from "@/app/(seller)/seller/produtos/km-actions";
import { CLASSES, LIMITE_FRETE_PEDIDO, classePorPeso } from "@/lib/logistica-parceiro/simulador-produto";

// ponytail: destinos de referência fixos (Manaus, onde estão as lojas). Viram
// configuração por loja quando a dona decidir (pendência do handoff 25/09).
const DESTINOS_PADRAO = [
  "Rua Marechal Deodoro, Centro, Manaus - AM, 69005-000",
  "Avenida Noel Nutels, Cidade Nova, Manaus - AM, 69090-000",
  "Iranduba - AM, 69415-000",
];
const ROTULOS = ["Perto", "Médio", "Longe"];
const NOME_CLASSE: Record<string, string> = { moto: "moto", carro: "carro", caminhao: "caminhão" };

const inputCls =
  "mt-1 w-full rounded border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-aco-600";
const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const pct = (v: number) => `${Math.round(v * 100)}%`;
const kg = (v: number) => `${v.toLocaleString("pt-BR")} kg`;

// Fica dentro do <form> do produto: não pode ter <form> próprio, então lê os
// campos do cadastro (ainda não salvos) pelo ref e chama a action direto.
export function SimuladorFreteProduto({ formRef }: { formRef: RefObject<HTMLFormElement | null> }) {
  const [destinos, setDestinos] = useState(DESTINOS_PADRAO);
  const [porto, setPorto] = useState("");
  const [ajudantes, setAjudantes] = useState("0");
  const [valorAjudante, setValorAjudante] = useState("");
  const [state, setState] = useState<SimuladorProdutoState | null>(null);
  const [pending, start] = useTransition();

  function simular() {
    const campo = (n: string) => {
      const el = formRef.current?.elements.namedItem(n) as HTMLInputElement | null;
      const v = Number(String(el?.value ?? "").replace(",", "."));
      return Number.isFinite(v) ? v : 0;
    };
    start(async () => {
      setState(
        await simularFreteProduto({
          produto: {
            pesoKg: campo("peso"),
            alturaCm: campo("altura"),
            larguraCm: campo("largura"),
            comprimentoCm: campo("comprimento"),
            preco: campo("valor"),
          },
          quantidadeMinima: campo("quantidade_minima") || 1,
          destinos,
          porto: Number(porto.replace(",", ".")) || 0,
          ajudantes: Number(ajudantes) || 0,
          valorAjudante: Number(valorAjudante.replace(",", ".")) || 0,
        }),
      );
    });
  }

  return (
    <fieldset className="space-y-3 rounded-lg border border-line p-4">
      <legend className="px-1 text-sm font-semibold">Simulador de frete</legend>
      <p className="text-xs text-muted">
        Usa o peso e as medidas acima para mostrar o peso cobrado, o veículo que leva o pedido, o frete do entregador
        parceiro e quanto ele pesa no pedido. Só sugere: a quantidade mínima muda quando você a edita no cadastro.
      </p>

      <div className="grid gap-3 sm:grid-cols-3">
        {destinos.map((d, i) => (
          <label key={i} className="block text-sm">
            <span className="text-ink-2">{ROTULOS[i]}</span>
            <input
              value={d}
              onChange={(ev) => setDestinos(destinos.map((x, j) => (j === i ? ev.target.value : x)))}
              className={inputCls}
            />
          </label>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block text-sm">
          <span className="text-ink-2">Entrega no porto ou balsa (R$)</span>
          <input type="number" min="0" step="0.01" value={porto} onChange={(ev) => setPorto(ev.target.value)} placeholder="0,00" className={`${inputCls} num`} />
          <span className="mt-1 block text-xs text-muted">Ref. 25/09: balsa Ceasa–Careiro moto R$ 25–45, carro R$ 40–60; Porto de Manaus carro R$ 60.</span>
        </label>
        <label className="block text-sm">
          <span className="text-ink-2">Ajudantes</span>
          <input type="number" min="0" step="1" value={ajudantes} onChange={(ev) => setAjudantes(ev.target.value)} className={`${inputCls} num`} />
        </label>
        <label className="block text-sm">
          <span className="text-ink-2">Valor por ajudante (R$)</span>
          <input type="number" min="0" step="0.01" value={valorAjudante} onChange={(ev) => setValorAjudante(ev.target.value)} placeholder="0,00" className={`${inputCls} num`} />
        </label>
      </div>

      <button
        type="button"
        onClick={simular}
        disabled={pending}
        className="rounded bg-aco-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Calculando…" : "Simular frete"}
      </button>

      {state && !state.ok && <p className="text-sm text-erro">{state.erro}</p>}
      {state?.ok && <Resultados estado={state} />}
    </fieldset>
  );
}

type Ok = Extract<SimuladorProdutoState, { ok: true }>;
type Fonte = Ok["resultados"][number]["tabela"];

function Resultados({ estado }: { estado: Ok }) {
  const { qtd, pesos } = estado;
  return (
    <div className="space-y-3 text-sm">
      <p className="text-ink-2">
        {qtd} un.: peso real {kg(pesos.real)}, cubado {kg(pesos.cubado)} → cobrado <strong className="text-ink">{kg(pesos.cobrado)}</strong>.
        Levam o pedido: {CLASSES.filter((c) => pesos.real <= c.ateKg).map((c) => NOME_CLASSE[c.classe]).join(", ")} (usa{" "}
        {NOME_CLASSE[classePorPeso(pesos.real).classe]}).
      </p>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left">
          <thead className="text-xs text-muted">
            <tr>
              <th className="py-1 pr-3">Destino</th>
              <th className="py-1 pr-3">Entregador parceiro</th>
              <th className="py-1 pr-3">Transportadora de tabela</th>
              <th className="py-1">Melhor Envio</th>
            </tr>
          </thead>
          <tbody>
            {estado.resultados.map((r, i) => (
              <tr key={i} className="border-t border-line align-top">
                <td className="py-2 pr-3">
                  <span className="font-semibold">{ROTULOS[i]}</span>
                  <span className="block text-xs text-muted">{r.destino}</span>
                </td>
                <td className="py-2 pr-3">
                  {"erro" in r.parceiro ? (
                    <span className="text-xs text-erro">{r.parceiro.erro}</span>
                  ) : r.parceiro.ok ? (
                    <Celula
                      valor={r.parceiro.atual.frete.total}
                      pct={r.parceiro.atual.pct}
                      sugestao={r.parceiro.sugestao}
                      qtd={qtd}
                      detalhe={`${r.parceiro.atual.frete.km.toLocaleString("pt-BR")} km de ${NOME_CLASSE[r.parceiro.atual.frete.classe]} = ${brl(r.parceiro.atual.frete.freteKm)}${r.parceiro.atual.frete.total > r.parceiro.atual.frete.freteKm ? " + porto/ajudantes" : ""}`}
                    />
                  ) : null}
                </td>
                <td className="py-2 pr-3"><CelulaFonte f={r.tabela} qtd={qtd} /></td>
                <td className="py-2"><CelulaFonte f={r.melhorEnvio} qtd={qtd} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted">
        Entregador pelo piso do veículo (moto R$ 6, carro R$ 8, caminhão R$ 20 por km, só a ida) até os entregadores cadastrarem
        os próprios valores. Transportadora pela faixa de CEP de destino × peso cobrado. Melhor Envio cota só a quantidade mínima.
        Para tabela e Melhor Envio, o destino precisa ter CEP.
      </p>
    </div>
  );
}

function CelulaFonte({ f, qtd }: { f: Fonte; qtd: number }) {
  if ("motivo" in f) return <span className="text-xs text-muted">{f.motivo}</span>;
  return <Celula valor={f.valor} pct={f.pct} sugestao={f.sugestao} qtd={qtd} detalhe={f.detalhe} />;
}

// Veredito: "R$ 40 é 160% do pedido de 1 un.; com mínimo de 8 un. fica em até 20%".
function Celula({ valor, pct: p, sugestao, qtd, detalhe }: { valor: number; pct: number; sugestao?: number | null; qtd: number; detalhe?: string }) {
  const cabe = p <= LIMITE_FRETE_PEDIDO;
  return (
    <div className="num">
      <span className="font-semibold text-ink">{brl(valor)}</span>
      {detalhe && <span className="block text-xs text-muted">{detalhe}</span>}
      <span className={`block text-xs ${cabe ? "text-ok" : "text-warn"}`}>
        {pct(p)} do pedido de {qtd} un.
        {cabe
          ? ": vale a pena."
          : sugestao === undefined
            ? "." // fonte que não sugere quantidade (Melhor Envio)
            : sugestao === null
              ? ": inviável nessa distância."
              : `; com mínimo de ${sugestao} un. fica em até ${pct(LIMITE_FRETE_PEDIDO)}.`}
      </span>
    </div>
  );
}
