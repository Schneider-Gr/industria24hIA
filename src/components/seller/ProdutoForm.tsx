"use client";

import { useActionState, useState } from "react";
import type { Tables } from "@/lib/supabase/database.types";
import { criarProduto, type ProdutoFormState } from "@/app/(seller)/seller/produtos/actions";

const inputCls =
  "mt-1 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-500 dark:border-neutral-700 dark:bg-neutral-900";

function Num({ name, label, step = "any", defaultValue }: { name: string; label: string; step?: string; defaultValue?: string }) {
  return (
    <label className="block text-sm">
      <span className="text-neutral-600 dark:text-neutral-300">{label}</span>
      <input name={name} type="number" step={step} defaultValue={defaultValue} className={inputCls} />
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
        className="rounded-md bg-neutral-900 px-5 py-2 text-sm font-medium text-white hover:bg-neutral-700 dark:bg-white dark:text-neutral-900"
      >
        Cadastrar Novo
      </button>
    );
  }

  return (
    <form action={action} className="max-w-3xl space-y-6 rounded-lg border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="text-neutral-600 dark:text-neutral-300">Nome *</span>
          <input name="nome" required className={inputCls} />
        </label>
        <Num name="valor" label="Valor (R$) *" defaultValue="0" />
        <Num name="quantidade_minima" label="Quantidade mínima" step="1" />
        <Num name="estoque_atual" label="Estoque atual" step="1" defaultValue="0" />
        <label className="block text-sm">
          <span className="text-neutral-600 dark:text-neutral-300">SKU</span>
          <input name="sku" className={inputCls} />
        </label>
        <label className="block text-sm">
          <span className="text-neutral-600 dark:text-neutral-300">CEP (onde o produto está)</span>
          <input name="cep_produto" className={inputCls} />
        </label>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="text-neutral-600 dark:text-neutral-300">Categoria</span>
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
          <span className="text-neutral-600 dark:text-neutral-300">Subcategoria</span>
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
        <legend className="text-sm font-medium">Afiliação</legend>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="permite_afiliacao" />
          Permite afiliação
        </label>
        <Num name="porcentagem_afiliado" label="Porcentagem do afiliado (%)" defaultValue="5" />
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Dimensões e peso (frete)</legend>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Num name="altura" label="Altura (cm)" />
          <Num name="comprimento" label="Comprimento (cm)" />
          <Num name="largura" label="Largura (cm)" />
          <Num name="peso" label="Peso (kg)" />
        </div>
      </fieldset>

      {centros.length > 0 && (
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Centros de distribuição</legend>
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
        <span className="text-neutral-600 dark:text-neutral-300">Descrição</span>
        <textarea name="descricao" rows={3} className={inputCls} />
      </label>

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-neutral-900 px-5 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50 dark:bg-white dark:text-neutral-900"
        >
          {pending ? "Salvando..." : "Salvar produto"}
        </button>
        <button
          type="button"
          onClick={() => setAberto(false)}
          className="text-sm text-neutral-500 hover:underline"
        >
          Cancelar
        </button>
        {state.ok && <span className="text-sm text-green-600">Produto cadastrado.</span>}
        {state.error && <span className="text-sm text-red-600">{state.error}</span>}
      </div>
    </form>
  );
}
