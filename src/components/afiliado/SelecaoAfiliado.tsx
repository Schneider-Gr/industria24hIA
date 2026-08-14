"use client";

import { createContext, useContext, useEffect, useState } from "react";
import Link from "next/link";

// Seleção de produtos para afiliação, client-side em localStorage — mesmo
// padrão do carrinho (src/components/carrinho/carrinho.tsx): anônima, sem
// tabela no banco, sobrevive à navegação e ao login (openspec
// afiliado-selecao-vitrine, requirement "Persistência da seleção anônima").

export type ItemSelecaoAfiliado = {
  produto_id: string;
  nome: string;
  loja_id: string;
};

type Ctx = {
  itens: ItemSelecaoAfiliado[];
  selecionado: (produtoId: string) => boolean;
  alternar: (item: ItemSelecaoAfiliado) => void;
  limpar: () => void;
};

const SelecaoAfiliadoContext = createContext<Ctx | null>(null);
const KEY = "industria24h.selecao_afiliado.v1";

export function SelecaoAfiliadoProvider({ children }: { children: React.ReactNode }) {
  const [itens, setItens] = useState<ItemSelecaoAfiliado[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setItens(JSON.parse(raw));
    } catch {
      // storage corrompido: começa vazio
    }
  }, []);

  const persistir = (novo: ItemSelecaoAfiliado[]) => {
    setItens(novo);
    localStorage.setItem(KEY, JSON.stringify(novo));
  };

  const selecionado = (produtoId: string) => itens.some((i) => i.produto_id === produtoId);

  const alternar = (item: ItemSelecaoAfiliado) => {
    persistir(
      selecionado(item.produto_id)
        ? itens.filter((i) => i.produto_id !== item.produto_id)
        : [...itens, item],
    );
  };

  const limpar = () => persistir([]);

  return (
    <SelecaoAfiliadoContext.Provider value={{ itens, selecionado, alternar, limpar }}>
      {children}
    </SelecaoAfiliadoContext.Provider>
  );
}

export function useSelecaoAfiliado(): Ctx {
  const ctx = useContext(SelecaoAfiliadoContext);
  if (!ctx) throw new Error("useSelecaoAfiliado fora do SelecaoAfiliadoProvider");
  return ctx;
}

/** Checkbox de seleção no card do produto (só quando permite_afiliacao). */
export function CheckboxAfiliar({
  produto,
}: {
  produto: { id: string; nome: string; loja_id?: string | null };
}) {
  const { selecionado, alternar } = useSelecaoAfiliado();
  if (!produto.loja_id) return null;
  const marcado = selecionado(produto.id);
  return (
    <label
      onClick={(e) => e.stopPropagation()}
      className="pointer-events-auto relative z-10 inline-flex items-center gap-1.5 text-[11px] font-medium text-ink-2"
      title="Selecionar para afiliação"
    >
      <input
        type="checkbox"
        checked={marcado}
        onChange={() =>
          alternar({ produto_id: produto.id, nome: produto.nome, loja_id: produto.loja_id! })
        }
        className="h-3.5 w-3.5"
      />
      Afiliar-se
    </label>
  );
}

/** Contador no menu de conta do header — sem ícone novo (pedido do change). */
export function ContadorSelecaoAfiliado() {
  const { itens } = useSelecaoAfiliado();
  if (itens.length === 0) return null;
  return (
    <Link
      href="/afiliado/lote"
      className="inline-flex items-center gap-1 rounded-sm border border-white/40 px-2.5 py-1.5 text-[12px] font-semibold text-white hover:bg-white/10"
      title="Produtos selecionados para afiliação"
    >
      Afiliar
      <span className="num rounded bg-lm-azul px-1.5 text-xs font-bold text-white">
        {itens.length}
      </span>
    </Link>
  );
}
