"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { precoFaixa, faixaVencida, type Faixa } from "@/lib/preco-faixa";
import { formatBRL } from "@/components/seller/format";
import { createClient } from "@/lib/supabase/client";

// Carrinho client-side em localStorage. Suporta múltiplas lojas ao mesmo
// tempo (redesign 2026-07-29) — cada loja vira um pedido próprio no
// checkout (ver checkout/actions.ts), então não há mais trava aqui.

export type ItemCarrinho = {
  produto_id: string;
  nome: string;
  valor: number;
  quantidade: number;
  quantidade_minima: number | null;
  loja_id: string;
  loja_nome: string;
  img: string | null;
  // Reserva do Mercado Futuro (venda futura): item vinculado a uma entrada
  // com preço/estoque próprios em vez do estoque corrente do produto.
  venda_futura_id?: string | null;
  disponivel_em?: string | null;
};

type Ctx = {
  itens: ItemCarrinho[];
  adicionar: (item: ItemCarrinho) => void;
  setQuantidade: (produto_id: string, q: number, venda_futura_id?: string | null) => void;
  remover: (produto_id: string, venda_futura_id?: string | null) => void;
  limpar: () => void;
  // Aceite dos Termos do Mercado Futuro, coletado no carrinho ANTES do login
  // B2B. O checkout lê isto para carimbar o pedido sem pedir de novo.
  aceiteTermosMf: boolean;
  setAceiteTermosMf: (v: boolean) => void;
};

const CarrinhoContext = createContext<Ctx | null>(null);
const KEY = "industria24h.carrinho.v1";
const KEY_ACEITE_MF = "industria24h.aceite_mf.v1";

export function CarrinhoProvider({ children }: { children: React.ReactNode }) {
  const [itens, setItens] = useState<ItemCarrinho[]>([]);
  const [aceiteTermosMf, setAceiteMf] = useState(false);
  // Espelho server-side (carrinhos_abandonados) só faz sentido logado — só
  // guardamos se há sessão, sem forçar login pra usar o carrinho.
  const logado = useRef(false);
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      // Hidratação de localStorage: só existe no client, não dá pra ler no
      // useState inicial sem quebrar o SSR/hidratação.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setItens(JSON.parse(raw));
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (localStorage.getItem(KEY_ACEITE_MF) === "1") setAceiteMf(true);
    } catch {
      // storage corrompido: começa vazio
    }
    createClient()
      .auth.getUser()
      .then(({ data }) => {
        logado.current = !!data.user;
      });
  }, []);

  // Debounced: evita um POST por tecla/clique de quantidade. Best-effort —
  // falha de rede aqui não pode quebrar a experiência de compra.
  const sincronizar = (novo: ItemCarrinho[]) => {
    if (!logado.current) return;
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => {
      fetch("/api/carrinho/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itens: novo }),
      }).catch(() => {});
    }, 1500);
  };

  const persistir = (novo: ItemCarrinho[]) => {
    setItens(novo);
    localStorage.setItem(KEY, JSON.stringify(novo));
    sincronizar(novo);
  };

  const setAceiteTermosMf = (v: boolean) => {
    setAceiteMf(v);
    localStorage.setItem(KEY_ACEITE_MF, v ? "1" : "0");
  };

  // Chave do item: produto_id sozinho para item normal; +venda_futura_id
  // para reserva, já que o mesmo produto pode ter reservas em datas distintas.
  const chave = (i: Pick<ItemCarrinho, "produto_id" | "venda_futura_id">) =>
    `${i.produto_id}:${i.venda_futura_id ?? ""}`;

  const adicionar = (item: ItemCarrinho) => {
    const existente = itens.find((i) => chave(i) === chave(item));
    persistir(
      existente
        ? itens.map((i) =>
            chave(i) === chave(item) ? { ...i, quantidade: i.quantidade + item.quantidade } : i,
          )
        : [...itens, item],
    );
  };

  const setQuantidade = (produto_id: string, q: number, venda_futura_id?: string | null) =>
    persistir(
      itens.map((i) =>
        chave(i) === chave({ produto_id, venda_futura_id })
          ? { ...i, quantidade: Math.max(1, q) }
          : i,
      ),
    );

  const remover = (produto_id: string, venda_futura_id?: string | null) =>
    persistir(itens.filter((i) => chave(i) !== chave({ produto_id, venda_futura_id })));

  const limpar = () => {
    persistir([]);
    setAceiteTermosMf(false);
  };

  return (
    <CarrinhoContext.Provider
      value={{ itens, adicionar, setQuantidade, remover, limpar, aceiteTermosMf, setAceiteTermosMf }}
    >
      {children}
    </CarrinhoContext.Provider>
  );
}

export function useCarrinho(): Ctx {
  const ctx = useContext(CarrinhoContext);
  if (!ctx) throw new Error("useCarrinho fora do CarrinhoProvider");
  return ctx;
}

