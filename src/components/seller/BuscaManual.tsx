"use client";

import Link from "next/link";
import { useState } from "react";
import { MANUAL_SELLER } from "@/components/seller/manual-seller";
import { buscarNoManual } from "@/lib/seller/busca-manual";
import { abrirAtendimento } from "@/components/bot/abrirAtendimento";

// Busca por palavra-chave da Central de Dúvidas, com saída para o bot quando o
// manual não cobre a pergunta. O bot já existe e já conhece as regras da
// plataforma (`lib/ai/systemPrompt.ts`), então aqui só entregamos a pergunta
// para ele com a persona certa, em vez de ensinar o seller a reformular.

export function BuscaManual() {
  const [consulta, setConsulta] = useState("");
  const resultados = buscarNoManual(MANUAL_SELLER, consulta);
  const buscou = consulta.trim().length >= 3;

  function perguntarAoBot() {
    abrirAtendimento({ persona: "seller", mensagem: consulta.trim() });
  }

  return (
    <div className="mb-8">
      <label htmlFor="busca-manual" className="mb-1.5 block text-sm font-medium text-ink">
        Buscar por palavra-chave
      </label>
      <div className="flex gap-2">
        <input
          id="busca-manual"
          type="search"
          value={consulta}
          onChange={(e) => setConsulta(e.target.value)}
          placeholder="repasse, PIX, frete, afiliado…"
          className="w-full rounded-lg border border-line px-3 py-2.5 text-sm text-ink outline-none focus:border-lm-azul"
        />
        {buscou && (
          <button
            type="button"
            onClick={() => setConsulta("")}
            className="shrink-0 rounded-lg border border-line px-3 text-sm text-ink-2 hover:border-lm-azul hover:text-lm-azul"
          >
            Limpar
          </button>
        )}
      </div>

      {buscou && resultados.length > 0 && (
        <ul className="mt-4 divide-y divide-line rounded-lg border border-line">
          {resultados.map(({ topico, trecho }) => (
            <li key={topico.id}>
              <Link
                href={`/seller/central-de-duvidas/${topico.id}`}
                className="block px-4 py-3 hover:bg-lm-cinza"
              >
                <span className="text-sm font-medium text-ink">
                  <span className="mr-2 tabular-nums text-muted">{topico.numero}</span>
                  {topico.titulo}
                </span>
                <span className="mt-0.5 block text-xs leading-relaxed text-muted">{trecho}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {buscou && (
        <div className="mt-4 rounded-lg bg-lm-marinho p-4 text-white">
          <p className="text-sm leading-relaxed">
            {resultados.length > 0
              ? "Não era isso que você procurava?"
              : `O manual não tem nada sobre “${consulta.trim()}”.`}{" "}
            Pergunte ao assistente: ele conhece as regras da plataforma e responde na hora.
          </p>
          <button
            type="button"
            onClick={perguntarAoBot}
            className="mt-3 rounded-lg bg-lm-amarelo px-4 py-2 text-sm font-semibold text-lm-marinho hover:brightness-95"
          >
            Perguntar ao assistente
          </button>
        </div>
      )}
    </div>
  );
}
