"use client";

// Resultado do simulador do avião (#804): custo total por região (km de
// estrada + balsa só de ida), % no pedido, pedido mínimo viável, avisos de
// travessia e grade quantidade × R$/km. Não salva nada: os cliques só preenchem
// as bandas e a quantidade do pop-up.

import { useState } from "react";
import type { ResultadoRegiao, SimulacaoState, TravessiaManual } from "@/app/(seller)/seller/produtos/km-actions";
import { LIMITE_IDEAL, LIMITE_VIAVEL, NOME_CLASSE, type Faixa, type NomeClasse } from "@/lib/logistica-parceiro/simulador-km";

export const ROTULOS = ["Perto", "Médio", "Longe"];
const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const pct = (v: number) => `${Math.round(v * 100)}%`;
const kmTxt = (v: number) => `${v.toLocaleString("pt-BR")} km`;
const veic = (c: NomeClasse) => NOME_CLASSE[c].toLowerCase();
const COR: Record<Faixa, string> = { otimo: "text-ok", viavel: "text-aco-600", inviavel: "text-erro" };
const MARCA: Record<Faixa, string> = { otimo: "★", viavel: "✓", inviavel: "" };
const dataBR = (d: string | null) => (d ? new Date(`${d}T12:00:00`).toLocaleDateString("pt-BR") : "sem data");
const inputCls = "w-full rounded border border-line bg-surface px-2 py-1 text-sm outline-none focus:border-aco-600";

export type AjustesRegiao = {
  travessiaId: (string | null)[];
  balsaEditada: (string | null)[];
  manual: (TravessiaManual | null)[];
  aCombinar: boolean[];
};

