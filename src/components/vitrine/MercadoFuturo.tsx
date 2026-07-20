"use client";

import { useState } from "react";
import { useCarrinho } from "@/components/carrinho/carrinho";
import { formatBRL } from "@/components/seller/format";

export type VendaFuturaItem = {
  id: string;
  produto_id: string;
  produto_nome: string;
  loja_id: string;
  loja_nome: string;
  img: string | null;
  previsao: string; // YYYY-MM-DD
  estoque: number;
  valor: number | null; // preço da reserva; cai pro preço base do produto se nulo
  preco_base: number;
  quantidade_minima: number | null;
};

// Réplica da seção "Datas disponíveis no mercado futuro" da home real:
// abas por data + cards com Disponível em / Estoque / Compra mínima / Reservar.
function formatDataCurta(iso: string, comAno: boolean): string {
  const [ano, mes, dia] = iso.split("-");
  const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  return `${dia} ${meses[Number(mes) - 1]}${comAno ? ` ${ano.slice(2)}` : ""}`;
}

function formatDataCurtaAno(iso: string): string {
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano.slice(2)}`;
}

export function MercadoFuturo({ itens }: { itens: VendaFuturaItem[] }) {
  // Ordem cronológica ascendente (ISO YYYY-MM-DD ordena lexicograficamente).
  const datas = [...new Set(itens.map((i) => i.previsao))].sort();
  // Com datas de anos diferentes, o rótulo "20 Jul" depois de "18 Set" parece
  // fora de ordem — mostra o ano quando o conjunto cruza anos.
  const multiAno = new Set(datas.map((d) => d.slice(0, 4))).size > 1;
  const [ativa, setAtiva] = useState(datas[0] ?? "");
  const { adicionar, trocarLoja } = useCarrinho();
  const [reservado, setReservado] = useState<Record<string, boolean>>({});
  const [conflito, setConflito] = useState<VendaFuturaItem | null>(null);

  if (itens.length === 0) return null;

  const visiveis = itens.filter((i) => i.previsao === ativa);

  function reservar(item: VendaFuturaItem) {
    const carrinhoItem = {
      produto_id: item.produto_id,
      nome: item.produto_nome,
      valor: item.valor ?? item.preco_base,
      quantidade: item.quantidade_minima ?? 1,
      quantidade_minima: item.quantidade_minima,
      loja_id: item.loja_id,
      loja_nome: item.loja_nome,
      img: item.img,
      venda_futura_id: item.id,
      disponivel_em: formatDataCurtaAno(item.previsao),
    };
    if (adicionar(carrinhoItem)) {
      setReservado((r) => ({ ...r, [item.id]: true }));
    } else {
      setConflito(item);
    }
  }

  return (
    <section id="mercado-futuro" className="mx-auto mt-10 max-w-[1280px] px-4 sm:px-6">
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-[.12em] text-sinal">
          Compre do Mercado Futuro
        </p>
        <h2 className="font-display text-[22px] font-bold text-ink sm:text-[28px]">
          Datas disponíveis no mercado futuro
        </h2>
      </div>

      <div className="scroll-chips flex gap-2 overflow-x-auto pb-2">
        {datas.map((d) => {
          const estoqueTotal = itens
            .filter((i) => i.previsao === d)
            .reduce((s, i) => s + i.estoque, 0);
          return (
            <button
              key={d}
              type="button"
              onClick={() => setAtiva(d)}
              aria-pressed={ativa === d}
              className={`shrink-0 rounded-md border-b-2 px-4 py-2 text-sm text-white transition-colors ${
                ativa === d
                  ? "border-sinal bg-aco-600"
                  : "border-transparent bg-aco-900 hover:bg-aco-800"
              }`}
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="mr-1.5 inline-block h-4 w-4 align-[-3px]"
              >
                <rect x="3" y="5" width="18" height="16" rx="2" />
                <path d="M8 3v4M16 3v4M3 11h18" />
              </svg>
              <span className="font-bold">{formatDataCurta(d, multiAno)}</span>
              <span className="num ml-2 text-xs opacity-80">{estoqueTotal} Un.</span>
            </button>
          );
        })}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {visiveis.map((item) => (
          <div
            key={item.id}
            className="flex flex-col overflow-hidden rounded-md border border-line bg-surface"
          >
            <div className="aspect-square w-full overflow-hidden bg-[#F3F4F6]">
              {item.img ? (
                <img src={item.img} alt={item.produto_nome} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs text-muted">
                  sem imagem
                </div>
              )}
            </div>
            <div className="flex flex-1 flex-col gap-1 p-3">
              <p className="line-clamp-2 text-sm leading-snug text-ink">{item.produto_nome}</p>
              <p className="text-[11px] text-muted">{item.loja_nome}</p>
              <div className="mt-1">
                {item.valor != null && item.valor !== item.preco_base && (
                  <span className="num block text-[13px] text-muted line-through">
                    {formatBRL(item.preco_base)}
                  </span>
                )}
                <span className="num text-[19px] font-bold leading-tight text-ink">
                  {formatBRL(item.valor ?? item.preco_base)}
                </span>
              </div>
              <p className="text-[11px] text-muted">
                Disponível em: {formatDataCurtaAno(item.previsao)}
              </p>
              <div className="flex flex-wrap gap-1">
                <span className="num rounded-sm bg-aco-100 px-2 py-0.5 text-[11px] font-medium text-aco-600">
                  estoque {item.estoque}
                </span>
                {item.quantidade_minima != null && (
                  <span className="num rounded-sm bg-aco-100 px-2 py-0.5 text-[11px] font-medium text-aco-600">
                    mín. {item.quantidade_minima} un
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => reservar(item)}
                disabled={reservado[item.id]}
                className="mt-2 w-full rounded-sm bg-sinal px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-sinal-escuro disabled:opacity-60"
              >
                {reservado[item.id] ? "Reservado ✓" : "Reservar"}
              </button>
              {reservado[item.id] && (
                <p
                  role="status"
                  className="mt-1 rounded-sm bg-green-100 px-2 py-1 text-[11px] font-medium text-green-800"
                >
                  Reserva adicionada ao carrinho.
                </p>
              )}
              {conflito?.id === item.id && (
                <div role="alert" className="mt-1 rounded border border-warn bg-warn/10 p-2 text-[11px]">
                  Seu carrinho tem itens de outra loja.
                  <button
                    type="button"
                    onClick={() => {
                      trocarLoja({
                        produto_id: item.produto_id,
                        nome: item.produto_nome,
                        valor: item.valor ?? item.preco_base,
                        quantidade: item.quantidade_minima ?? 1,
                        quantidade_minima: item.quantidade_minima,
                        loja_id: item.loja_id,
                        loja_nome: item.loja_nome,
                        img: item.img,
                        venda_futura_id: item.id,
                        disponivel_em: formatDataCurtaAno(item.previsao),
                      });
                      setReservado((r) => ({ ...r, [item.id]: true }));
                      setConflito(null);
                    }}
                    className="ml-1 font-semibold text-aco-600 underline"
                  >
                    Esvaziar e reservar
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
