"use client";

import { useState } from "react";
import { criarCupom } from "./actions";

const inputCls =
  "rounded border border-line bg-surface px-3 py-1.5 text-sm outline-none focus:border-aco-600 dark:border-line dark:bg-surface";
const btnCls = "rounded bg-sinal px-3 py-1.5 text-sm font-semibold text-white hover:bg-sinal-escuro";

type Regra = { alvo: string; alvo_id: string; tipo: string; valor: string };

const REGRA_VAZIA: Regra = { alvo: "tudo", alvo_id: "", tipo: "percentual", valor: "" };

export function NovoCupomForm() {
  const [regras, setRegras] = useState<Regra[]>([{ ...REGRA_VAZIA }]);
  const [erro, setErro] = useState<string | null>(null);

  function atualizarRegra(i: number, patch: Partial<Regra>) {
    setRegras((r) => r.map((reg, idx) => (idx === i ? { ...reg, ...patch } : reg)));
  }

  return (
    <form
      action={async (formData) => {
        setErro(null);
        formData.set("regras_json", JSON.stringify(regras));
        // A action retorna { erro } em vez de lançar: throw em Server Action
        // vira "Minified React error #441" em produção, sem mensagem útil.
        const r = await criarCupom(formData);
        if (r?.erro) {
          setErro(r.erro);
          return;
        }
        setRegras([{ ...REGRA_VAZIA }]);
      }}
      className="mb-8 space-y-3 rounded border border-line bg-surface p-4"
    >
      <div className="flex flex-wrap gap-2">
        <input name="codigo" required placeholder="Código (ex.: BEMVINDO10)" className={inputCls} />
        <input name="validade_inicio" type="datetime-local" required className={inputCls} />
        <input name="validade_fim" type="datetime-local" required className={inputCls} />
        <input
          name="valor_minimo_pedido"
          type="number"
          step="0.01"
          min="0"
          placeholder="Pedido mínimo (R$, opcional)"
          className={inputCls}
        />
        <input
          name="limite_global"
          type="number"
          min="1"
          placeholder="Teto de usos (opcional)"
          className={inputCls}
        />
        <input
          name="limite_por_cliente"
          type="number"
          min="1"
          defaultValue={1}
          placeholder="Teto por cliente"
          className={inputCls}
        />
      </div>

      <div className="space-y-2">
        <p className="text-sm font-semibold">Regras (alvo → desconto)</p>
        {regras.map((r, i) => (
          <div key={i} className="flex flex-wrap items-center gap-2">
            <select
              className={inputCls}
              value={r.alvo}
              onChange={(e) => atualizarRegra(i, { alvo: e.target.value, alvo_id: "" })}
            >
              <option value="tudo">Tudo</option>
              <option value="loja">Loja</option>
              <option value="categoria">Categoria</option>
              <option value="produto">Produto</option>
            </select>
            {r.alvo !== "tudo" && (
              <input
                className={inputCls}
                placeholder={`ID da(o) ${r.alvo}`}
                value={r.alvo_id}
                onChange={(e) => atualizarRegra(i, { alvo_id: e.target.value })}
              />
            )}
            <select
              className={inputCls}
              value={r.tipo}
              onChange={(e) => atualizarRegra(i, { tipo: e.target.value })}
            >
              <option value="percentual">%</option>
              <option value="valor_fixo">R$ de desconto por unidade</option>
            </select>
            <input
              className={inputCls + " w-28"}
              type="number"
              step="0.01"
              min="0"
              placeholder="Valor"
              value={r.valor}
              onChange={(e) => atualizarRegra(i, { valor: e.target.value })}
            />
            {regras.length > 1 && (
              <button
                type="button"
                onClick={() => setRegras((rs) => rs.filter((_, idx) => idx !== i))}
                className="text-sm text-erro hover:underline"
              >
                remover
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={() => setRegras((rs) => [...rs, { ...REGRA_VAZIA }])}
          className="text-sm font-semibold text-lm-azul hover:underline"
        >
          + adicionar regra
        </button>
      </div>

      {erro && <p className="text-sm text-erro">{erro}</p>}
      <button type="submit" className={btnCls}>
        Criar cupom
      </button>
    </form>
  );
}
