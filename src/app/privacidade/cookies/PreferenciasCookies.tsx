"use client";

import { useState } from "react";
import { apagarHistoricoBusca, gravarConsentimento, useConsentimento } from "@/components/CookieAviso";
import type { Consentimento } from "@/lib/catalogo-compra/vitrine-personalizacao";

export function PreferenciasCookies() {
  const atual = useConsentimento();
  const [aviso, setAviso] = useState("");

  const escolher = (valor: Consentimento) => {
    gravarConsentimento(valor);
    setAviso(valor === "todos" ? "Personalização ligada." : "Personalização desligada e histórico apagado.");
  };

  return (
    <div className="rounded-lg border border-line bg-surface p-5">
      <p className="text-sm text-ink">
        Sua escolha atual:{" "}
        <strong>
          {atual === "todos" ? "todos os cookies" : atual === "essenciais" ? "só essenciais" : "ainda não escolhida"}
        </strong>
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => escolher("todos")}
          className="rounded-md bg-lm-azul px-4 py-2 text-[13px] font-semibold text-white hover:bg-lm-azul-escuro"
        >
          Aceitar todos
        </button>
        <button
          type="button"
          onClick={() => escolher("essenciais")}
          className="rounded-md border border-line px-4 py-2 text-[13px] font-semibold text-ink hover:border-lm-azul"
        >
          Só essenciais
        </button>
        <button
          type="button"
          onClick={() => {
            apagarHistoricoBusca();
            setAviso("Histórico de buscas apagado.");
          }}
          className="rounded-md border border-line px-4 py-2 text-[13px] font-semibold text-lm-vermelho hover:border-lm-vermelho"
        >
          Apagar meu histórico de buscas
        </button>
      </div>
      <p role="status" className="mt-3 min-h-5 text-[13px] text-ink-2">
        {aviso}
      </p>
    </div>
  );
}
