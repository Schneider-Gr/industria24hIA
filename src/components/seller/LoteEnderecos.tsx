"use client";

import { useState } from "react";
import { criarEnderecosEmLote } from "@/app/(seller)/seller/centros/actions";
import { gerarPosicoes, MAX_POSICOES_POR_LOTE } from "@/lib/estoque/faixa-enderecos";

const inputCls =
  "w-full rounded border border-line bg-surface px-2 py-1 text-sm outline-none focus:border-lm-azul";

const CAMPOS = [
  ["ruas", "Ruas", "A-C"],
  ["predios", "Prédios", "1-10"],
  ["niveis", "Níveis", "1-4"],
  ["apartamentos", "Aptos", "1-3"],
] as const;

/**
 * Cadastro em lote das posições de um centro. Um galpão endereçado tem dezenas
 * ou centenas de posições, e cadastrar uma a uma é o motivo real de um CD ficar
 * com zero delas — e sem posição nada entra no CD do Indústria, porque o
 * endereço é obrigatório na entrada.
 *
 * A prévia usa a MESMA função de expansão que o servidor, então o número
 * confirmado é o número criado. O banco repete o teto por conta própria: a tela
 * é conveniência, não autoridade.
 */
export function LoteEnderecos({ centroId }: { centroId: string }) {
  const [faixas, setFaixas] = useState({
    ruas: "",
    predios: "",
    niveis: "",
    apartamentos: "",
  });

  const previa = gerarPosicoes(faixas);
  const vazio = Object.values(faixas).every((v) => v.trim() === "");

  return (
    <details className="rounded border border-line p-3">
      <summary className="cursor-pointer text-sm font-semibold text-ink-2">
        Cadastrar em lote
      </summary>

      <p className="mt-2 text-xs text-muted">
        Aceita lista (<code>A,B,C</code>) e faixa (<code>1-10</code>, <code>A-C</code>).
        Cada combinação vira uma posição. Posição que já existe é mantida como
        está, então dá para voltar aqui e acrescentar uma rua nova.
      </p>

      <form action={criarEnderecosEmLote} className="mt-3 flex flex-wrap items-end gap-2">
        <input type="hidden" name="centro_id" value={centroId} />
        {CAMPOS.map(([campo, rotulo, exemplo]) => (
          <label key={campo} className="text-xs text-muted">
            {rotulo}
            <input
              name={campo}
              placeholder={exemplo}
              value={faixas[campo]}
              onChange={(e) => setFaixas((f) => ({ ...f, [campo]: e.target.value }))}
              className={`${inputCls} mt-1 w-24`}
            />
          </label>
        ))}
        <button
          type="submit"
          disabled={!previa.ok}
          className="rounded bg-lm-azul px-4 py-1.5 text-sm font-semibold text-white hover:bg-lm-azul-escuro disabled:cursor-not-allowed disabled:opacity-50"
        >
          Criar posições
        </button>
      </form>

      <div className="mt-2 text-xs" aria-live="polite">
        {vazio ? (
          <span className="text-muted">
            Preencha as quatro faixas para ver quantas posições serão criadas
            (máximo {MAX_POSICOES_POR_LOTE} por lote).
          </span>
        ) : previa.ok ? (
          <span className="text-ink-2">
            <strong>{previa.posicoes.length}</strong> posição(ões):{" "}
            <code>{previa.posicoes[0].codigo}</code>
            {previa.posicoes.length > 1 && (
              <>
                {" "}
                até <code>{previa.posicoes.at(-1)!.codigo}</code>
              </>
            )}
          </span>
        ) : (
          <span className="text-erro">{previa.erro}</span>
        )}
      </div>
    </details>
  );
}
