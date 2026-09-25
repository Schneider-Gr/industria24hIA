"use client";

import { useState, useTransition } from "react";
import { simularAviao, type SimulacaoState } from "@/app/(seller)/seller/produtos/km-actions";
import { CLASSES, LIMITE_FRETE_PEDIDO, NOME_CLASSE, classePorPeso, type Bandas, type Classe } from "@/lib/logistica-parceiro/simulador-produto";

// ponytail: destinos de referência fixos (Manaus, onde estão as lojas), com CEP
// validado no ViaCEP em 25/09. Viram configuração por loja se a dona pedir.
const DESTINOS_PADRAO = [
  "Rua Marechal Deodoro, Centro, Manaus - AM, 69005-000",
  "Avenida Noel Nutels, Cidade Nova, Manaus - AM, 69090-000",
  "Iranduba - AM, 69415-000",
];
const ROTULOS = ["Perto", "Médio", "Longe"];

const inputCls =
  "mt-1 w-full rounded border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-aco-600";
const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const pct = (v: number) => `${Math.round(v * 100)}%`;
const kg = (v: number) => `${v.toLocaleString("pt-BR")} kg`;
const num = (t: string) => Number(t.replace(",", ".")) || 0;

// Simulador de quantidade do avião: ajuda o seller a descobrir a tarifa mínima
// e o R$/km de cada banda, e a quantidade mínima que faz o frete valer a pena.
// Usa as bandas em edição (ainda não salvas) e o peso/medidas/preço gravados.
export function SimuladorFreteProduto({
  produtoId,
  quantidadeInicial,
  bandas,
  onUsarValorKm,
}: {
  produtoId: string;
  quantidadeInicial: number;
  bandas: Bandas;
  onUsarValorKm: (classe: Classe["classe"], valorKm: number) => void;
}) {
  const [quantidade, setQuantidade] = useState(String(Math.max(1, quantidadeInicial)));
  const [destinos, setDestinos] = useState(DESTINOS_PADRAO);
  const [porto, setPorto] = useState("");
  const [ajudantes, setAjudantes] = useState("0");
  const [valorAjudante, setValorAjudante] = useState("");
  const [state, setState] = useState<SimulacaoState | null>(null);
  const [pending, start] = useTransition();

  function simular() {
    start(async () => {
      setState(
        await simularAviao({
          produtoId,
          quantidade: Math.max(1, Math.floor(num(quantidade))),
          bandas,
          destinos,
          porto: num(porto),
          ajudantes: Math.floor(num(ajudantes)),
          valorAjudante: num(valorAjudante),
        }),
      );
    });
  }

  return (
    <section className="space-y-3 rounded-lg border border-line p-4">
      <h3 className="text-sm font-semibold text-ink">Simular quantidade</h3>
      <p className="text-xs text-muted">
        Usa o peso, as medidas e o preço do produto e as bandas acima (mesmo antes de salvar). Mostra o frete por destino,
        quanto ele pesa no pedido, a quantidade mínima sugerida e até quanto dá para cobrar por km. Só sugere: a quantidade
        mínima do produto muda em Editar.
      </p>

      <div className="grid gap-3 sm:grid-cols-4">
        <label className="block text-sm">
          <span className="text-ink-2">Quantidade</span>
          <input type="number" min="1" step="1" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} className={`${inputCls} num`} />
        </label>
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
      <p className="text-xs text-muted">Ref. 25/09: balsa Ceasa–Careiro moto R$ 25–45, carro R$ 40–60; acesso ao Porto de Manaus carro R$ 60.</p>

      <div className="grid gap-3 sm:grid-cols-3">
        {destinos.map((d, i) => (
          <label key={i} className="block text-sm">
            <span className="text-ink-2">{ROTULOS[i]}</span>
            <input value={d} onChange={(ev) => setDestinos(destinos.map((x, j) => (j === i ? ev.target.value : x)))} className={inputCls} />
          </label>
        ))}
      </div>

      <button
        type="button"
        onClick={simular}
        disabled={pending}
        className="rounded bg-aco-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Calculando…" : "Simular"}
      </button>

      {state && !state.ok && <p className="text-sm text-erro">{state.erro}</p>}
      {state?.ok && <Resultados estado={state} onUsarValorKm={onUsarValorKm} />}
    </section>
  );
}

type Ok = Extract<SimulacaoState, { ok: true }>;
type Fonte = Ok["resultados"][number]["tabela"];
type SimOk = Extract<Ok["resultados"][number]["parceiro"], { ok: true }>;

