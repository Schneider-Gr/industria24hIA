"use client";

import Link from "next/link";
import { VitrineHeader, VitrineFooter } from "@/components/vitrine/ui";
import { useCarrinho, type ItemCarrinho } from "@/components/carrinho/carrinho";
import { formatBRL } from "@/components/seller/format";
import { CrossSellRail } from "@/components/carrinho/CrossSellRail";
import { slugify } from "@/lib/slug";

function agruparPorLoja(itens: ItemCarrinho[]) {
  const grupos = new Map<string, { loja_nome: string; itens: ItemCarrinho[] }>();
  for (const item of itens) {
    const grupo = grupos.get(item.loja_id);
    if (grupo) grupo.itens.push(item);
    else grupos.set(item.loja_id, { loja_nome: item.loja_nome, itens: [item] });
  }
  return [...grupos.entries()].map(([loja_id, g]) => ({ loja_id, ...g }));
}

function IconeLixeira({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden>
      <path d="M4 7h16" strokeLinecap="round" />
      <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 11v6M14 11v6" strokeLinecap="round" />
    </svg>
  );
}

function IconeSacola({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden>
      <path d="M6 8h12l-1 12a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L6 8z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" strokeLinecap="round" />
    </svg>
  );
}

function IconeCaminhao({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden>
      <rect x="1" y="6" width="15" height="12" rx="2" />
      <path d="M16 10h4l3 3v5h-7z" />
      <circle cx="6" cy="19" r="1.6" />
      <circle cx="18" cy="19" r="1.6" />
    </svg>
  );
}

/** Stepper +/- consistente com o da PDP (BotaoAddCarrinho) — troca o input
 * numérico solto por algo com alvo de toque maior e ação visível. */
function StepperQtd({ item, onChange }: { item: ItemCarrinho; onChange: (q: number) => void }) {
  const minimo = item.quantidade_minima ?? 1;
  return (
    <div className="flex w-fit items-center rounded border border-line bg-surface">
      <button
        type="button"
        onClick={() => onChange(Math.max(minimo, item.quantidade - 1))}
        disabled={item.quantidade <= minimo}
        aria-label={`Diminuir quantidade de ${item.nome}`}
        className="flex h-8 w-8 shrink-0 items-center justify-center text-base font-semibold text-ink-2 disabled:opacity-30"
      >
        −
      </button>
      <input
        type="number"
        min={minimo}
        value={item.quantidade}
        onChange={(e) => onChange(Math.max(minimo, Number(e.target.value) || minimo))}
        className="num h-8 w-12 border-x border-line bg-transparent text-center text-[13px] outline-none"
        aria-label={`Quantidade de ${item.nome}`}
      />
      <button
        type="button"
        onClick={() => onChange(item.quantidade + 1)}
        aria-label={`Aumentar quantidade de ${item.nome}`}
        className="flex h-8 w-8 shrink-0 items-center justify-center text-base font-semibold text-ink-2"
      >
        +
      </button>
    </div>
  );
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
      <main className="mx-auto w-full max-w-[1100px] flex-1 px-4 py-6 md:py-8">
        <h1 className="font-display flex items-center gap-2 text-2xl font-bold text-ink">
          <IconeSacola className="h-6 w-6 text-lm-azul" />
          Carrinho
        </h1>

        {itens.length === 0 ? (
          <div className="mt-6 rounded border border-dashed border-line bg-white p-10 text-center text-sm text-muted">
            <IconeSacola className="mx-auto mb-3 h-10 w-10 text-line" />
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

            {/* Itens à esquerda, resumo fixo à direita a partir de telas grandes
                (padrão de carrinho de e-commerce — ex. Leroy Merlin) — no mobile
                o resumo/CTA vira a barra fixa no rodapé, como já era. */}
            <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px] lg:items-start">
              <div className="min-w-0 space-y-5">
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
                                  href={`/produto/${i.produto_id}/${slugify(i.nome)}`}
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
                                aria-label={`Remover ${i.nome} do carrinho`}
                                title="Remover"
                                className="self-start text-erro hover:text-erro/70"
                              >
                                <IconeLixeira />
                              </button>
                            </div>
                            <div className="mt-3 flex items-center justify-between">
                              <div>
                                <StepperQtd
                                  item={i}
                                  onChange={(q) => setQuantidade(i.produto_id, q, i.venda_futura_id)}
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
                                      <Link href={`/produto/${i.produto_id}/${slugify(i.nome)}`} className="hover:underline">
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
                                  <div className="flex flex-col items-center gap-1">
                                    <StepperQtd
                                      item={i}
                                      onChange={(q) => setQuantidade(i.produto_id, q, i.venda_futura_id)}
                                    />
                                    {i.quantidade_minima != null && (
                                      <p className="text-[11px] text-muted">mín. {i.quantidade_minima}</p>
                                    )}
                                  </div>
                                </td>
                                <td className="num px-4 py-2 text-right font-semibold">
                                  {formatBRL(i.valor * i.quantidade)}
                                </td>
                                <td className="px-4 py-2 text-right">
                                  <button
                                    type="button"
                                    onClick={() => remover(i.produto_id, i.venda_futura_id)}
                                    aria-label={`Remover ${i.nome} do carrinho`}
                                    title="Remover"
                                    className="text-erro hover:text-erro/70"
                                  >
                                    <IconeLixeira />
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

                <CrossSellRail itens={itens} />

                {temVendaFutura && (
                  <div className="rounded border border-info/40 bg-info/5 p-4">
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
              </div>

              {/* Resumo do pedido — sticky, só em telas grandes; no mobile o
                  CTA e o total viram a barra fixa no rodapé (abaixo). */}
              <aside className="hidden lg:sticky lg:top-4 lg:block">
                <div className="rounded-md border border-line bg-white p-4">
                  <p className="text-sm font-semibold text-ink">Resumo do pedido</p>
                  <div className="mt-3 flex items-center justify-between text-sm text-ink-2">
                    <span>Total dos itens</span>
                    <span className="num font-semibold text-ink">{formatBRL(total)}</span>
                  </div>
                  <p className="mt-1 flex items-center gap-1.5 text-[11px] text-muted">
                    <IconeCaminhao />
                    frete calculado no checkout
                  </p>

                  <div className="mt-4">
                    {podeFechar ? (
                      <Link
                        href="/checkout"
                        className="flex w-full items-center justify-center rounded-sm bg-lm-azul px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-lm-azul-escuro"
                      >
                        Fechar pedido
                      </Link>
                    ) : (
                      <button
                        type="button"
                        disabled
                        title="Aceite os Termos do Mercado Futuro para continuar"
                        className="flex w-full cursor-not-allowed items-center justify-center rounded-sm bg-lm-azul/40 px-6 py-3 text-sm font-semibold text-white"
                      >
                        Fechar pedido
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={limpar}
                    className="mt-3 w-full text-center text-[13px] text-muted underline-offset-2 hover:underline"
                  >
                    Esvaziar carrinho
                  </button>
                </div>
              </aside>
            </div>

            {/* Barra fixa no rodapé — só no mobile/tablet, onde o resumo lateral não aparece. */}
            <div className="sticky bottom-0 z-10 mt-6 -mx-4 border-t border-line bg-white p-3 lg:hidden">
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

              <div className="mt-3 text-right">
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
