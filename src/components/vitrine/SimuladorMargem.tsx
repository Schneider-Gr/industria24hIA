"use client";

import { useState } from "react";

// Simulador da conta do atravessador na LP de captação de seller.
// A premissa da simulação (dividir a diferença ao meio) é a mesma que o Key
// Account usa no pitch: a indústria vende direto por menos do que o lojista
// paga hoje e ainda leva mais por caixa do que recebe do distribuidor.
// Os 5% são a taxa real da plataforma; frete e impostos ficam de fora porque
// variam por operação, e isso está dito no disclaimer.
const TAXA = 0.05;

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 });
const brl0 = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const num = new Intl.NumberFormat("pt-BR");

const LEGENDA = [
  { cor: "bg-verde-24h", texto: "Fica com a sua fábrica" },
  { cor: "bg-sinal", texto: "Fica com o intermediário" },
  { cor: "bg-lm-azul", texto: "Taxa de 5% da plataforma" },
  { cor: "bg-lm-amarelo", texto: "Economia do comprador" },
] as const;

type Segmento = { cor: string; texto: string; pct: number; rotulo: string };

function Barra({ segmentos, rotuloId }: { segmentos: Segmento[]; rotuloId: string }) {
  return (
    <div className="flex h-12 w-full overflow-hidden rounded-sm bg-white/10" role="img" aria-labelledby={rotuloId}>
      {segmentos.map((s) => (
        <div
          key={s.rotulo}
          className={`flex min-w-0 items-center overflow-hidden whitespace-nowrap px-2.5 text-[12px] font-semibold tabular-nums transition-[width] duration-200 ${s.cor} ${s.texto}`}
          style={{ width: `${s.pct.toFixed(2)}%` }}
        >
          {/* Abaixo de ~11% de largura o valor não cabe sem cortar no meio. */}
          {s.pct > 11 ? s.rotulo : ""}
        </div>
      ))}
    </div>
  );
}

function Controle({
  id,
  rotulo,
  valor,
  exibicao,
  min,
  max,
  step,
  onChange,
}: {
  id: string;
  rotulo: string;
  valor: number;
  exibicao: string;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="mb-7">
      <div className="mb-2.5 flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="max-w-[26ch] text-[14.5px] leading-snug text-white/75">
          {rotulo}
        </label>
        <span className="text-[16px] font-bold tabular-nums text-lm-amarelo">{exibicao}</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={valor}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-lm-amarelo"
      />
    </div>
  );
}

