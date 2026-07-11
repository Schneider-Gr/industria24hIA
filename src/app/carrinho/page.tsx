"use client";

import Link from "next/link";
import { VitrineHeader, VitrineFooter } from "@/components/vitrine/ui";
import { useCarrinho } from "@/components/carrinho/carrinho";
import { formatBRL } from "@/components/seller/format";

export default function CarrinhoPage() {
  const { itens, setQuantidade, remover, limpar } = useCarrinho();
  const total = itens.reduce((s, i) => s + i.valor * i.quantidade, 0);

  return (
    <div className="flex min-h-screen flex-col bg-[#FAFAF9]">
      <VitrineHeader />
      <main className="mx-auto w-full max-w-[900px] flex-1 px-4 py-8">
        <h1 className="font-display text-2xl font-bold text-ink">Carrinho</h1>

        {itens.length === 0 ? (
          <div className="mt-6 rounded border border-dashed border-line bg-white p-10 text-center text-sm text-muted">
            Seu carrinho está vazio.{" "}
            <Link href="/" className="text-roxo-800 underline underline-offset-2">
              Voltar às compras
            </Link>
          </div>
        ) : (
          <>
            <p className="mt-1 text-sm text-muted">Loja: {itens[0].loja_nome}</p>

            {/* Mobile: lista em cards (a tabela não cabe em telas pequenas) */}
            <div className="mt-4 space-y-3 md:hidden">
              {itens.map((i) => (
                <div
                  key={`${i.produto_id}:${i.venda_futura_id ?? ""}`}
                  className="rounded-md border border-line bg-white p-3"
                >
                  <div className="flex gap-3">
                    {i.img ? (
                      <img src={i.img} alt="" className="h-16 w-16 shrink-0 rounded-sm object-cover" />
                    ) : (
                      <div className="h-16 w-16 shrink-0 rounded-sm bg-[#F3F4F6]" />
                    )}
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/produto/${i.produto_id}`}
                        className="line-clamp-2 text-sm font-medium text-ink hover:underline"
                      >
                        {i.nome}
                      </Link>
                      {i.venda_futura_id && (
                        <p className="mt-0.5 text-[11px] font-semibold text-info">
                          Reserva · disponível em {i.disponivel_em ?? "—"}
                        </p>
                      )}
                      <p className="num mt-1 text-sm text-ink-2">{formatBRL(i.valor)} /un</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => remover(i.produto_id, i.venda_futura_id)}
                      className="self-start text-xs text-erro underline-offset-2 hover:underline"
                    >
                      Remover
                    </button>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <div>
                      <input
                        type="number"
                        min={i.quantidade_minima ?? 1}
                        value={i.quantidade}
                        onChange={(e) =>
                          setQuantidade(i.produto_id, Number(e.target.value), i.venda_futura_id)
                        }
                        className="num w-20 rounded-sm border border-line px-2 py-1.5 text-center text-sm"
                        aria-label={`Quantidade de ${i.nome}`}
                      />
                      {i.quantidade_minima != null && (
                        <span className="ml-2 text-[11px] text-muted">mín. {i.quantidade_minima}</span>
                      )}
                    </div>
                    <p className="num text-base font-bold text-ink">
                      {formatBRL(i.valor * i.quantidade)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop: tabela */}
            <div className="mt-4 hidden overflow-x-auto rounded border border-line bg-white md:block">
              <table className="w-full text-sm">
                <thead className="bg-surface">
                  <tr>
                    <th className="px-4 py-2 text-left text-[11px] uppercase tracking-wider text-muted">Produto</th>
                    <th className="px-4 py-2 text-right text-[11px] uppercase tracking-wider text-muted">Preço</th>
                    <th className="px-4 py-2 text-center text-[11px] uppercase tracking-wider text-muted">Qtd</th>
                    <th className="px-4 py-2 text-right text-[11px] uppercase tracking-wider text-muted">Subtotal</th>
                    <th className="px-4 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {itens.map((i) => (
                    <tr key={`${i.produto_id}:${i.venda_futura_id ?? ""}`} className="border-t border-line">
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-3">
                          {i.img ? (
                            <img src={i.img} alt="" className="h-10 w-10 rounded object-cover" />
                          ) : (
                            <div className="h-10 w-10 rounded bg-[#F3F4F6]" />
                          )}
                          <div>
                            <Link href={`/produto/${i.produto_id}`} className="hover:underline">
                              {i.nome}
                            </Link>
                            {i.venda_futura_id && (
                              <p className="text-[11px] font-semibold text-info">
                                Reserva · disponível em {i.disponivel_em ?? "—"}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="num px-4 py-2 text-right">{formatBRL(i.valor)}</td>
                      <td className="px-4 py-2 text-center">
                        <input
                          type="number"
                          min={i.quantidade_minima ?? 1}
                          value={i.quantidade}
                          onChange={(e) =>
                            setQuantidade(i.produto_id, Number(e.target.value), i.venda_futura_id)
                          }
                          className="num w-20 rounded border border-line px-2 py-1 text-center text-sm"
                          aria-label={`Quantidade de ${i.nome}`}
                        />
                        {i.quantidade_minima != null && (
                          <p className="mt-1 text-[11px] text-muted">mín. {i.quantidade_minima}</p>
                        )}
                      </td>
                      <td className="num px-4 py-2 text-right font-semibold">
                        {formatBRL(i.valor * i.quantidade)}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => remover(i.produto_id, i.venda_futura_id)}
                          className="text-xs text-erro underline-offset-2 hover:underline"
                        >
                          Remover
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <button
                type="button"
                onClick={limpar}
                className="text-sm text-muted underline-offset-2 hover:underline"
              >
                Esvaziar carrinho
              </button>
              <div className="text-right">
                <p className="text-sm text-muted">Total dos itens</p>
                <p className="num text-2xl font-bold text-ink">{formatBRL(total)}</p>
                <p className="text-[11px] text-muted">frete calculado no checkout</p>
              </div>
            </div>

            <div className="mt-6 text-right">
              <Link
                href="/checkout"
                className="inline-flex w-full items-center justify-center rounded-sm bg-laranja px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-laranja-escuro sm:w-auto"
              >
                Fechar pedido
              </Link>
            </div>
          </>
        )}
      </main>
      <VitrineFooter />
    </div>
  );
}
