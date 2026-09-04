"use client";

import { ProdutoDescontoCard } from "@/components/vitrine/ui";
import { GaleriaCarrossel } from "@/components/vitrine/BannerGalerias";

type ItemFileira = {
  produto: React.ComponentProps<typeof ProdutoDescontoCard>["produto"];
  lojaCidade?: string | null;
  lojaEstado?: string | null;
};

/**
 * Primeira fileira da home (ofertas relâmpago, sobreposta ao banner) no
 * formato da vitrine antiga: uma linha só, com rolagem lateral e setas.
 * Client component porque `GaleriaCarrossel` recebe `renderItem`/`keyFn` —
 * funções não atravessam a fronteira server → client.
 */
export function FileiraOfertas({ itens }: { itens: ItemFileira[] }) {
  return (
    <GaleriaCarrossel
      titulo=""
      itens={itens}
      keyFn={(item) => item.produto.id}
      className="group"
      trilhoClassName="[&>div>a]:shadow-[0_4px_16px_rgba(15,26,36,.18)]"
      itemClassName="w-[45%] shrink-0 snap-start sm:w-[30%] md:w-[22%] lg:w-[calc((100%-5*0.75rem)/6)]"
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
