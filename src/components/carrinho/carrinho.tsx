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
};

type Ctx = {
  itens: ItemCarrinho[];
  adicionar: (item: ItemCarrinho) => boolean; // false = recusado (outra loja)
  trocarLoja: (item: ItemCarrinho) => void;
  setQuantidade: (produto_id: string, q: number) => void;
  remover: (produto_id: string) => void;
  limpar: () => void;
};

const CarrinhoContext = createContext<Ctx | null>(null);
const KEY = "industria24h.carrinho.v1";

export function CarrinhoProvider({ children }: { children: React.ReactNode }) {
  const [itens, setItens] = useState<ItemCarrinho[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setItens(JSON.parse(raw));
    } catch {
      // storage corrompido: começa vazio
    }
  }, []);

  const persistir = (novo: ItemCarrinho[]) => {
    setItens(novo);
    localStorage.setItem(KEY, JSON.stringify(novo));
  };

  const adicionar = (item: ItemCarrinho) => {
    if (itens.length > 0 && itens[0].loja_id !== item.loja_id) return false;
    const existente = itens.find((i) => i.produto_id === item.produto_id);
    persistir(
      existente
        ? itens.map((i) =>
            i.produto_id === item.produto_id
              ? { ...i, quantidade: i.quantidade + item.quantidade }
              : i,
          )
        : [...itens, item],
    );
    return true;
  };

  const trocarLoja = (item: ItemCarrinho) => persistir([item]);

  const setQuantidade = (produto_id: string, q: number) =>
    persistir(
      itens.map((i) => (i.produto_id === produto_id ? { ...i, quantidade: Math.max(1, q) } : i)),
    );

  const remover = (produto_id: string) =>
    persistir(itens.filter((i) => i.produto_id !== produto_id));

  const limpar = () => persistir([]);

  return (
    <CarrinhoContext.Provider
      value={{ itens, adicionar, trocarLoja, setQuantidade, remover, limpar }}
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
      className="relative inline-flex items-center rounded border border-white/40 px-3 py-1.5 text-sm font-semibold text-white hover:bg-white/10"
    >
      Carrinho
      {total > 0 && (
        <span className="num ml-2 rounded bg-amarelo px-1.5 text-xs font-bold text-[#121212]">
          {total}
        </span>
      )}
    </Link>
  );
}

// Botão "Adicionar ao carrinho" da página do produto.
export function BotaoAddCarrinho({
  produto,
}: {
  produto: Omit<ItemCarrinho, "quantidade">;
}) {
  const { adicionar, trocarLoja } = useCarrinho();
  const [qtd, setQtd] = useState(produto.quantidade_minima ?? 1);
  const [conflito, setConflito] = useState(false);
  const [ok, setOk] = useState(false);

  const item = { ...produto, quantidade: qtd };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={produto.quantidade_minima ?? 1}
          value={qtd}
          onChange={(e) => setQtd(Math.max(1, Number(e.target.value)))}
          className="num w-24 rounded border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-roxo-800"
          aria-label="Quantidade"
        />
        <button
          type="button"
          onClick={() => {
            setOk(false);
            if (adicionar(item)) setOk(true);
            else setConflito(true);
          }}
          className="rounded bg-roxo-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-roxo-900"
        >
          Adicionar ao carrinho
        </button>
      </div>

      {ok && (
        <p role="status" className="text-sm text-ok">
          Adicionado.{" "}
          <Link href="/carrinho" className="underline underline-offset-2">
            Ver carrinho
          </Link>
        </p>
      )}

      {conflito && (
        <div role="alert" className="rounded border border-warn bg-warn/10 p-3 text-sm">
          Seu carrinho tem itens de outra loja (cada pedido atende uma loja).
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => {
                trocarLoja(item);
                setConflito(false);
                setOk(true);
              }}
              className="rounded bg-laranja px-3 py-1 text-xs font-semibold text-white hover:bg-laranja-escuro"
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
