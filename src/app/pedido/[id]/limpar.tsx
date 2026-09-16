"use client";

import { useEffect } from "react";
import { useCarrinho } from "@/components/carrinho/carrinho";

// Montada só quando o pedido acabou de ser criado (?novo=1): esvazia o
// carrinho local. Vive aqui (e não no action) porque localStorage é do client.
// Com `lojas`, tira só as lojas que viraram pedido — fechamento parcial deixa
// no carrinho a loja retida por trava de compra mínima.
export function LimparCarrinhoAoMontar({ lojas }: { lojas?: string[] }) {
  const { limpar, removerLojas } = useCarrinho();
  useEffect(() => {
    if (lojas && lojas.length > 0) removerLojas(lojas);
    else limpar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
