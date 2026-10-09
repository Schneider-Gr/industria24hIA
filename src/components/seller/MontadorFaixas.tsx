"use client";

// Montador de faixas por custo e frete (change montador-faixas-custo-frete). Custo e
// markup só simulam; gravar substitui as faixas da promoção ativa do produto.

import { useEffect, useState } from "react";
import { dadosMontador, gravarFaixasMontador, type DadosMontador } from "@/app/(seller)/seller/promocoes/montador-actions";
import { formatBRL } from "@/components/seller/format";
import {
  custoEquivalente,
  descontoMaximo,
  liquidoDe,
  linhaMontador,
  quantidadesPropostas,
} from "@/lib/catalogo-compra/montador-faixas";

const ROTULOS = ["Perto", "Médio", "Longe"];
const num = (s: string) => (s.trim() === "" ? null : Number(s.replace(",", ".")));
const inputCls = "num rounded border border-line px-2 py-1 text-sm";
const pct = (v: number) => `${Math.round(v * 100)}%`;

export function MontadorFaixas({ produtoId, onGravado }: { produtoId: string; onGravado?: () => void }) {
  const [dados, setDados] = useState<(DadosMontador & { id: string }) | null>(null);
  const [custo, setCusto] = useState("");
  const [markup, setMarkup] = useState("");
  const [distancias, setDistancias] = useState(["5", "15", "30"]);
  const [linhas, setLinhas] = useState<{ qtd: string; desc: string }[]>([]);
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [gravando, setGravando] = useState(false);

  useEffect(() => {
    let vivo = true;
    dadosMontador(produtoId).then((d) => {
      if (!vivo) return;
      setMsg(null);
      setDados({ ...d, id: produtoId });
      if (d.ok) {
        const qs = quantidadesPropostas({ ...d, distanciasKm: [5, 15, 30] });
        setLinhas(qs.map((q, i) => ({ qtd: String(q), desc: i === 0 ? "0" : "" })));
      }
    });
    return () => {
      vivo = false;
    };
  }, [produtoId]);

  if (!dados || dados.id !== produtoId) return <p className="text-xs text-muted">Carregando montador…</p>;
  if (!dados.ok) return <p className="text-sm text-erro">{dados.erro}</p>;

  const distanciasKm = distancias.map((d) => Math.max(0, num(d) ?? 0));
  const liquidoAvista = liquidoDe(dados.valorAvista, dados.comissaoPct);
  const custoEq = custoEquivalente({ custo: num(custo), markup: num(markup), liquidoAvista });
  const dMax = descontoMaximo({ valorAvista: dados.valorAvista, comissaoPct: dados.comissaoPct, custo: custoEq });
  const base = { ...dados, distanciasKm, custo: custoEq };
  const calculadas = linhas.map((l) => {
    const qtd = Math.floor(num(l.qtd) ?? 0);
    const descontoPct = Math.floor(num(l.desc) ?? 0);
    const valida = qtd >= 1 && descontoPct >= 0 && descontoPct <= 90;
    return valida ? linhaMontador({ ...base, qtd, descontoPct }) : null;
  });
  const semFrete = calculadas.every((c) => c == null || c.fretes == null);
  const muda = (i: number, campo: "qtd" | "desc", v: string) => setLinhas((ls) => ls.map((l, j) => (j === i ? { ...l, [campo]: v } : l)));

  async function gravar() {
    const validas = calculadas.filter((c): c is NonNullable<typeof c> => c != null);
    setGravando(true);
    const r = await gravarFaixasMontador(
      produtoId,
      validas.map((c) => ({ qtd: c.qtd, descontoPct: c.descontoPct })),
    );
    setGravando(false);
    setMsg(r.ok ? { ok: true, texto: `${r.faixas} faixa(s) gravada(s) na promoção do produto.` } : { ok: false, texto: r.erro });
    if (r.ok) onGravado?.();
  }

  return (
    <div className="space-y-3 rounded border border-line bg-surface p-3 text-sm">
      <p className="text-[13px] font-semibold text-ink">Montar faixas pelo meu custo e frete</p>
      <p className="text-xs text-muted">
        À vista {formatBRL(dados.valorAvista)} · você recebe {formatBRL(liquidoAvista)} por unidade depois da comissão de{" "}
        {dados.comissaoPct}%{dados.comissaoEstimada ? " (estimada)" : ""}. Custo e markup servem só para simular: não ficam gravados.
      </p>

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-[11px] font-medium uppercase tracking-wider text-muted">
          Custo por un.
          <input value={custo} onChange={(e) => setCusto(e.target.value)} inputMode="decimal" placeholder="R$" className={`${inputCls} w-24`} />
        </label>
        <span className="pb-1.5 text-xs text-muted">ou</span>
        <label className="flex flex-col gap-1 text-[11px] font-medium uppercase tracking-wider text-muted">
          Markup
          <input value={markup} onChange={(e) => setMarkup(e.target.value)} inputMode="decimal" placeholder="ex.: 1,3" className={`${inputCls} w-24`} />
        </label>
        {custoEq != null && (
          <p className="pb-1.5 text-xs text-ink">
            Custo considerado: <strong className="num">{formatBRL(custoEq)}</strong> · desconto máximo sem prejuízo:{" "}
            <strong className="num">{dMax}%</strong>
          </p>
        )}
      </div>

      {/* 33 de 127 produtos aprovados tinham peso ≥ 50 kg/un em 09/10 (gramas digitadas como kg). */}
      {dados.pesoUnitKg != null && dados.pesoUnitKg >= 50 && (
        <p className="rounded-sm bg-erro/10 px-2 py-1 text-xs font-medium text-erro">
          O produto está com {dados.pesoUnitKg.toLocaleString("pt-BR")} kg por unidade. Se o peso foi cadastrado em gramas, corrija em
          Editar → &quot;Dimensões e peso&quot;: o frete abaixo usa esse peso.
        </p>
      )}
      {semFrete ? (
        <p className="rounded-sm bg-aco-100 px-2 py-1 text-xs text-aco-800">
          Sem frete na simulação: cadastre o peso do produto e as bandas no botão avião (Produtos) para ver o frete por unidade e as
          quantidades que diluem o frete.
        </p>
      ) : (
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
          Distância do comprador (km):
          {distancias.map((d, i) => (
            <label key={i} className="flex items-center gap-1">
              {ROTULOS[i]}
              <input
                value={d}
                onChange={(e) => setDistancias((ds) => ds.map((x, j) => (j === i ? e.target.value : x)))}
                inputMode="decimal"
                className={`${inputCls} w-14`}
              />
            </label>
          ))}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wider text-muted">
              <th className="px-2 py-1 font-medium">A partir de</th>
              <th className="px-2 py-1 font-medium">Desconto</th>
              <th className="px-2 py-1 text-right font-medium">Preço</th>
              <th className="px-2 py-1 text-right font-medium">Você recebe</th>
              {!semFrete &&
                ROTULOS.map((r) => (
                  <th key={r} className="px-2 py-1 text-right font-medium">
                    Comprador paga/un · {r.toLowerCase()}
                  </th>
                ))}
              <th />
            </tr>
          </thead>
          <tbody>
            {linhas.map((l, i) => {
              const c = calculadas[i];
              return (
                <tr key={i} className="border-t border-line align-top">
                  <td className="px-2 py-1">
                    <input aria-label={`Quantidade da faixa ${i + 1}`} value={l.qtd} onChange={(e) => muda(i, "qtd", e.target.value)} inputMode="numeric" className={`${inputCls} w-20`} />{" "}
                    un.
                  </td>
                  <td className="px-2 py-1">
                    <input aria-label={`Desconto da faixa ${i + 1}`} value={l.desc} onChange={(e) => muda(i, "desc", e.target.value)} inputMode="numeric" placeholder="0" className={`${inputCls} w-14`} />{" "}
                    %
                  </td>
                  <td className="num px-2 py-1 text-right font-semibold">{c ? formatBRL(c.preco) : "—"}</td>
                  <td className={`num px-2 py-1 text-right ${c?.abaixoCusto ? "text-erro" : ""}`}>
                    {c ? formatBRL(c.liquido) : "—"}
                    {c?.markup != null && <span className="block text-[11px] text-muted">markup {c.markup.toLocaleString("pt-BR")}×</span>}
                    {c?.abaixoCusto && <span className="block text-[11px] font-semibold">abaixo do custo</span>}
                  </td>
                  {!semFrete &&
                    (c?.fretes ?? [null, null, null]).map((f, k) => (
                      <td key={k} className="num px-2 py-1 text-right">
                        {f ? (
                          <>
                            <span className="font-semibold">{formatBRL(f.comprador)}</span>
                            <span className="block text-[11px] text-muted">
                              frete {formatBRL(f.porUn)}/un · {pct(f.pct)} do pedido
                            </span>
                          </>
                        ) : (
                          "—"
                        )}
                      </td>
                    ))}
                  <td className="px-2 py-1">
                    <button type="button" onClick={() => setLinhas((ls) => ls.filter((_, j) => j !== i))} className="text-[13px] text-erro hover:underline">
                      Remover
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-[11px] text-muted">
        O frete é pago pelo comprador ao afiliado logístico, pela banda do avião: quanto maior o pedido, menos frete por unidade, mesmo
        sem desconto. As quantidades sugeridas são a mínima do produto, onde o frete cabe em 20% e em 10% do pedido (distância média) e
        10× a mínima.
      </p>

      <div className="flex flex-wrap items-center gap-3">
        {linhas.length < 10 && (
          <button
            type="button"
            onClick={() => setLinhas((ls) => [...ls, { qtd: "", desc: "" }])}
            className="rounded border border-line px-3 py-1 text-[13px] font-medium text-aco-600 hover:bg-aco-100"
          >
            + Adicionar faixa
          </button>
        )}
        <button
          type="button"
          onClick={gravar}
          disabled={gravando}
          className="rounded bg-sinal px-4 py-1.5 text-sm font-semibold text-white hover:bg-sinal-escuro disabled:opacity-50"
        >
          {gravando ? "Gravando…" : "Gravar faixas"}
        </button>
        <span className="text-[11px] text-muted">
          Substitui as {dados.faixasAtuais.length} faixa(s) atuais. Só entram faixas com desconto.
        </span>
        {msg && <span className={`text-sm ${msg.ok ? "text-ok" : "text-erro"}`}>{msg.texto}</span>}
      </div>
    </div>
  );
}

/** Montador com escolha do produto, para a tela de promoções. */
export function MontadorComProduto({ produtos }: { produtos: { id: string; nome: string }[] }) {
  const [produtoId, setProdutoId] = useState(produtos[0]?.id ?? "");
  return (
    <div className="space-y-3">
      <label className="flex flex-col gap-1 text-[12px] font-medium uppercase tracking-wider text-muted sm:max-w-md">
        Produto
        <select value={produtoId} onChange={(e) => setProdutoId(e.target.value)} className="rounded border border-line px-3 py-2 text-sm normal-case tracking-normal text-ink">
          {produtos.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome}
            </option>
          ))}
        </select>
      </label>
      {produtoId && <MontadorFaixas produtoId={produtoId} />}
    </div>
  );
}
