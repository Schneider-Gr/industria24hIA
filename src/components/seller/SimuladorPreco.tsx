"use client";

// Simulador de preço por quantidade e prazo (change simulador-preco-quantidade-prazo).
// Linhas = quantidade (o frete do afiliado se dilui); colunas = prazo de entrega (o custo
// cai e o seller pode dar desconto mantendo o lucro de hoje). Nada aqui grava: o botão
// leva os descontos para o formulário da venda futura.

import Link from "next/link";
import { useEffect, useState } from "react";
import { dadosSimuladorPreco, type DadosSimuladorPreco } from "@/app/(seller)/seller/simulador-preco/actions";
import { formatBRL } from "@/components/seller/format";
import { custoEquivalente, descontoMaximo, liquidoDe, precoComDesconto } from "@/lib/catalogo-compra/montador-faixas";
import {
  compradorPorUnidade,
  curvaDosPrazos,
  custoNoPrazo,
  descontoRecomendado,
  linhasPropostas,
  quantidadeViavel,
} from "@/lib/catalogo-compra/simulador-preco";
import { MAX_DEGRAUS } from "@/lib/venda-futura/preco-curva";

const num = (s: string) => (s.trim() === "" ? null : Number(s.replace(",", ".")));
const inputCls = "num rounded border border-line px-2 py-1 text-sm";
const rotuloCls = "flex flex-col gap-1 text-[11px] font-medium uppercase tracking-wider text-muted";
const PRAZOS_PADRAO = ["0", "15", "30", "60", "90"];

