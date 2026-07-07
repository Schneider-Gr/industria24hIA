"use client";

import { useActionState, useState } from "react";
import type { Tables } from "@/lib/supabase/database.types";
import { criarProduto, type ProdutoFormState } from "@/app/(seller)/seller/produtos/actions";

const inputCls =
  "mt-1 w-full rounded border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-roxo-800";

function Num({ name, label, step = "any", defaultValue }: { name: string; label: string; step?: string; defaultValue?: string }) {
  return (
    <label className="block text-sm">
      <span className="text-ink-2">{label}</span>
      <input name={name} type="number" step={step} defaultValue={defaultValue} className={`${inputCls} num`} />
    </label>
  );
}

export function ProdutoForm({
  categorias,
  subcategorias,
  centros,
}: {
  categorias: Tables<"categorias">[];
  subcategorias: Tables<"subcategorias">[];
  centros: Tables<"centros_distribuicao">[];
}) {
  const [aberto, setAberto] = useState(false);
  const [catId, setCatId] = useState("");
  const [state, action, pending] = useActionState<ProdutoFormState, FormData>(
    criarProduto,
    { ok: false },
  );

  const subsFiltradas = catId
    ? subcategorias.filter((s) => s.categoria_id === catId)
    : subcategorias;

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="rounded bg-roxo-800 px-5 py-2 text-sm font-semibold text-white hover:bg-roxo-900"
      >
        Cadastrar Novo
      </button>
    );
  }

  return (
    <form action={action} className="max-w-3xl space-y-6 rounded-lg border border-line bg-surface p-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="text-ink-2">Nome *</span>
          <input name="nome" required className={inputCls} />
        </label>
        <label className="block text-sm">
          <span className="text-ink-2">Valor (R$) *</span>
          <input name="valor" type="number" step="any" defaultValue="0" className={`${inputCls} num font-semibold`} />
        </label>
        <label className="block text-sm">
          <span className="text-ink-2">Quantidade mínima</span>
          <input name="quantidade_minima" type="number" step="1" className={`${inputCls} num`} />
        </label>
        <label className="block text-sm">
          <span className="text-ink-2">Estoque atual</span>
          <input name="estoque_atual" type="number" step="1" defaultValue="0" className={`${inputCls} num`} />
        </label>
        <label className="block text-sm">
          <span className="text-ink-2">SKU</span>
          <input name="sku" className={inputCls} />
        </label>
        <label className="block text-sm">
          <span className="text-ink-2">CEP (onde o produto está)</span>
          <input name="cep_produto" className={inputCls} />
        </label>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="text-ink-2">Categoria</span>
          <select
            name="categoria_id"
            value={catId}
            onChange={(e) => setCatId(e.target.value)}
            className={inputCls}
          >
            <option value="">Selecione</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="text-ink-2">Subcategoria</span>
          <select name="subcategoria_id" className={inputCls}>
            <option value="">Selecione</option>
            {subsFiltradas.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nome}
              </option>
            ))}
          </select>
        </label>
      </div>

      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold">Afiliação</legend>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="permite_afiliacao" />
          Permite afiliação
        </label>
        <label className="block text-sm">
          <span className="text-ink-2">Porcentagem do afiliado (%)</span>
          <input name="porcentagem_afiliado" type="number" step="any" defaultValue="5" className={`${inputCls} num`} />
        </label>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold">Dimensões e peso (frete)</legend>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <label className="block text-sm">
            <span className="text-ink-2">Altura (cm)</span>
            <input name="altura" type="number" step="any" className={`${inputCls} num`} />
          </label>
          <label className="block text-sm">
            <span className="text-ink-2">Comprimento (cm)</span>
            <input name="comprimento" type="number" step="any" className={`${inputCls} num`} />
          </label>
          <label className="block text-sm">
            <span className="text-ink-2">Largura (cm)</span>
            <input name="largura" type="number" step="any" className={`${inputCls} num`} />
          </label>
          <label className="block text-sm">
            <span className="text-ink-2">Peso (kg)</span>
            <input name="peso" type="number" step="any" className={`${inputCls} num`} />
          </label>
        </div>
      </fieldset>

      {centros.length > 0 && (
        <fieldset className="space-y-2">
          <legend className="text-sm font-semibold">Centros de distribuição</legend>
          <div className="flex flex-wrap gap-3">
            {centros.map((c) => (
              <label key={c.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="centros" value={c.id} />
                {c.nome}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <label className="block text-sm">
        <span className="text-ink-2">Descrição</span>
        <textarea name="descricao" rows={3} className={inputCls} />
      </label>

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-laranja px-5 py-2 text-sm font-semibold text-white hover:bg-laranja-escuro disabled:opacity-50"
        >
          {pending ? "Salvando..." : "Salvar produto"}
        </button>
        <button
          type="button"
          onClick={() => setAberto(false)}
          className="text-sm text-ink-2 hover:underline"
        >
          Cancelar
        </button>
        {state.ok && <span className="text-sm text-ok">Produto cadastrado.</span>}
        {state.error && <span className="text-sm text-erro">{state.error}</span>}
      </div>
    </form>
  );
}