function Resultados({ estado, onUsarValorKm }: { estado: Ok; onUsarValorKm: (classe: Classe["classe"], valorKm: number) => void }) {
  const { qtd, pedido, pesos, sugestaoKm: sk } = estado;
  return (
    <div className="space-y-3 text-sm">
      {sk && (
        <div className="rounded border border-aco-600/40 bg-aco-600/5 p-3">
          <p className="text-ink">
            R$/km sugerido para {NOME_CLASSE[sk.classe].toLowerCase()}: <strong className="num">{brl(sk.valorKm)}</strong>
          </p>
          <p className="mt-1 text-xs text-ink-2">
            {sk.destinosAcima === 0
              ? `É o maior valor que deixa o frete em até ${pct(LIMITE_FRETE_PEDIDO)} do pedido de ${qtd} un. nos ${sk.destinos} destinos.`
              : `É o piso do veículo: em ${sk.destinosAcima} de ${sk.destinos} destinos nem ele cabe em ${pct(LIMITE_FRETE_PEDIDO)} do pedido de ${qtd} un. Veja abaixo a quantidade mínima sugerida.`}
          </p>
          <button
            type="button"
            onClick={() => onUsarValorKm(sk.classe, sk.valorKm)}
            className="mt-2 rounded border border-aco-600 px-3 py-1 text-xs font-semibold text-aco-600 hover:bg-aco-600/10"
          >
            Usar {brl(sk.valorKm)} na banda {NOME_CLASSE[sk.classe].toLowerCase()}
          </button>
        </div>
      )}
      <p className="text-ink-2">
        {qtd} un. = {brl(pedido)}. Peso real {kg(pesos.real)}, cubado {kg(pesos.cubado)} → cobrado{" "}
        <strong className="text-ink">{kg(pesos.cobrado)}</strong>. Levam o pedido:{" "}
        {CLASSES.filter((c) => pesos.real <= c.ateKg).map((c) => NOME_CLASSE[c.classe].toLowerCase()).join(", ")} (usa{" "}
        {NOME_CLASSE[classePorPeso(pesos.real).classe].toLowerCase()}).
      </p>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left">
          <thead className="text-xs text-muted">
            <tr>
              <th className="py-1 pr-3">Destino</th>
              <th className="py-1 pr-3">Entregador parceiro (bandas)</th>
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
                    <Parceiro r={r.parceiro} qtd={qtd} />
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
        Banda sem R$/km usa o piso do veículo (moto R$ 6, carro R$ 8, caminhão R$ 20). Transportadora pela faixa de CEP de
        destino × peso cobrado. Melhor Envio cota a quantidade simulada. Tabela e Melhor Envio precisam de CEP no destino.
      </p>
    </div>
  );
}

function Parceiro({ r, qtd }: { r: SimOk; qtd: number }) {
  const f = r.atual.frete;
  const pelaTarifa = f.tarifaMinima > f.freteKm;
  const piso = CLASSES.find((c) => c.classe === f.classe)!.pisoKm;
  return (
    <div>
      <Celula
        valor={f.total}
        pct={r.atual.pct}
        sugestao={r.sugestao}
        qtd={qtd}
        detalhe={
          pelaTarifa
            ? `tarifa mínima de ${NOME_CLASSE[f.classe].toLowerCase()} (km daria ${brl(f.freteKm)})`
            : `${f.km.toLocaleString("pt-BR")} km × ${brl(f.valorKm)} (${NOME_CLASSE[f.classe].toLowerCase()})`
        }
        extras={f.total > Math.max(f.tarifaMinima, f.freteKm)}
      />
      {r.valorKmTeto != null && (
        <span className="block text-xs text-ink-2">
          {r.valorKmTeto >= piso
            ? `Com ${qtd} un., cobrando até ${brl(r.valorKmTeto)}/km o frete fica em até ${pct(LIMITE_FRETE_PEDIDO)}.`
            : `Com ${qtd} un., nem o piso (${brl(piso)}/km) cabe em ${pct(LIMITE_FRETE_PEDIDO)}.`}
        </span>
      )}
    </div>
  );
}

function CelulaFonte({ f, qtd }: { f: Fonte; qtd: number }) {
  if ("motivo" in f) return <span className="text-xs text-muted">{f.motivo}</span>;
  return <Celula valor={f.valor} pct={f.pct} sugestao={f.sugestao} qtd={qtd} detalhe={f.detalhe} />;
}

// Veredito: "R$ 40 é 160% do pedido de 1 un.; com mínimo de 8 un. fica em até 20%".
function Celula({
  valor,
  pct: p,
  sugestao,
  qtd,
  detalhe,
  extras = false,
}: {
  valor: number;
  pct: number;
  sugestao?: number | null;
  qtd: number;
  detalhe?: string;
  extras?: boolean;
}) {
  const cabe = p <= LIMITE_FRETE_PEDIDO;
  return (
    <div className="num">
      <span className="font-semibold text-ink">{brl(valor)}</span>
      {detalhe && (
        <span className="block text-xs text-muted">
          {detalhe}
          {extras && " + porto/ajudantes"}
        </span>
      )}
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
