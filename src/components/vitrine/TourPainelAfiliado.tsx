"use client";

import { useState } from "react";

// Tour recreando fielmente as telas reais de /afiliado (mesmos tokens e
// componentes do painel de verdade), não um mockup genérico nem vídeo de
// terceiro — evita prometer visual que o produto não tem.
const PASSOS = [
  {
    titulo: "Solicite a afiliação do produto",
    texto:
      'Em "Solicitar afiliação" você navega pelos produtos com afiliação liberada pela loja e pede para divulgar. A aprovação é da loja.',
  },
  {
    titulo: "Pegue seu link com 1 clique",
    texto:
      "Assim que aprovado, seu link de divulgação já aparece pronto no topo do painel. Um clique copia, outro manda direto pro WhatsApp.",
  },
  {
    titulo: "Acompanhe o que já caiu e o que falta",
    texto:
      'Os cartões "A receber" e "Já recebido" mostram sua comissão separada por status — sem precisar somar nada na mão.',
  },
  {
    titulo: "Confira venda por venda",
    texto:
      "A tabela de vendas traz data, número do pedido e valor do repasse — dá para conferir contra o extrato quando quiser.",
  },
] as const;

export function TourPainelAfiliado() {
  const [passo, setPasso] = useState(0);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr] lg:items-center">
      <div>
        <div className="flex gap-1.5">
          {PASSOS.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setPasso(i)}
              aria-label={`Ir para o passo ${i + 1}`}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                i === passo ? "bg-sinal" : "bg-aco-100"
              }`}
            />
          ))}
        </div>
        <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.08em] text-sinal">
          Passo {passo + 1} de {PASSOS.length}
        </p>
        <h3 className="mt-1 font-archivo text-xl font-extrabold text-aco-900">
          {PASSOS[passo].titulo}
        </h3>
        <p className="mt-2 text-aco-800">{PASSOS[passo].texto}</p>

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={() => setPasso((p) => Math.max(0, p - 1))}
            disabled={passo === 0}
            className="rounded-sm border border-aco-100 px-4 py-2 text-sm font-medium text-aco-800 disabled:opacity-40"
          >
            Voltar
          </button>
          <button
            type="button"
            onClick={() => setPasso((p) => Math.min(PASSOS.length - 1, p + 1))}
            disabled={passo === PASSOS.length - 1}
            className="rounded-sm bg-sinal px-4 py-2 text-sm font-semibold text-white hover:bg-sinal-escuro disabled:opacity-40"
          >
            Próximo
          </button>
        </div>
      </div>

      <TelaDoPasso passo={passo} />
    </div>
  );
}

// Recriação estática das telas reais (mesmos tokens de src/app/(afiliado)),
// uma por passo, para não depender de captura de screenshot.
function TelaDoPasso({ passo }: { passo: number }) {
  return (
    <div className="overflow-hidden rounded-md border border-line bg-white shadow-[0_8px_30px_rgba(15,26,36,.12)]">
      <div className="flex items-center gap-2 border-b border-line bg-aco-900 px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
        <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
        <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
        <p className="ml-2 text-[11px] text-white/50">industria24.com.br/afiliado</p>
      </div>
      <div className="p-4">
        {passo === 0 && <TelaSolicitar />}
        {passo === 1 && <TelaLink />}
        {passo === 2 && <TelaKpis />}
        {passo === 3 && <TelaVendas />}
      </div>
    </div>
  );
}

function TelaSolicitar() {
  return (
    <div className="space-y-2">
      {[
        { nome: "Jambu em conserva 200g", loja: "Sabor da Floresta", pct: "12%" },
        { nome: "Farinha d'água 1kg", loja: "Amazônia Alimentos", pct: "8%" },
      ].map((p) => (
        <div
          key={p.nome}
          className="flex items-center justify-between rounded-sm border border-line p-3"
        >
          <div>
            <p className="text-sm font-medium text-ink">{p.nome}</p>
            <p className="text-xs text-muted">{p.loja}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="num text-sm font-semibold text-sinal">{p.pct}</span>
            <span className="rounded-sm bg-sinal px-3 py-1.5 text-xs font-semibold text-white">
              Solicitar
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function TelaLink() {
  return (
    <div className="rounded-md border border-aco-600 bg-aco-100 p-3.5">
      <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.08em] text-aco-600">
        Seu link de divulgação
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded-sm border border-line bg-surface px-2.5 py-2 text-[12px] text-ink">
          industria24.com.br/produto/jambu-conserva?ref=AND4X7
        </code>
        <span className="rounded-sm bg-sinal px-3 py-2 text-[12px] font-medium text-white">
          Copiar
        </span>
        <span className="rounded-sm border border-line bg-surface px-3 py-2 text-[12px] text-ink-2">
          Enviar
        </span>
      </div>
    </div>
  );
}

function TelaKpis() {
  const kpis = [
    { rotulo: "A receber", valor: "R$ 428,00", cor: "text-sinal" },
    { rotulo: "Já recebido", valor: "R$ 1.910,00", cor: "text-verde-24h" },
    { rotulo: "Vendas", valor: "18", cor: "text-ink" },
    { rotulo: "Afiliações", valor: "3", cor: "text-ink" },
  ];
  return (
    <div className="grid grid-cols-2 gap-2.5">
      {kpis.map((k) => (
        <div key={k.rotulo} className="rounded-md border border-line bg-surface p-3">
          <p className="text-[11px] uppercase tracking-[0.08em] text-muted">{k.rotulo}</p>
          <p className={`num mt-1.5 text-[19px] font-medium ${k.cor}`}>{k.valor}</p>
        </div>
      ))}
    </div>
  );
}

function TelaVendas() {
  const vendas = [
    { data: "18/07", pedido: "#4821", produto: "Jambu em conserva 200g", repasse: "R$ 24,00" },
    { data: "16/07", pedido: "#4809", produto: "Farinha d'água 1kg", repasse: "R$ 12,80" },
  ];
  return (
    <table className="w-full text-left text-[12px]">
      <thead>
        <tr className="border-b border-line text-[11px] uppercase tracking-[0.08em] text-muted">
          <th className="py-2 font-medium">Data</th>
          <th className="py-2 font-medium">Pedido</th>
          <th className="py-2 font-medium">Produto</th>
          <th className="py-2 text-right font-medium">Repasse</th>
        </tr>
      </thead>
      <tbody>
        {vendas.map((v) => (
          <tr key={v.pedido} className="border-b border-line last:border-0">
            <td className="num py-2 text-ink-2">{v.data}</td>
            <td className="num py-2 text-aco-600">{v.pedido}</td>
            <td className="py-2 text-ink">{v.produto}</td>
            <td className="num py-2 text-right font-semibold">{v.repasse}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
