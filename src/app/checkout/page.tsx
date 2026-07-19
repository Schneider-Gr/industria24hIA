"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { VitrineHeader, VitrineFooter } from "@/components/vitrine/ui";
import { useCarrinho } from "@/components/carrinho/carrinho";
import { formatBRL } from "@/components/seller/format";
import { createClient } from "@/lib/supabase/client";
import { finalizarCompra, type CheckoutState } from "./actions";

const inputCls =
  "mt-1 w-full rounded border border-line bg-white px-3 py-2 text-sm outline-none focus:border-aco-600";

// O frete exibido aqui é estimativa client-side (10%); o valor OFICIAL é
// recalculado no banco pela RPC — nunca confiamos no client.
const PERCENTUAL_FRETE_ESTIMADO = 10;

export default function CheckoutPage() {
  const { itens } = useCarrinho();
  const [logado, setLogado] = useState<boolean | null>(null);
  const [tipo, setTipo] = useState<"retirada" | "entrega">("retirada");
  const [state, action, pending] = useActionState<CheckoutState, FormData>(
    finalizarCompra,
    { ok: false },
  );

  useEffect(() => {
    createClient()
      .auth.getUser()
      .then(({ data }) => setLogado(!!data.user));
  }, []);

  const totalItens = itens.reduce((s, i) => s + i.valor * i.quantidade, 0);
  const freteEstimado =
    tipo === "entrega" ? (totalItens * PERCENTUAL_FRETE_ESTIMADO) / 100 : 0;
  const temVendaFutura = itens.some((i) => i.venda_futura_id);

  if (itens.length === 0) {
    return (
      <Shell>
        <div className="rounded border border-dashed border-line bg-white p-10 text-center text-sm text-muted">
          Carrinho vazio.{" "}
          <Link href="/" className="text-aco-600 underline underline-offset-2">
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
            className="mt-3 inline-flex rounded bg-sinal px-5 py-2 text-sm font-semibold text-white hover:bg-sinal-escuro"
          >
            Fazer login
          </Link>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <form action={action} className="grid grid-cols-1 gap-8 md:grid-cols-[1fr_320px]">
        <input
          type="hidden"
          name="itens"
          value={JSON.stringify(
            itens.map((i) => ({
              produto_id: i.produto_id,
              quantidade: i.quantidade,
              venda_futura_id: i.venda_futura_id ?? null,
            })),
          )}
        />

        <div className="space-y-6">
          <section>
            <h2 className="font-display text-lg font-semibold text-ink">Entrega</h2>
            <div className="mt-2 flex gap-2">
              <label
                className={`flex-1 cursor-pointer rounded border p-3 text-sm ${tipo === "retirada" ? "border-aco-600 bg-aco-100/40" : "border-line bg-white"}`}
              >
                <input
                  type="radio"
                  name="tipo_entrega"
                  value="retirada"
                  checked={tipo === "retirada"}
                  onChange={() => setTipo("retirada")}
                  className="mr-2"
                />
                Retirada na loja <span className="text-muted">(sem frete)</span>
              </label>
              <label
                className={`flex-1 cursor-pointer rounded border p-3 text-sm ${tipo === "entrega" ? "border-aco-600 bg-aco-100/40" : "border-line bg-white"}`}
              >
                <input
                  type="radio"
                  name="tipo_entrega"
                  value="entrega"
                  checked={tipo === "entrega"}
                  onChange={() => setTipo("entrega")}
                  className="mr-2"
                />
                Entrega <span className="text-muted">(~{PERCENTUAL_FRETE_ESTIMADO}% do valor)</span>
              </label>
            </div>

            {tipo === "entrega" && (
              <div className="mt-3 grid grid-cols-2 gap-3">
                <label className="col-span-1 block text-sm">
                  <span className="text-ink-2">CEP *</span>
                  <input name="cep" required placeholder="69000-000" className={inputCls} />
                </label>
                <label className="col-span-1 block text-sm">
                  <span className="text-ink-2">Cidade *</span>
                  <input name="cidade" required className={inputCls} />
                </label>
                <label className="col-span-2 block text-sm">
                  <span className="text-ink-2">Rua *</span>
                  <input name="rua" required className={inputCls} />
                </label>
                <label className="block text-sm">
                  <span className="text-ink-2">Número *</span>
                  <input name="numero" required className={inputCls} />
                </label>
                <label className="block text-sm">
                  <span className="text-ink-2">Bairro *</span>
                  <input name="bairro" required className={inputCls} />
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
              {(["PIX", "BOLETO", "CREDIT_CARD"] as const).map((f) => (
                <label
                  key={f}
                  className="flex-1 cursor-pointer rounded border border-line bg-white p-3 text-center text-sm has-checked:border-aco-600 has-checked:bg-aco-100/40"
                >
                  <input
                    type="radio"
                    name="forma_pagamento"
                    value={f}
                    defaultChecked={f === "PIX"}
                    className="mr-2"
                  />
                  {f === "CREDIT_CARD" ? "Cartão" : f === "BOLETO" ? "Boleto" : "PIX"}
                </label>
              ))}
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
            </div>
          </section>

          {temVendaFutura && (
            <section className="rounded border border-aco-600/30 bg-aco-100/20 p-4">
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
              </div>
            </section>
          )}

          {state.error && (
            <p role="alert" className="rounded border border-erro bg-erro/10 p-3 text-sm text-erro">
              {state.error}
            </p>
          )}
        </div>

        <aside className="h-fit rounded border border-line bg-white p-4">
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
          <button
            type="submit"
            disabled={pending}
            className="mt-4 w-full rounded bg-sinal px-5 py-3 text-base font-semibold text-white hover:bg-sinal-escuro disabled:opacity-50"
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