export function SimuladorAviao({
  estado,
  ajustes,
  setAjustes,
  onResimular,
  onUsar,
  qtdAtual,
}: {
  estado: Extract<SimulacaoState, { ok: true }>;
  ajustes: AjustesRegiao;
  setAjustes: (a: AjustesRegiao) => void;
  onResimular: () => void;
  onUsar: (v: { qtd?: number; classe?: NomeClasse; valorKm?: number }) => void;
  qtdAtual: number;
}) {
  const [aba, setAba] = useState(0);
  const { regioes, cobrePrimeiras, travessias, qtd } = estado;
  const muda = <K extends keyof AjustesRegiao>(k: K, i: number, v: AjustesRegiao[K][number]) =>
    setAjustes({ ...ajustes, [k]: ajustes[k].map((x, j) => (j === i ? v : x)) });
  const nenhumaViavel = regioes.every((r) => !r.sim || r.sim.faixa === "inviavel");
  const reg = regioes[aba];

  return (
    <div className="mt-4 space-y-4 text-sm">
      {nenhumaViavel && (
        <p className="rounded border border-erro/40 bg-erro/5 p-3 text-ink">
          ⚠ Com {qtd} un., nenhuma região fica viável.{" "}
          {cobrePrimeiras.map((c, k) =>
            c == null ? null : (
              <button key={k} type="button" onClick={() => onUsar({ qtd: c })} className="mr-2 text-aco-600 underline underline-offset-2">
                {c} un. cobre {ROTULOS.slice(0, k + 1).join(" e ").toLowerCase()}
              </button>
            ),
          )}
        </p>
      )}

      <div className="grid gap-3 lg:grid-cols-3">
        {regioes.map((r, i) => (
          <Regiao
            key={i}
            i={i}
            r={r}
            qtd={qtd}
            travessias={travessias}
            ajustes={ajustes}
            muda={muda}
            onResimular={onResimular}
            onUsar={onUsar}
          />
        ))}
      </div>

      {reg?.grade && reg.eixos && reg.sim && (
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-ink">
              Quantidade × R$/km do {veic(reg.sim.frete.classe)}
            </span>
            {regioes.map((r, i) =>
              r.grade ? (
                <button
                  key={i}
                  type="button"
                  onClick={() => setAba(i)}
                  className={`rounded border px-2 py-0.5 text-xs ${aba === i ? "border-aco-600 text-aco-600" : "border-line text-muted"}`}
                >
                  {ROTULOS[i]}
                </button>
              ) : null,
            )}
          </div>
          <div className="mt-2 overflow-x-auto">
            <table className="min-w-[420px] text-left num">
              <thead className="text-xs text-muted">
                <tr>
                  <th className="py-1 pr-3" />
                  {reg.eixos.valoresKm.map((v) => (
                    <th key={v} className="py-1 pr-3">{brl(v)}/km</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {reg.grade.map((linha) => (
                  <tr key={linha[0].qtd} className="border-t border-line">
                    <td className="py-1 pr-3 text-xs text-muted">
                      {linha[0].qtd} un. · {veic(linha[0].classe)}
                    </td>
                    {linha.map((c) => (
                      <td key={c.valorKm} className="py-1 pr-3">
                        <button
                          type="button"
                          title={`Frete ${brl(c.frete)}. Clique para usar ${brl(c.valorKm)}/km no ${veic(c.classe)} e ${c.qtd} un.`}
                          onClick={() => onUsar({ qtd: c.qtd, classe: c.classe, valorKm: c.valorKm })}
                          className={`${COR[c.faixa]} hover:underline`}
                        >
                          {pct(c.pct)} {MARCA[c.faixa]}
                        </button>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-1 text-xs text-muted">
            ✓ viável (até {pct(LIMITE_VIAVEL)} do pedido) · ★ ideal (até {pct(LIMITE_IDEAL)}). Clique numa célula para usar o R$/km e a
            quantidade; salve para gravar.
          </p>
        </div>
      )}
      {qtdAtual !== qtd && <p className="text-xs text-muted">A quantidade mudou: clique em Simular para recalcular.</p>}
    </div>
  );
}

function Regiao({
  i,
  r,
  qtd,
  travessias,
  ajustes,
  muda,
  onResimular,
  onUsar,
}: {
  i: number;
  r: ResultadoRegiao;
  qtd: number;
  travessias: Extract<SimulacaoState, { ok: true }>["travessias"];
  ajustes: AjustesRegiao;
  muda: <K extends keyof AjustesRegiao>(k: K, i: number, v: AjustesRegiao[K][number]) => void;
  onResimular: () => void;
  onUsar: (v: { qtd?: number }) => void;
}) {
  const [kmManual, setKmManual] = useState(ajustes.manual[i]?.kmEstrada ? String(ajustes.manual[i]!.kmEstrada) : "");
  const [travManual, setTravManual] = useState(ajustes.manual[i]?.travessiaId ?? travessias[0]?.id ?? "");
  const [abrirManual, setAbrirManual] = useState(false);

  if (ajustes.aCombinar[i]) {
    return (
      <div className="rounded border border-line p-3">
        <Cabecalho i={i} destino={r.destino} />
        <p className="mt-2 text-ink-2">Entrega a combinar com o comprador nessa região (PRD 050).</p>
        <button type="button" onClick={() => muda("aCombinar", i, false)} className="mt-2 text-xs text-aco-600 underline">
          desfazer
        </button>
      </div>
    );
  }

  if (r.status === "sem_rota") {
    return (
      <div className="rounded border border-warn/60 p-3">
        <Cabecalho i={i} destino={r.destino} selo="⚠ Sem rota por estrada" />
        <p className="mt-2 text-xs text-ink-2">
          O Google não encontrou caminho por estrada até esse destino. Pode ser um lugar que só se alcança por barco, ou uma balsa que o
          Google não conhece.
        </p>
        {!abrirManual ? (
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" onClick={() => setAbrirManual(true)} className="rounded border border-aco-600 px-2 py-1 text-xs text-aco-600">
              Informar travessia
            </button>
            <button type="button" onClick={() => muda("aCombinar", i, true)} className="rounded border border-line px-2 py-1 text-xs text-ink-2">
              Tratar como entrega a combinar
            </button>
          </div>
        ) : (
          <div className="mt-2 space-y-2">
            <label className="block text-xs">
              Km por estrada (sem o trecho de barco)
              <input type="number" min="0" step="0.1" value={kmManual} onChange={(e) => setKmManual(e.target.value)} className={inputCls} />
            </label>
            <label className="block text-xs">
              Travessia
              <select value={travManual} onChange={(e) => setTravManual(e.target.value)} className={inputCls}>
                {travessias.map((t) => (
                  <option key={t.id} value={t.id}>{t.nome}</option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={() => {
                muda("manual", i, { kmEstrada: Number(kmManual.replace(",", ".")) || 0, travessiaId: travManual });
                onResimular();
              }}
              className="rounded bg-aco-600 px-2 py-1 text-xs font-semibold text-white"
            >
              Aplicar e simular
            </button>
          </div>
        )}
      </div>
    );
  }

  if (!r.sim) {
    return (
      <div className="rounded border border-line p-3">
        <Cabecalho i={i} destino={r.destino} />
        <p className="mt-2 text-xs text-erro">{r.erro}</p>
      </div>
    );
  }

  const { frete, faixa, viavel, ideal } = r.sim;
  const pelaTarifa = frete.tarifaMinima > frete.freteKm;
  const t = r.travessia;
  return (
    <div className="rounded border border-line p-3">
      <Cabecalho
        i={i}
        destino={r.destino}
        selo={r.status === "detectada" ? "🚢 Travessia detectada" : r.status === "manual" ? "🚢 Travessia informada" : undefined}
      />
      <dl className="mt-2 space-y-0.5 text-xs text-ink-2 num">
        <div className="flex justify-between gap-2">
          <dt>{pelaTarifa ? `Tarifa mínima do ${veic(frete.classe)}` : `${kmTxt(frete.km)} × ${brl(frete.valorKm)} (${veic(frete.classe)})`}</dt>
          <dd>{brl(Math.max(frete.tarifaMinima, frete.freteKm))}</dd>
        </div>
        {pelaTarifa && <p className="text-muted">km daria {brl(frete.freteKm)}</p>}
        {t && (
          <div className="flex justify-between gap-2">
            <dt>Balsa (só ida)</dt>
            <dd>{brl(frete.balsa)}</dd>
          </div>
        )}
        <div className="flex justify-between gap-2 border-t border-line pt-1 font-semibold text-ink">
          <dt>Custo total</dt>
          <dd>{brl(frete.total)}</dd>
        </div>
      </dl>
      {r.status === "detectada" && r.barco.length > 0 && (
        <p className="mt-1 text-xs text-muted">
          {r.barco.map((b) => `${b.nome} (${kmTxt(Math.round(b.metros / 100) / 10)} de barco)`).join("; ")}: fora do km cobrado.
        </p>
      )}
      {t && (
        <div className="mt-2 space-y-1 text-xs">
          <select
            value={ajustes.travessiaId[i] ?? t.id}
            onChange={(e) => {
              muda("travessiaId", i, e.target.value);
            }}
            className={inputCls}
          >
            {travessias.map((x) => (
              <option key={x.id} value={x.id}>{x.nome}</option>
            ))}
          </select>
          <label className="flex items-center gap-2">
            Valor da balsa
            <input
              type="number"
              min="0"
              step="0.01"
              value={ajustes.balsaEditada[i] ?? ""}
              placeholder={t.porVeiculo[frete.classe] == null ? "informe" : String(t.porVeiculo[frete.classe])}
              onChange={(e) => muda("balsaEditada", i, e.target.value === "" ? null : e.target.value)}
              className={`${inputCls} w-24 ${t.porVeiculo[frete.classe] == null && ajustes.balsaEditada[i] == null ? "border-warn" : ""}`}
            />
            <button type="button" onClick={onResimular} className="text-aco-600 underline">recalcular</button>
          </label>
          <p className="text-muted">
            {t.fonte_descricao ?? "Fonte não informada"} Vigente desde {dataBR(t.vigente_desde)}.
            {!t.fatores_oficiais && " Estimativa: confirme com o operador."}{" "}
            {t.fonte_url && (
              <a href={t.fonte_url} target="_blank" rel="noopener noreferrer" className="underline">fonte</a>
            )}
          </p>
        </div>
      )}
      <p className={`mt-2 text-xs font-semibold ${COR[faixa]}`}>
        {pct(r.sim.pct)} do pedido de {qtd} un. · {faixa === "otimo" ? "ótimo" : faixa === "viavel" ? "viável" : "inviável"}
      </p>
      <p className="mt-1 text-xs">
        {viavel.estavel == null && viavel.primeira == null ? (
          <span className="text-erro">Inviável nessa distância (nenhuma quantidade até 1.000 un.).</span>
        ) : (
          <>
            Viável:{" "}
            {viavel.primeira != null && viavel.primeira !== viavel.estavel && (
              <>
                <Qtd q={viavel.primeira} onUsar={onUsar} /> ({veic(viavel.primeiraClasse!)}){viavel.estavel != null ? " ou " : ""}
              </>
            )}
            {viavel.estavel != null && (
              <>
                a partir de <Qtd q={viavel.estavel} onUsar={onUsar} />
              </>
            )}
            {ideal.estavel != null && (
              <>
                {" "}· ideal a partir de <Qtd q={ideal.estavel} onUsar={onUsar} />
              </>
            )}
          </>
        )}
      </p>
    </div>
  );
}

function Qtd({ q, onUsar }: { q: number; onUsar: (v: { qtd: number }) => void }) {
  return (
    <button type="button" onClick={() => onUsar({ qtd: q })} className="text-aco-600 underline underline-offset-2">
      {q} un.
    </button>
  );
}

function Cabecalho({ i, destino, selo }: { i: number; destino: string; selo?: string }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold text-ink">{ROTULOS[i]}</span>
        {selo && <span className="text-xs font-semibold text-aco-600">{selo}</span>}
      </div>
      <span className="block truncate text-xs text-muted" title={destino}>{destino}</span>
    </div>
  );
}
