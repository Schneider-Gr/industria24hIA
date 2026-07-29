"use client";

import Link from "next/link";
import { VitrineHeader, VitrineFooter } from "@/components/vitrine/ui";
import { useCarrinho, type ItemCarrinho } from "@/components/carrinho/carrinho";
import { formatBRL } from "@/components/seller/format";
import { CrossSellRail } from "@/components/carrinho/CrossSellRail";

function agruparPorLoja(itens: ItemCarrinho[]) {
  const grupos = new Map<string, { loja_nome: string; itens: ItemCarrinho[] }>();
  for (const item of itens) {
    const grupo = grupos.get(item.loja_id);
    if (grupo) grupo.itens.push(item);
    else grupos.set(item.loja_id, { loja_nome: item.loja_nome, itens: [item] });
  }
  return [...grupos.entries()].map(([loja_id, g]) => ({ loja_id, ...g }));
}

export default function CarrinhoPage() {
  const { itens, setQuantidade, remover, limpar, aceiteTermosMf, setAceiteTermosMf } = useCarrinho();
  const total = itens.reduce((s, i) => s + i.valor * i.quantidade, 0);
  const temVendaFutura = itens.some((i) => i.venda_futura_id);
  // Gate B2B do Mercado Futuro: exige aceite dos termos ANTES de seguir para o
  // checkout/login. Sem item de venda futura, o fluxo segue direto.
  const podeFechar = !temVendaFutura || aceiteTermosMf;
  const grupos = agruparPorLoja(itens);

  return (
    <div className="flex min-h-screen flex-col bg-[#FAFAF9]">
      <VitrineHeader />
      <main className="mx-auto w-full max-w-[900px] flex-1 px-4 py-8">
        <h1 className="font-display text-2xl font-bold text-ink">Carrinho</h1>

        {itens.length === 0 ? (
          <div className="mt-6 rounded border border-dashed border-line bg-white p-10 text-center text-sm text-muted">
            Seu carrinho está vazio.{" "}
            <Link href="/" className="text-lm-azul underline underline-offset-2">
              Voltar às compras
            </Link>
          </div>
        ) : (
          <>
            {grupos.length > 1 && (
              <p className="mt-1 text-sm text-muted">
                Seu carrinho tem itens de <span className="font-semibold text-ink">{grupos.length} lojas</span> —
                cada uma vira um pedido separado, com frete próprio.
              </p>
            )}

            <div className="mt-4 space-y-6">
              {grupos.map((grupo, idx) => {
                const subtotal = grupo.itens.reduce((s, i) => s + i.valor * i.quantidade, 0);
                return (
                  <div key={grupo.loja_id} className="rounded-md border border-line bg-white">
                    <div className="flex items-center justify-between border-b border-line bg-lm-cinza px-4 py-2.5">
                      <div>
                        <p className="text-[11px] uppercase tracking-wider text-muted">
                          {grupos.length > 1 ? `Entrega ${idx + 1}` : "Loja"}
                        </p>
                        <p className="text-sm font-semibold text-ink">{grupo.loja_nome}</p>
                      </div>
                      <p className="num text-sm font-semibold text-ink">{formatBRL(subtotal)}</p>
                    </div>

                    {/* Mobile: lista em cards (a tabela não cabe em telas pequenas) */}
                    <div className="space-y-3 p-3 md:hidden">
                      {grupo.itens.map((i) => (
                        <div
                          key={`${i.produto_id}:${i.venda_futura_id ?? ""}`}
                          className="rounded-md border border-line p-3"
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
                    <div className="hidden overflow-x-auto md:block">
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
                          {grupo.itens.map((i) => (
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
                  </div>
                );
              })}
            </div>

            <CrossSellRail itens={itens} />

            {temVendaFutura && (
              <div className="mt-6 rounded border border-info/40 bg-info/5 p-4">
                <p className="text-sm font-semibold text-ink">Compra no Mercado Futuro (B2B)</p>
                <p className="mt-1 text-[13px] text-muted">
                  Seu carrinho tem item de Mercado Futuro. Essa é uma compra entre
                  empresas, firme e irretratável — no checkout exigiremos CNPJ ou
                  Inscrição Estadual de produtor rural.
                </p>
                <label className="mt-3 flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={aceiteTermosMf}
                    onChange={(e) => setAceiteTermosMf(e.target.checked)}
                    className="mt-0.5"
                  />
                  <span>
                    Li e aceito os{" "}
                    <Link href="/termos/termos-mercado-futuro" target="_blank" className="text-lm-azul underline">
                      Termos de Compra do Mercado Futuro
                    </Link>{" "}
                    e declaro que compro no exercício da minha atividade empresarial ou produtiva.
                  </span>
                </label>
              </div>
            )}

            <div className="sticky bottom-0 z-10 mt-6 -mx-4 border-t border-line bg-white p-3 md:static md:z-auto md:mx-0 md:border-0 md:p-0">
              <div className="flex items-center justify-between">
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

              <div className="mt-3 text-right md:mt-6">
                {podeFechar ? (
                  <Link
                    href="/checkout"
                    className="inline-flex w-full items-center justify-center rounded-sm bg-lm-azul px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-lm-azul-escuro sm:w-auto"
                  >
                    Fechar pedido
                  </Link>
                ) : (
                  <button
                    type="button"
                    disabled
                    title="Aceite os Termos do Mercado Futuro para continuar"
                    className="inline-flex w-full cursor-not-allowed items-center justify-center rounded-sm bg-lm-azul/40 px-6 py-3 text-base font-semibold text-white sm:w-auto"
                  >
                    Fechar pedido
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </main>
      <VitrineFooter />
    </div>
  );
}
