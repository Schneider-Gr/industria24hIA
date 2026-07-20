"use client";

import { createContext, useContext, useEffect, useState } from "react";
import Link from "next/link";

// Carrinho client-side em localStorage. Restrito a UMA loja por vez —
// produção do Bubble tem zero pedidos multi-vendedor; adicionar item de
// outra loja pergunta se quer trocar (e esvazia).

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
  adicionar: (item: ItemCarrinho) => boolean; // false = recusado (outra loja)
  trocarLoja: (item: ItemCarrinho) => void;
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
  }, []);

  const persistir = (novo: ItemCarrinho[]) => {
    setItens(novo);
    localStorage.setItem(KEY, JSON.stringify(novo));
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
    if (itens.length > 0 && itens[0].loja_id !== item.loja_id) return false;
    const existente = itens.find((i) => chave(i) === chave(item));
    persistir(
      existente
        ? itens.map((i) =>
            chave(i) === chave(item) ? { ...i, quantidade: i.quantidade + item.quantidade } : i,
          )
        : [...itens, item],
    );
    return true;
  };

  const trocarLoja = (item: ItemCarrinho) => persistir([item]);

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
      value={{ itens, adicionar, trocarLoja, setQuantidade, remover, limpar, aceiteTermosMf, setAceiteTermosMf }}
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
        <span className="num ml-2 rounded bg-sinal px-1.5 text-xs font-bold text-white">
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
}: {
  produto: Omit<ItemCarrinho, "quantidade">;
  compacto?: boolean;
  /** Estoque disponível — sem isso, o stepper deixaria pedir mais do que a loja tem. */
  estoqueMaximo?: number | null;
}) {
  const { adicionar, trocarLoja } = useCarrinho();
  const minimo = produto.quantidade_minima ?? 1;
  const maximo = estoqueMaximo != null ? Math.max(minimo, estoqueMaximo) : null;
  const [qtd, setQtd] = useState(minimo);
  const [conflito, setConflito] = useState(false);
  const [ok, setOk] = useState(false);

  const clamp = (v: number) => Math.max(minimo, maximo != null ? Math.min(v, maximo) : v);

  const item = { ...produto, quantidade: qtd };
  const semEstoque = maximo != null && maximo < minimo;

  return (
    <div className="flex flex-col gap-2">
      {/* Fora do modo compacto o CTA é full-width (o stepper vai na linha de
          cima); na barra fixa mobile os dois dividem a mesma linha. */}
      <div className={compacto ? "flex items-center gap-2" : "flex flex-col gap-2"}>
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
            setOk(false);
            if (adicionar(item)) setOk(true);
            else setConflito(true);
          }}
          className={`flex-1 rounded bg-sinal font-semibold text-white hover:bg-sinal-escuro disabled:cursor-not-allowed disabled:bg-line disabled:text-muted ${compacto ? "h-10 px-4 text-sm" : "w-full px-5 py-3 text-sm"}`}
        >
          {semEstoque
            ? "Sem estoque"
            : compacto
              ? ok
                ? "Adicionado ✓"
                : "Adicionar"
              : "Adicionar ao carrinho"}
        </button>
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

      {!compacto && ok && (
        <p role="status" className="rounded-sm bg-green-100 px-3 py-2 text-sm text-green-800">
          Adicionado.{" "}
          <Link href="/carrinho" className="underline underline-offset-2">
            Ver carrinho
          </Link>
        </p>
      )}

      {conflito && (
        <div role="alert" className="rounded border border-yellow-800 bg-yellow-100 p-3 text-sm text-yellow-800">
          Seu carrinho tem itens de outra loja (cada pedido atende uma loja).
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => {
                trocarLoja(item);
                setConflito(false);
                setOk(true);
              }}
              className="rounded bg-sinal px-3 py-1 text-xs font-semibold text-white hover:bg-sinal-escuro"
            >
              Esvaziar e adicionar este
            </button>
            <button
              type="button"
              onClick={() => setConflito(false)}
              className="rounded border border-line px-3 py-1 text-xs font-semibold"
            >
              Manter carrinho
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
