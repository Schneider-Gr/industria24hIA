"use client";

import { createContext, useContext, useState } from "react";

// Estado compartilhado entre a tabela "Promoção progressiva" (informativa,
// server-rendered originalmente) e o BotaoAddCarrinho (sticky mobile +
// desktop): clicar numa linha da tabela precisa setar a mesma quantidade
// que os chips do BotaoAddCarrinho já setam, senão o clique não reflete em
// lugar nenhum — bug relatado pelo usuário (a tabela nunca teve onClick).
//
// Opcional por design: BotaoAddCarrinho é usado também no carrinho fora da
// PDP, sem este Provider por perto — o hook retorna null nesse caso e o
// componente cai de volta no estado local que já tinha antes.
type Ctx = { quantidade: number | null; selecionar: (qtd: number) => void };

const SelecaoFaixaContext = createContext<Ctx | null>(null);

export function SelecaoFaixaProvider({ children }: { children: React.ReactNode }) {
  const [quantidade, setQuantidade] = useState<number | null>(null);
  return (
    <SelecaoFaixaContext.Provider value={{ quantidade, selecionar: setQuantidade }}>
      {children}
    </SelecaoFaixaContext.Provider>
  );
}

export function useSelecaoFaixa() {
  return useContext(SelecaoFaixaContext);
}
