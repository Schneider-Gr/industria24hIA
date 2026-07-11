"use client";

import { useEffect } from "react";
import { useCarrinho } from "@/components/carrinho/carrinho";

// Montada só quando o pedido acabou de ser criado (?novo=1): esvazia o
// carrinho local. Vive aqui (e não no action) porque localStorage é do client.
export function LimparCarrinhoAoMontar() {
  const { limpar } = useCarrinho();
  useEffect(() => {
    limpar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
