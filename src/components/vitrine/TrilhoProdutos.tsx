"use client";

import { ProdutoCard, ProdutoDescontoCard, GroceryCard } from "@/components/vitrine/ui";
import { GaleriaCarrossel } from "@/components/vitrine/BannerGalerias";

type ItemProduto = {
  produto: React.ComponentProps<typeof ProdutoCard>["produto"];
  lojaCidade?: string | null;
  lojaEstado?: string | null;
  lojaNome?: string | null;
  temVendaFutura?: boolean;
  temCompraColetiva?: boolean;
};

type ItemDesconto = {
  produto: React.ComponentProps<typeof ProdutoDescontoCard>["produto"];
  lojaCidade?: string | null;
  lojaEstado?: string | null;
};

type ItemGrocery = { produto: React.ComponentProps<typeof GroceryCard>["produto"] };

type Props =
  | ({ variante: "produto"; itens: ItemProduto[] } & Comuns)
  | ({ variante: "desconto"; itens: ItemDesconto[] } & Comuns)
  | ({ variante: "grocery"; itens: ItemGrocery[] } & Comuns);

type Comuns = {
  /** Vazio deixa o título com o chamador (TituloSecao das seções da home). */
  titulo?: string;
  className?: string;
  trilhoClassName?: string;
};

const ITEM_CLASS =
  "w-[45%] shrink-0 snap-start sm:w-[30%] md:w-[22%] lg:w-[calc((100%-5*0.75rem)/6)]";

/**
 * Fileira de produtos com rolagem lateral — formato da vitrine antiga: uma
 * linha só, em vez de grid que quebra em várias linhas. Client component
 * porque `GaleriaCarrossel` recebe `renderItem`/`keyFn`, e funções não
 * atravessam a fronteira server → client.
 */
export function TrilhoProdutos(props: Props) {
  const { titulo = "", className, trilhoClassName } = props;
  const comuns = {
    titulo,
    itemClassName: ITEM_CLASS,
    ...(className ? { className } : {}),
    ...(trilhoClassName ? { trilhoClassName } : {}),
  };

  if (props.variante === "desconto") {
    return (
      <GaleriaCarrossel
        {...comuns}
        itens={props.itens}
        keyFn={(item) => item.produto.id}
        renderItem={(item) => (
          <ProdutoDescontoCard
            produto={item.produto}
            lojaCidade={item.lojaCidade ?? undefined}
            lojaEstado={item.lojaEstado ?? undefined}
          />
        )}
      />
    );
  }

  if (props.variante === "grocery") {
    return (
      <GaleriaCarrossel
        {...comuns}
        itens={props.itens}
        keyFn={(item) => item.produto.id}
        renderItem={(item) => <GroceryCard produto={item.produto} />}
      />
    );
  }

  return (
    <GaleriaCarrossel
      {...comuns}
      itens={props.itens}
      keyFn={(item) => item.produto.id}
      renderItem={(item) => (
        <ProdutoCard
          produto={item.produto}
          lojaCidade={item.lojaCidade ?? undefined}
          lojaEstado={item.lojaEstado ?? undefined}
          lojaNome={item.lojaNome ?? undefined}
          temVendaFutura={item.temVendaFutura}
          temCompraColetiva={item.temCompraColetiva}
        />
      )}
    />
  );
}
