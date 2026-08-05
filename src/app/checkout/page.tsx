"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { VitrineHeader, VitrineFooter } from "@/components/vitrine/ui";
import { useCarrinho } from "@/components/carrinho/carrinho";
import { ModalRetencaoCheckout } from "@/components/vitrine/ModalRetencaoCheckout";
import { formatBRL } from "@/components/seller/format";
import { createClient } from "@/lib/supabase/client";
import { buscarEndereco, formatarCep } from "@/lib/cep";
import { finalizarCompra, type CheckoutState } from "./actions";

const inputCls =
  "mt-1 w-full rounded border border-line bg-white px-3 py-2 text-sm outline-none focus:border-lm-azul";

// O frete exibido aqui é estimativa client-side (10%); o valor OFICIAL é
// recalculado no banco pela RPC — nunca confiamos no client.
const PERCENTUAL_FRETE_ESTIMADO = 10;

export default function CheckoutPage() {
  const { itens, aceiteTermosMf } = useCarrinho();
  const [logado, setLogado] = useState<boolean | null>(null);
  const [tipo, setTipo] = useState<"retirada" | "entrega">("retirada");
  const [freteConsolidado, setFreteConsolidado] = useState(false);
  const [endereco, setEndereco] = useState({ cidade: "", rua: "", bairro: "" });
  const [cepBuscando, setCepBuscando] = useState(false);
  const [temPerecivel, setTemPerecivel] = useState(false);
  const [state, action, pending] = useActionState<CheckoutState, FormData>(
    finalizarCompra,
    { ok: false },
  );

  useEffect(() => {
    createClient()
      .auth.getUser()
      .then(({ data }) => setLogado(!!data.user));
  }, []);

  // Detecta item perecível no carrinho (PRD 010) para exibir o termo — a
  // fonte de verdade da regra em si é revalidada no servidor no checkout.
  useEffect(() => {
    const produtoIds = [...new Set(itens.map((i) => i.produto_id))];
    const consulta =
      produtoIds.length === 0
        ? Promise.resolve({ data: [] as { perecivel: boolean }[] })
        : createClient().from("produtos").select("perecivel").in("id", produtoIds);
    consulta.then(({ data }) => setTemPerecivel((data ?? []).some((p) => p.perecivel)));
  }, [itens]);

  async function handleCepBlur(e: React.FocusEvent<HTMLInputElement>) {
    const cep = e.target.value;
    e.target.value = formatarCep(cep);
    if (cep.replace(/\D/g, "").length !== 8) return;
    setCepBuscando(true);
    const dados = await buscarEndereco(cep);
    setCepBuscando(false);
    if (dados) {
      setEndereco({
        cidade: dados.cidade ?? "",
        rua: dados.rua ?? "",
        bairro: dados.bairro ?? "",
      });
    }
  }

  if (logado === null) {
    return (
      <Shell>
        <div className="animate-pulse space-y-4">
          <div className="h-24 rounded border border-line bg-white" />
          <div className="h-40 rounded border border-line bg-white" />
        </div>
      </Shell>
    );
  }

  const totalItens = itens.reduce((s, i) => s + i.valor * i.quantidade, 0);
  const freteEstimado =
    tipo === "entrega"
      ? ((totalItens * PERCENTUAL_FRETE_ESTIMADO) / 100) * (freteConsolidado ? 0.7 : 1)
      : 0;
  const temVendaFutura = itens.some((i) => i.venda_futura_id);
  const lojasNoCarrinho = new Set(itens.map((i) => i.loja_id)).size;

  if (itens.length === 0) {
    return (
      <Shell>
        <div className="rounded border border-dashed border-line bg-white p-10 text-center text-sm text-muted">
          Carrinho vazio.{" "}
          <Link href="/" className="text-lm-azul underline underline-offset-2">
            Voltar às compras
          </Link>
        </div>
      </Shell>
    );
  }

  if (logado === false) {
    return (
      <Shell>
        <div className="rounded border border-warn bg-warn/10 p-6 text-sm">
          <p className="font-semibold">Entre para finalizar a compra</p>
          <p className="mt-1 text-muted">
            Seu carrinho fica salvo neste navegador.
          </p>
          <Link
            href={`/login?next=${encodeURIComponent("/checkout")}`}
            className="mt-3 inline-flex rounded bg-lm-azul px-5 py-2 text-sm font-semibold text-white hover:bg-lm-azul-escuro"
          >
            Fazer login
          </Link>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <ModalRetencaoCheckout itens={itens} />
      <form action={action} className="grid grid-cols-1 gap-8 md:grid-cols-[1fr_320px]">
        <input
          type="hidden"
          name="itens"
          value={JSON.stringify(
            itens.map((i) => ({
              produto_id: i.produto_id,
              quantidade: i.quantidade,
              venda_futura_id: i.venda_futura_id ?? null,
              loja_id: i.loja_id,
            })),
          )}
        />

        <div className="order-2 space-y-6 md:order-1">
          {lojasNoCarrinho > 1 && (
            <p className="rounded border border-lm-amarelo/40 bg-lm-amarelo/10 p-3 text-sm text-lm-marinho">
              Seu carrinho tem itens de {lojasNoCarrinho} lojas — isso gera {lojasNoCarrinho}{" "}
              pedidos separados, cada um com seu próprio frete e acompanhamento.
            </p>
          )}
          <section>
            <h2 className="font-display text-lg font-semibold text-ink">Entrega</h2>
            <div className="mt-2 flex gap-2">
              <label
                className={`flex flex-1 cursor-pointer flex-col items-center gap-1.5 rounded border p-3 text-center text-sm ${tipo === "retirada" ? "border-lm-azul bg-lm-azul/10" : "border-line bg-white"}`}
              >
                <input
                  type="radio"
                  name="tipo_entrega"
                  value="retirada"
                  checked={tipo === "retirada"}
                  onChange={() => setTipo("retirada")}
                  className="sr-only"
                />
                <IconeLoja className="h-6 w-6 text-lm-azul" />
                <span className="font-medium">Retirar na loja</span>
                <span className="text-[11px] text-muted">sem frete</span>
              </label>
              <label
                className={`flex flex-1 cursor-pointer flex-col items-center gap-1.5 rounded border p-3 text-center text-sm ${tipo === "entrega" ? "border-lm-azul bg-lm-azul/10" : "border-line bg-white"}`}
              >
                <input
                  type="radio"
                  name="tipo_entrega"
                  value="entrega"
                  checked={tipo === "entrega"}
                  onChange={() => setTipo("entrega")}
                  className="sr-only"
                />
                <IconeCaminhao className="h-6 w-6 text-lm-azul" />
                <span className="font-medium">Entrega</span>
                <span className="text-[11px] text-muted">~{PERCENTUAL_FRETE_ESTIMADO}% do valor</span>
              </label>
            </div>

            {tipo === "entrega" && (
              <label className="mt-3 flex cursor-pointer items-start gap-2 rounded border border-line bg-white p-3 text-sm">
                <input
                  type="checkbox"
                  name="frete_consolidado"
                  checked={freteConsolidado}
                  onChange={(e) => setFreteConsolidado(e.target.checked)}
                  className="mt-0.5"
                />
                <span>
                  Frete consolidado <span className="font-semibold text-lm-azul">(30% de desconto)</span>
                  <span className="mt-0.5 block text-xs text-muted">
                    Seu pedido sai na próxima janela de rota da sua região, junto
                    com outras entregas — mais barato, um pouco menos rápido.
                  </span>
                </span>
              </label>
            )}

            {tipo === "entrega" && (
              <div className="mt-3 grid grid-cols-2 gap-3">
                <label className="col-span-1 block text-sm">
                  <span className="text-ink-2">CEP *</span>
                  <input
                    name="cep"
                    required
                    placeholder="69000-000"
                    onBlur={handleCepBlur}
                    className={inputCls}
                  />
                  {cepBuscando && (
                    <span className="mt-1 block text-[11px] text-muted">Buscando endereço…</span>
                  )}
                </label>
                <label className="col-span-1 block text-sm">
                  <span className="text-ink-2">Cidade *</span>
                  <input
                    name="cidade"
                    required
                    value={endereco.cidade}
                    onChange={(e) => setEndereco((s) => ({ ...s, cidade: e.target.value }))}
                    className={inputCls}
                  />
                </label>
                <label className="col-span-2 block text-sm">
                  <span className="text-ink-2">Rua *</span>
                  <input
                    name="rua"
                    required
                    value={endereco.rua}
                    onChange={(e) => setEndereco((s) => ({ ...s, rua: e.target.value }))}
                    className={inputCls}
                  />
                </label>
                <label className="block text-sm">
                  <span className="text-ink-2">Número *</span>
                  <input name="numero" required className={inputCls} />
                </label>
                <label className="block text-sm">
                  <span className="text-ink-2">Bairro *</span>
                  <input
                    name="bairro"
                    required
                    value={endereco.bairro}
                    onChange={(e) => setEndereco((s) => ({ ...s, bairro: e.target.value }))}
                    className={inputCls}
                  />
                </label>
                <label className="col-span-2 block text-sm">
                  <span className="text-ink-2">Complemento</span>
                  <input name="complemento" className={inputCls} />
                </label>
                <p className="col-span-2 text-[11px] text-muted">
                  Cobertura de entrega limitada às regiões atendidas (o CEP é
                  validado ao concluir). Fora da cobertura, use retirada na loja.
                </p>
              </div>
            )}
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-ink">Pagamento</h2>
            <div className="mt-2 flex gap-2">
              {(["PIX", "BOLETO", "CREDIT_CARD"] as const).map((f) => {
                const Icone = f === "CREDIT_CARD" ? IconeCartao : f === "BOLETO" ? IconeBoleto : IconePix;
                return (
                  <label
                    key={f}
                    className="flex flex-1 cursor-pointer flex-col items-center gap-1.5 rounded border border-line bg-white p-3 text-center text-sm has-checked:border-lm-azul has-checked:bg-lm-azul/10"
                  >
                    <input
                      type="radio"
                      name="forma_pagamento"
                      value={f}
                      defaultChecked={f === "PIX"}
                      className="sr-only"
                    />
                    <Icone className="h-6 w-6 text-lm-azul" />
                    <span className="font-medium">
                      {f === "CREDIT_CARD" ? "Cartão" : f === "BOLETO" ? "Boleto" : "PIX"}
                    </span>
                  </label>
                );
              })}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <label className="block text-sm">
                <span className="text-ink-2">Nome completo *</span>
                <input name="nome" required autoComplete="name" className={inputCls} />
              </label>
              <label className="block text-sm">
                <span className="text-ink-2">CPF ou CNPJ *</span>
                <input name="cpf_cnpj" required inputMode="numeric" className={inputCls} />
              </label>
              <label className="block text-sm">
                <span className="text-ink-2">WhatsApp (com DDD) *</span>
                <input
                  name="telefone"
                  required
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="92 99999-9999"
                  className={inputCls}
                />
              </label>
            </div>
          </section>

          {temVendaFutura && (
            <section className="rounded border border-lm-azul/30 bg-lm-azul/10 p-4">
              <h2 className="font-display text-lg font-semibold text-ink">
                Cadastro de pessoa jurídica (Mercado Futuro)
              </h2>
              <p className="mt-1 text-[13px] text-muted">
                Seu carrinho tem um item do Mercado Futuro — essa compra exige
                CNPJ ou Inscrição Estadual de produtor rural.
              </p>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <label className="block text-sm">
                  <span className="text-ink-2">Tipo de documento *</span>
                  <select name="documento_tipo" required defaultValue="CNPJ" className={inputCls}>
                    <option value="CNPJ">CNPJ</option>
                    <option value="IE">Inscrição Estadual (produtor rural)</option>
                  </select>
                </label>
                <label className="block text-sm">
                  <span className="text-ink-2">Número do documento *</span>
                  <input name="documento_pj" required inputMode="numeric" className={inputCls} />
                </label>
                <label className="col-span-2 block text-sm">
                  <span className="text-ink-2">Razão social</span>
                  <input name="razao_social" className={inputCls} />
                </label>
                <label className="col-span-2 flex items-center gap-2 text-sm">
                  <input type="checkbox" name="produtor_rural" value="on" />
                  Sou produtor rural (pessoa física com Inscrição Estadual)
                </label>
                {aceiteTermosMf ? (
                  // Aceite já coletado no carrinho (antes do login). Só carimba.
                  <input type="hidden" name="aceite_termos_mf" value="on" />
                ) : (
                  // Fallback: acesso direto ao checkout sem passar pelo carrinho.
                  <label className="col-span-2 flex items-start gap-2 text-sm">
                    <input type="checkbox" name="aceite_termos_mf" value="on" required className="mt-0.5" />
                    <span>
                      Li e aceito os{" "}
                      <a href="/termos/termos-mercado-futuro" target="_blank" rel="noopener noreferrer" className="text-lm-azul underline">
                        Termos de Compra do Mercado Futuro
                      </a>{" "}
                      e declaro que compro no exercício da minha atividade empresarial ou produtiva.
                    </span>
                  </label>
                )}
              </div>
            </section>
          )}

          {temPerecivel && (
            <section className="rounded border border-warn/40 bg-warn/10 p-4">
              <h2 className="font-display text-lg font-semibold text-ink">Produto perecível</h2>
              <p className="mt-1 text-[13px] text-muted">
                Seu carrinho tem um item perecível (validade curta) — confira o produto no ato
                do recebimento.
              </p>
              <label className="mt-3 flex items-start gap-2 text-sm">
                <input type="checkbox" name="aceite_termos_pereciveis" value="on" required className="mt-0.5" />
                <span>
                  Li e aceito os{" "}
                  <a
                    href="/termos/termos-produtos-pereciveis"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-lm-azul underline"
                  >
                    Termos de Produtos Perecíveis
                  </a>
                  .
                </span>
              </label>
            </section>
          )}
        </div>

        <aside className="order-1 h-fit rounded border border-line bg-white p-4 md:order-2">
          <h2 className="font-display text-lg font-semibold text-ink">Resumo</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {itens.map((i) => (
              <li key={i.produto_id} className="flex justify-between gap-2">
                <span className="truncate">
                  {i.quantidade}× {i.nome}
                </span>
                <span className="num shrink-0">{formatBRL(i.valor * i.quantidade)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 border-t border-line pt-3 text-sm">
            <p className="flex justify-between">
              <span>Itens</span>
              <span className="num">{formatBRL(totalItens)}</span>
            </p>
            <p className="flex justify-between">
              <span>Frete {tipo === "entrega" ? "(estimado)" : ""}</span>
              <span className="num">{formatBRL(freteEstimado)}</span>
            </p>
            <p className="mt-1 flex justify-between text-base font-bold">
              <span>Total</span>
              <span className="num">{formatBRL(totalItens + freteEstimado)}</span>
            </p>
          </div>
          {state.error && (
            <p role="alert" className="mt-3 rounded border border-erro bg-erro/10 p-3 text-sm text-erro">
              {state.error}
            </p>
          )}
          <button
            type="submit"
            disabled={pending}
            className="mt-4 w-full rounded bg-lm-azul px-5 py-3 text-base font-semibold text-white hover:bg-lm-azul-escuro disabled:opacity-50"
          >
            {pending ? "Processando..." : "Confirmar pedido"}
          </button>
        </aside>
      </form>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-[#FAFAF9]">
      <VitrineHeader />
      <main className="mx-auto w-full max-w-[1000px] flex-1 px-4 py-8">
        <h1 className="font-display mb-6 text-2xl font-bold text-ink">Checkout</h1>
        {children}
      </main>
      <VitrineFooter />
    </div>
  );
}

type IconeProps = { className?: string };

function IconeLoja({ className }: IconeProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d="M3 9.5 4.5 4h15L21 9.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 9.5v9.5a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 20v-6h6v6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 9.5a2.5 2.5 0 0 0 5 0M8 9.5a2.5 2.5 0 0 0 5 0M13 9.5a2.5 2.5 0 0 0 5 0M18 9.5a2.5 2.5 0 0 0 3 0" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function IconeCaminhao({ className }: IconeProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d="M2 7h11v9H2z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M13 10h4l4 3v3h-8z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <circle cx="6.5" cy="18" r="1.6" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="17.5" cy="18" r="1.6" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

function IconePix({ className }: IconeProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d="M8.5 4.5 4.5 8.5a2.8 2.8 0 0 0 0 4l4 4a2.8 2.8 0 0 0 4 0l4-4a2.8 2.8 0 0 0 0-4l-4-4a2.8 2.8 0 0 0-4 0Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="m9.5 9.5 5 5M14.5 9.5l-5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function IconeBoleto({ className }: IconeProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <rect x="3" y="5" width="18" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
      {[6, 7.7, 9.4, 11.1, 12.8, 14.5, 16.2, 17.9].map((x, i) => (
        <line key={x} x1={x} y1="7.5" x2={x} y2="16.5" stroke="currentColor" strokeWidth={i % 2 === 0 ? 1.6 : 0.9} />
      ))}
    </svg>
  );
}

function IconeCartao({ className }: IconeProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <rect x="2.5" y="5.5" width="19" height="13" rx="1.8" stroke="currentColor" strokeWidth="1.6" />
      <path d="M2.5 9.5h19" stroke="currentColor" strokeWidth="1.6" />
      <rect x="5" y="13" width="5" height="2" rx="0.5" fill="currentColor" />
    </svg>
  );
}