export function SimuladorPreco({
  produtos,
  produtoInicial,
}: {
  produtos: { id: string; nome: string }[];
  produtoInicial?: string;
}) {
  const [produtoId, setProdutoId] = useState(
    produtos.some((p) => p.id === produtoInicial) ? produtoInicial! : (produtos[0]?.id ?? ""),
  );
  const [dados, setDados] = useState<(DadosSimuladorPreco & { id: string }) | null>(null);
  const [custo, setCusto] = useState("");
  const [markup, setMarkup] = useState("");
  const [economia, setEconomia] = useState("");
  const [km, setKm] = useState("15");
  const [prazos, setPrazos] = useState(PRAZOS_PADRAO);
  const [ajuste, setAjuste] = useState<Record<number, string>>({});
  const [qtds, setQtds] = useState<string[]>([]);

  useEffect(() => {
    let vivo = true;
    dadosSimuladorPreco(produtoId).then((d) => {
      if (!vivo) return;
      setDados({ ...d, id: produtoId });
      setAjuste({});
      if (d.ok) {
        const min = Math.max(1, d.qtdMinima ?? 1);
        const joelho = quantidadeViavel({ ...d, km: 15, qtdMinima: d.qtdMinima });
        setQtds(linhasPropostas(min, joelho).map(String));
      }
    });
    return () => {
      vivo = false;
    };
  }, [produtoId]);

  const seletor = (
    <label className={`${rotuloCls} sm:max-w-md`}>
      Produto
      <select
        value={produtoId}
        onChange={(e) => setProdutoId(e.target.value)}
        className="rounded border border-line px-3 py-2 text-sm normal-case tracking-normal text-ink"
      >
        {produtos.map((p) => (
          <option key={p.id} value={p.id}>
            {p.nome}
          </option>
        ))}
      </select>
    </label>
  );

  if (!dados || dados.id !== produtoId) return <div className="space-y-3">{seletor}<p className="text-xs text-muted">Carregando…</p></div>;
  if (!dados.ok) return <div className="space-y-3">{seletor}<p className="text-sm text-erro">{dados.erro}</p></div>;

  const kmNum = Math.max(0, num(km) ?? 0);
  const liquidoAvista = liquidoDe(dados.valorAvista, dados.comissaoPct);
  const custoHoje = custoEquivalente({ custo: num(custo), markup: num(markup), liquidoAvista });
  const economiaPct = Math.max(0, num(economia) ?? 0);
  const comFrete = dados.pesoUnitKg != null && dados.bandas != null;
  const minima = Math.max(1, dados.qtdMinima ?? 1);
  const joelho = quantidadeViavel({ ...dados, km: kmNum, qtdMinima: dados.qtdMinima });

  const colunas = prazos
    .map((p, i) => ({ i, dias: Math.max(0, Math.floor(num(p) ?? 0)) }))
    .map(({ i, dias }) => {
      const custoPrazo = custoHoje != null ? custoNoPrazo(custoHoje, economiaPct, dias) : null;
      const recomendado =
        custoHoje != null && custoPrazo != null
          ? descontoRecomendado({ valorAvista: dados.valorAvista, comissaoPct: dados.comissaoPct, custoHoje, custoPrazo })
          : 0;
      const maximo = custoPrazo != null ? descontoMaximo({ valorAvista: dados.valorAvista, comissaoPct: dados.comissaoPct, custo: custoPrazo }) : null;
      const editado = ajuste[i] != null ? Math.floor(num(ajuste[i]) ?? 0) : null;
      const descontoPct = Math.min(90, Math.max(0, editado ?? recomendado));
      const preco = precoComDesconto(dados.valorAvista, descontoPct);
      const lucro = custoPrazo != null ? liquidoDe(preco, dados.comissaoPct) - custoPrazo : null;
      return { i, dias, custoPrazo, recomendado, maximo, descontoPct, preco, lucro };
    });
  const curva = curvaDosPrazos(colunas.map((c) => ({ dias: c.dias, descontoPct: c.descontoPct }))).slice(0, MAX_DEGRAUS);
  const linkVendaFutura = `/seller/venda-futura?produto=${produtoId}&curva=${encodeURIComponent(JSON.stringify(curva))}`;

  return (
    <div className="space-y-4 text-sm">
      {seletor}

      <p className="text-xs text-muted">
        À vista {formatBRL(dados.valorAvista)} · você recebe {formatBRL(liquidoAvista)} por unidade depois da comissão de{" "}
        {dados.comissaoPct}%{dados.comissaoEstimada ? " (estimada)" : ""}. Custo e economia servem só para simular: não ficam gravados.
      </p>

      <div className="flex flex-wrap items-end gap-3">
        <label className={rotuloCls}>
          Custo hoje por un.
          <input value={custo} onChange={(e) => setCusto(e.target.value)} inputMode="decimal" placeholder="R$" className={`${inputCls} w-24`} />
        </label>
        <span className="pb-1.5 text-xs text-muted">ou</span>
        <label className={rotuloCls}>
          Markup
          <input value={markup} onChange={(e) => setMarkup(e.target.value)} inputMode="decimal" placeholder="ex.: 1,3" className={`${inputCls} w-24`} />
        </label>
        <label className={rotuloCls}>
          Custo cai por mês de antecedência
          <span className="flex items-center gap-1 normal-case tracking-normal">
            <input value={economia} onChange={(e) => setEconomia(e.target.value)} inputMode="decimal" placeholder="ex.: 3" className={`${inputCls} w-16`} />
            <span className="text-ink">%</span>
          </span>
        </label>
        {comFrete && (
          <label className={rotuloCls}>
            Distância do comprador
            <span className="flex items-center gap-1 normal-case tracking-normal">
              <input value={km} onChange={(e) => setKm(e.target.value)} inputMode="decimal" className={`${inputCls} w-16`} />
              <span className="text-ink">km</span>
            </span>
          </label>
        )}
      </div>

      {dados.pesoUnitKg != null && dados.pesoUnitKg >= 50 && (
        <p className="rounded-sm bg-erro/10 px-2 py-1 text-xs font-medium text-erro">
          O produto está com {dados.pesoUnitKg.toLocaleString("pt-BR")} kg por unidade. Se o peso foi cadastrado em gramas, corrija em
          Editar → &quot;Dimensões e peso&quot;: o frete usa esse peso.
        </p>
      )}

      <div className="rounded border border-line bg-surface p-3">
        {comFrete ? (
          <p className="text-[13px] text-ink">
            <strong>Quantidade mínima viável: {joelho} un.</strong>{" "}
            {joelho === minima
              ? "Já na quantidade mínima do produto o frete pesa pouco: pedir mais quase não baixa o preço por unidade."
              : `Até ${joelho} un. o frete ainda pesa no preço; a partir daí dobrar o pedido baixa menos de 2% o que o comprador paga por unidade.`}
          </p>
        ) : (
          <p className="text-xs text-aco-800">
            Sem frete na simulação: cadastre o peso do produto e as bandas no botão avião (Produtos) para ver a quantidade mínima viável.
          </p>
        )}
        {custoHoje == null && (
          <p className="mt-1 text-xs text-muted">Informe o custo ou o markup para ver o desconto que cada prazo permite.</p>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="align-bottom">
              <th className="px-2 py-1 text-left text-[11px] font-medium uppercase tracking-wider text-muted">Quantidade \ entrega</th>
              {colunas.map((c) => (
                <th key={c.i} className="px-2 py-1 text-right text-[11px] font-medium uppercase tracking-wider text-muted">
                  <span className="flex items-center justify-end gap-1 normal-case tracking-normal">
                    <input
                      aria-label={`Prazo ${c.i + 1} em dias`}
                      value={prazos[c.i]}
                      onChange={(e) => setPrazos((ps) => ps.map((p, j) => (j === c.i ? e.target.value : p)))}
                      inputMode="numeric"
                      className={`${inputCls} w-14`}
                    />
                    <span className="text-ink">{c.dias === 0 ? "dias (já)" : "dias"}</span>
                  </span>
                  <span className="mt-1 flex items-center justify-end gap-1 normal-case tracking-normal">
                    <span className="text-ink">desconto</span>
                    <input
                      aria-label={`Desconto do prazo ${c.i + 1}`}
                      value={ajuste[c.i] ?? String(c.recomendado)}
                      onChange={(e) => setAjuste((a) => ({ ...a, [c.i]: e.target.value }))}
                      inputMode="numeric"
                      className={`${inputCls} w-12`}
                    />
                    <span className="text-ink">%</span>
                  </span>
                  {c.custoPrazo != null && (
                    <span className="mt-1 block normal-case tracking-normal">
                      custo {formatBRL(c.custoPrazo)} · sugerido {c.recomendado}% · máx. {c.maximo}%
                    </span>
                  )}
                  {c.lucro != null && (
                    <span className={`block normal-case tracking-normal ${c.lucro < 0 ? "font-semibold text-erro" : "text-ink"}`}>
                      seu lucro {formatBRL(c.lucro)}/un
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {qtds.map((q, li) => {
              const qtd = Math.floor(num(q) ?? 0);
              return (
                <tr key={li} className="border-t border-line">
                  <td className="px-2 py-1">
                    <input
                      aria-label={`Quantidade da linha ${li + 1}`}
                      value={q}
                      onChange={(e) => setQtds((qs) => qs.map((x, j) => (j === li ? e.target.value : x)))}
                      inputMode="numeric"
                      className={`${inputCls} w-20`}
                    />{" "}
                    un.{qtd === joelho && comFrete ? <span className="ml-1 text-[11px] font-semibold text-ok">mínima viável</span> : null}
                  </td>
                  {colunas.map((c) => {
                    const comprador = qtd >= 1 ? compradorPorUnidade({ ...dados, km: kmNum, preco: c.preco, qtd }) : null;
                    return (
                      <td key={c.i} className="num px-2 py-1 text-right">
                        <span className="font-semibold">{formatBRL(comprador ?? c.preco)}</span>
                        <span className="block text-[11px] text-muted">
                          {comprador != null ? `${formatBRL(c.preco)} + frete ${formatBRL(comprador - c.preco)}` : "sem frete"}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-[11px] text-muted">
        Cada célula é quanto o comprador paga por unidade, com o frete do afiliado logístico até a distância informada. O desconto
        sugerido é o maior que mantém o seu lucro por unidade de hoje, porque produzir com antecedência custa menos; o máximo é o limite
        sem prejuízo.
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setQtds((qs) => [...qs, ""])}
          className="rounded border border-line px-3 py-1 text-[13px] font-medium text-aco-600 hover:bg-aco-100"
        >
          + Quantidade
        </button>
        {prazos.length < MAX_DEGRAUS + 1 && (
          <button
            type="button"
            onClick={() => setPrazos((ps) => [...ps, ""])}
            className="rounded border border-line px-3 py-1 text-[13px] font-medium text-aco-600 hover:bg-aco-100"
          >
            + Prazo
          </button>
        )}
        {curva.length > 0 ? (
          <Link href={linkVendaFutura} className="rounded bg-sinal px-4 py-1.5 text-sm font-semibold text-white hover:bg-sinal-escuro">
            Criar lote de venda futura com estes descontos
          </Link>
        ) : (
          <span className="text-xs text-muted">Com desconto em algum prazo futuro, você cria o lote de venda futura daqui.</span>
        )}
      </div>
    </div>
  );
}