export function SimuladorMargem() {
  const [precoLojista, setPrecoLojista] = useState(100);
  const [precoFabricaBruto, setPrecoFabricaBruto] = useState(85);
  const [caixasMes, setCaixasMes] = useState(500);

  // O que a fábrica recebe hoje nunca pode alcançar o preço final do lojista:
  // sem diferença não existe margem de revenda para dividir.
  const precoFabrica = Math.min(precoFabricaBruto, precoLojista - 5);

  const diferenca = precoLojista - precoFabrica;
  const precoDireto = precoFabrica + diferenca / 2;
  const taxa = precoDireto * TAXA;
  const liquido = precoDireto - taxa;
  const ganhoPorCaixa = liquido - precoFabrica;
  const economia = precoLojista - precoDireto;
  const ganhoAno = ganhoPorCaixa * caixasMes * 12;

  const pct = (v: number) => (v / precoLojista) * 100;

  return (
    <div className="grid grid-cols-1 gap-9 md:grid-cols-[minmax(280px,340px)_1fr] md:gap-14">
      <div>
        <Controle
          id="sim-preco-lojista"
          rotulo="Preço que o lojista paga hoje pela caixa"
          valor={precoLojista}
          exibicao={brl0.format(precoLojista)}
          min={40}
          max={600}
          step={5}
          onChange={setPrecoLojista}
        />
        <Controle
          id="sim-preco-fabrica"
          rotulo="Quanto sua fábrica recebe por essa caixa hoje"
          valor={precoFabrica}
          exibicao={brl0.format(precoFabrica)}
          min={20}
          max={590}
          step={5}
          onChange={setPrecoFabricaBruto}
        />
        <Controle
          id="sim-caixas-mes"
          rotulo="Caixas que você vende por mês"
          valor={caixasMes}
          exibicao={num.format(caixasMes)}
          min={50}
          max={5000}
          step={50}
          onChange={setCaixasMes}
        />
      </div>

      <div>
        <div className="flex flex-col gap-6">
          <div>
            <div className="mb-2.5 flex items-baseline justify-between gap-4">
              <span className="font-display text-[16px] font-bold text-white">Hoje, pelo distribuidor</span>
              <span id="sim-nota-hoje" className="text-[12.5px] tabular-nums text-white/60">
                caixa de {brl0.format(precoLojista)}
              </span>
            </div>
            <Barra
              rotuloId="sim-nota-hoje"
              segmentos={[
                { cor: "bg-verde-24h", texto: "text-white", pct: pct(precoFabrica), rotulo: brl.format(precoFabrica) },
                { cor: "bg-sinal", texto: "text-white", pct: pct(diferenca), rotulo: brl.format(diferenca) },
              ]}
            />
          </div>

          <div>
            <div className="mb-2.5 flex items-baseline justify-between gap-4">
              <span className="font-display text-[16px] font-bold text-white">Direto, na Indústria 24h</span>
              <span id="sim-nota-direto" className="text-[12.5px] tabular-nums text-white/60">
                caixa de {brl.format(precoDireto)}
              </span>
            </div>
            <Barra
              rotuloId="sim-nota-direto"
              segmentos={[
                { cor: "bg-verde-24h", texto: "text-white", pct: pct(liquido), rotulo: brl.format(liquido) },
                { cor: "bg-lm-azul", texto: "text-white", pct: pct(taxa), rotulo: brl.format(taxa) },
                { cor: "bg-lm-amarelo", texto: "text-lm-marinho", pct: pct(economia), rotulo: brl.format(economia) },
              ]}
            />
          </div>
        </div>

        <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-white/70">
          {LEGENDA.map((l) => (
            <li key={l.texto} className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 flex-none rounded-[2px] ${l.cor}`} aria-hidden />
              {l.texto}
            </li>
          ))}
        </ul>

        <div className="mt-7 flex flex-wrap items-end gap-x-10 gap-y-6 border-t border-white/15 pt-6" aria-live="polite">
          <div>
            <p className="font-display text-[clamp(2rem,4.4vw,2.75rem)] font-extrabold leading-none tabular-nums text-lm-amarelo">
              {ganhoAno >= 0 ? "" : "−"}
              {brl0.format(Math.abs(ganhoAno))}
            </p>
            <p className="mt-2 max-w-[22ch] text-[14px] text-white/70">a mais por ano na sua fábrica</p>
          </div>
          <div>
            <p className="font-display text-[clamp(1.4rem,2.6vw,1.75rem)] font-extrabold leading-none tabular-nums text-white">
              {ganhoPorCaixa >= 0 ? "" : "−"}
              {brl.format(Math.abs(ganhoPorCaixa))}
            </p>
            <p className="mt-2 max-w-[22ch] text-[14px] text-white/70">a mais por caixa</p>
          </div>
          <div>
            <p className="font-display text-[clamp(1.4rem,2.6vw,1.75rem)] font-extrabold leading-none tabular-nums text-white">
              {brl.format(economia)}
            </p>
            <p className="mt-2 max-w-[22ch] text-[14px] text-white/70">de economia para o comprador</p>
          </div>
        </div>

        <p className="mt-5 max-w-[70ch] text-[13px] leading-relaxed text-white/60">
          {ganhoPorCaixa <= 0
            ? "Com essa diferença de preço, os 5% consomem o ganho por caixa. Aumente o preço final do lojista ou reduza o que a fábrica já recebe hoje para ver o efeito da venda direta."
            : "Simulação com os seus números: preço direto = preço da fábrica hoje + metade do que hoje fica com o intermediário, menos a taxa de 5% cobrada apenas em vendas concluídas. Frete e impostos seguem a sua operação."}
        </p>
      </div>
    </div>
  );
}