// Ícone/contador para o header da vitrine.
export function CarrinhoBadge() {
  const { itens } = useCarrinho();
  const total = itens.reduce((s, i) => s + i.quantidade, 0);
  return (
    <Link
      href="/carrinho"
      className="relative inline-flex items-center rounded border border-white/40 px-3 py-1.5 text-[13px] tracking-[0.04em] text-white hover:bg-white/10"
    >
      Carrinho
      {total > 0 && (
        <span className="num ml-2 rounded bg-lm-azul px-1.5 text-xs font-bold text-white">
          {total}
        </span>
      )}
    </Link>
  );
}

// Botão "Adicionar ao carrinho" da página do produto.
// `compacto`: variante para a barra fixa mobile — uma linha, sem rótulos longos.
export function BotaoAddCarrinho({
  produto,
  compacto = false,
  estoqueMaximo,
  faixas = [],
}: {
  produto: Omit<ItemCarrinho, "quantidade">;
  compacto?: boolean;
  /** Estoque disponível — sem isso, o stepper deixaria pedir mais do que a loja tem. */
  estoqueMaximo?: number | null;
  /** Faixas do desconto progressivo. Renderiza a seleção clicável (como no Bubble). */
  faixas?: Faixa[];
}) {
  const { adicionar } = useCarrinho();
  const minimo = produto.quantidade_minima ?? 1;
  const maximo = estoqueMaximo != null ? Math.max(minimo, estoqueMaximo) : null;
  const [qtd, setQtd] = useState(minimo);
  const [ok, setOk] = useState(false);

  const clamp = (v: number) => Math.max(minimo, maximo != null ? Math.min(v, maximo) : v);

  const item = { ...produto, quantidade: qtd };
  const semEstoque = maximo != null && maximo < minimo;

  // Ordem decrescente, como no Bubble: o maior desconto aparece primeiro.
  const faixasOrdenadas = faixas.slice().sort((a, b) => b.min_qtd - a.min_qtd);
  const unitario = precoFaixa(faixas, true, qtd, produto.valor);
  const faixaAtiva = faixasOrdenadas.find(
    (f) => f.min_qtd <= qtd && !faixaVencida(f)
  );
  const mostrarFaixas = !compacto && faixasOrdenadas.length > 0;
  // Na barra fixa mobile (compacto) as faixas viravam só uma tabela estática
  // em page.tsx, sem forma de clicar — chips horizontais aqui dão a mesma
  // seleção por clique que já existe no desktop, sem tomar o espaço da barra.
  const mostrarChipsFaixas = compacto && faixasOrdenadas.length > 0;

  return (
    <div className="flex flex-col gap-2">
      {mostrarChipsFaixas && (
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {faixasOrdenadas.map((faixa) => {
            const vencida = faixaVencida(faixa);
            const semEstoqueFaixa = maximo != null && faixa.min_qtd > maximo;
            const indisponivel = vencida || semEstoqueFaixa;
            const ativa = faixaAtiva?.min_qtd === faixa.min_qtd;
            return (
              <button
                key={faixa.min_qtd}
                type="button"
                disabled={indisponivel}
                aria-pressed={ativa}
                onClick={() => setQtd(clamp(faixa.min_qtd))}
                className={`shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors ${
                  indisponivel
                    ? "cursor-not-allowed border-dashed border-line text-muted"
                    : ativa
                      ? "border-lm-azul bg-lm-azul text-white"
                      : "border-line text-ink-2"
                }`}
              >
                {faixa.min_qtd}+ un · {formatBRL(faixa.valor_unitario)}
              </button>
            );
          })}
        </div>
      )}
      {mostrarFaixas && (
        <div className="mb-1 flex flex-col gap-2">
          <p className="rounded-sm border border-lm-amarelo/40 bg-lm-amarelo/10 px-3 py-2 text-[13px] font-semibold text-lm-marinho">
            Aproveite nossos descontos progressivos clicando abaixo!
          </p>
          {faixasOrdenadas.map((faixa) => {
            const vencida = faixaVencida(faixa);
            // No Bubble a faixa acima do estoque continua listada, só bloqueada.
            const semEstoqueFaixa = maximo != null && faixa.min_qtd > maximo;
            const indisponivel = vencida || semEstoqueFaixa;
            const ativa = faixaAtiva?.min_qtd === faixa.min_qtd;
            return (
              <button
                key={faixa.min_qtd}
                type="button"
                disabled={indisponivel}
                aria-pressed={ativa}
                onClick={() => setQtd(clamp(faixa.min_qtd))}
                className={`flex items-center justify-between gap-3 rounded-sm border px-3 py-2 text-left text-sm transition-colors ${
                  indisponivel
                    ? "cursor-not-allowed border-dashed border-line text-muted"
                    : ativa
                      ? "border-lm-azul bg-lm-azul/10 text-ink"
                      : "border-dashed border-line text-ink hover:border-lm-azul"
                }`}
              >
                <span>
                  A partir de <span className="num font-semibold">{faixa.min_qtd}</span> un
                  <br />
                  <span className="text-[13px] text-ink-2">
                    Cada produto fica: <span className="num">{formatBRL(faixa.valor_unitario)}</span>
                  </span>
                </span>
                {vencida ? (
                  <span className="shrink-0 text-[13px] text-muted">promoção vencida</span>
                ) : semEstoqueFaixa ? (
                  <span className="shrink-0 text-[13px] font-medium text-lm-vermelho">
                    Estoque insuficiente!
                  </span>
                ) : ativa ? (
                  <span className="shrink-0 text-[13px] font-semibold text-lm-azul">aplicada</span>
                ) : null}
              </button>
            );
          })}
        </div>
      )}
      {/* Stepper e botão de comprar em colunas na mesma linha (fora do modo
          compacto) — antes ficavam empilhados em 2 linhas; "você pagará"
          continua abaixo, span das duas colunas, só quando há desconto. */}
      <div className={compacto ? "flex items-center gap-2" : "grid grid-cols-[auto_1fr] gap-2.5"}>
        {/* Stepper com alvos de toque de 36px — número puro é difícil de ajustar no celular */}
        <div className={`flex items-center rounded border border-line bg-surface ${compacto ? "" : "w-fit"}`}>
          <button
            type="button"
            onClick={() => setQtd((q) => clamp(q - 1))}
            disabled={qtd <= minimo}
            aria-label="Diminuir quantidade"
            className="flex h-9 w-9 shrink-0 items-center justify-center text-lg font-semibold text-ink-2 disabled:opacity-30"
          >
            −
          </button>
          <input
            type="number"
            min={minimo}
            max={maximo ?? undefined}
            value={qtd}
            onChange={(e) => setQtd(clamp(Number(e.target.value) || minimo))}
            className="num h-9 w-14 border-x border-line bg-transparent text-center text-[13px] outline-none"
            aria-label="Quantidade"
          />
          <button
            type="button"
            onClick={() => setQtd((q) => clamp(q + 1))}
            disabled={maximo != null && qtd >= maximo}
            aria-label="Aumentar quantidade"
            className="flex h-9 w-9 shrink-0 items-center justify-center text-lg font-semibold text-ink-2 disabled:opacity-30"
          >
            +
          </button>
        </div>
        <button
          type="button"
          disabled={semEstoque}
          onClick={() => {
            adicionar(item);
            setOk(true);
          }}
          className={`flex flex-1 items-center justify-center gap-2 rounded bg-lm-azul font-semibold text-white hover:bg-lm-azul-escuro disabled:cursor-not-allowed disabled:bg-line disabled:text-muted ${compacto ? "h-10 px-4 text-sm" : "h-9 px-5 text-sm"}`}
        >
          {!semEstoque && !ok && (
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <circle cx="9" cy="21" r="1.4" fill="currentColor" stroke="none" />
              <circle cx="19" cy="21" r="1.4" fill="currentColor" stroke="none" />
              <path d="M1.5 2h3l2.2 12.4a2 2 0 0 0 2 1.6h8.7a2 2 0 0 0 2-1.6L21 6H5.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
          {semEstoque
            ? "Sem estoque"
            : compacto
              ? ok
                ? "Adicionado ✓"
                : "Adicionar"
              : "Adicionar ao carrinho"}
        </button>
        {mostrarFaixas && !compacto && (
          <p className="col-span-2 text-sm text-ink-2">
            Você pagará:{" "}
            <span className="num font-semibold text-ink">{formatBRL(unitario * qtd)}</span>
            {faixaAtiva && (
              <span className="ml-1 text-[13px] text-lm-azul">
                (<span className="num">{formatBRL(unitario)}</span>/un — desconto de{" "}
                <span className="num">{faixaAtiva.min_qtd}</span> un aplicado)
              </span>
            )}
          </p>
        )}
      </div>

      {/* No modo compacto (barra fixa mobile) omitimos esses avisos de rotina — o
          badge do carrinho no header já confirma, e o espaço extra empurraria
          a barra pra cima cobrindo mais conteúdo da página. O alerta de
          conflito abaixo continua aparecendo sempre: exige uma decisão. */}
      {!compacto && maximo != null && !semEstoque && (
        <p className="text-[11px] text-muted">
          <span className="num">{maximo}</span> un disponíveis
        </p>
      )}

      {ok && (
        <div
          role="status"
          className={`rounded-sm bg-ok/10 px-3 py-2 text-[13px] text-ok ${
            compacto ? "flex flex-col gap-2" : "flex flex-wrap items-center gap-2"
          }`}
        >
          <span className="font-medium">Adicionado ao carrinho.</span>
          <span className={`flex gap-2 ${compacto ? "" : "ml-auto"}`}>
            <button
              type="button"
              onClick={() => setOk(false)}
              className="flex-1 rounded-sm border border-ok/40 px-2.5 py-1.5 text-center font-medium text-ok"
            >
              Continuar comprando
            </button>
            <Link
              href="/carrinho"
              className="flex-1 rounded-sm bg-ok px-2.5 py-1.5 text-center font-medium text-white"
            >
              Ir para o carrinho
            </Link>
          </span>
        </div>
      )}

    </div>
  );
}
