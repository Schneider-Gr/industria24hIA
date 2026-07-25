"use client";

import { useActionState, useRef, useState } from "react";
import type { Tables } from "@/lib/supabase/database.types";
import { criarProduto, atualizarProduto, type ProdutoFormState } from "@/app/(seller)/seller/produtos/actions";
import { gerarCuradoriaProduto, gerarImagemProduto } from "@/app/(seller)/seller/produtos/ia-actions";

type ProdutoEditavel = Pick<
  Tables<"produtos">,
  | "id"
  | "nome"
  | "valor"
  | "quantidade_minima"
  | "estoque_atual"
  | "sku"
  | "cep_produto"
  | "categoria_id"
  | "subcategoria_id"
  | "permite_afiliacao"
  | "porcentagem_afiliado"
  | "permite_logistica_afiliado"
  | "altura"
  | "comprimento"
  | "largura"
  | "peso"
  | "descricao"
  | "frete_gratis"
>;

const inputCls =
  "mt-1 w-full rounded border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-aco-600";

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
  produto,
  onCancelarEdicao,
  // O admin reusa este form com a própria action (sem filtro de dono).
  salvarAction,
}: {
  categorias: Pick<Tables<"categorias">, "id" | "nome">[];
  subcategorias: Pick<Tables<"subcategorias">, "id" | "nome" | "categoria_id">[];
  centros: Pick<Tables<"centros_distribuicao">, "id" | "nome">[];
  produto?: ProdutoEditavel;
  onCancelarEdicao?: () => void;
  salvarAction?: (prev: ProdutoFormState, fd: FormData) => Promise<ProdutoFormState>;
}) {
  const editando = !!produto;
  const [aberto, setAberto] = useState(editando);
  const [catId, setCatId] = useState(produto?.categoria_id ?? "");
  const [state, action, pending] = useActionState<ProdutoFormState, FormData>(
    salvarAction ?? (editando ? atualizarProduto : criarProduto),
    { ok: false },
  );

  const subsFiltradas = catId
    ? subcategorias.filter((s) => s.categoria_id === catId)
    : subcategorias;

  const formRef = useRef<HTMLFormElement>(null);
  const [iaPending, setIaPending] = useState(false);
  const [iaErro, setIaErro] = useState<string | null>(null);
  const [iaSugestao, setIaSugestao] = useState<{
    keywords: string[];
    preco: number;
    justificativa: string;
  } | null>(null);

  const [imgPending, setImgPending] = useState(false);
  const [imgErro, setImgErro] = useState<string | null>(null);
  const [imgUrl, setImgUrl] = useState<string | null>(null);

  async function gerarImagem() {
    const form = formRef.current;
    if (!form) return;
    const nome = (form.elements.namedItem("nome") as HTMLInputElement | null)?.value ?? "";
    const descricao =
      (form.elements.namedItem("descricao") as HTMLTextAreaElement | null)?.value ?? "";
    setImgErro(null);
    setImgUrl(null);
    setImgPending(true);
    const r = await gerarImagemProduto(nome, descricao);
    setImgPending(false);
    if (!r.ok) {
      setImgErro(r.error ?? "Falha ao gerar imagem.");
      return;
    }
    setImgUrl(r.url ?? null);
  }

  async function rodarCuradoria() {
    if (!produto) return;
    setIaErro(null);
    setIaPending(true);
    const r = await gerarCuradoriaProduto(produto.id);
    setIaPending(false);
    if (!r.ok) {
      setIaErro(r.error ?? "Falha na curadoria.");
      return;
    }
    // Preenche descrição/valor no form; keywords e justificativa ficam como sugestão.
    const form = formRef.current;
    if (form) {
      const desc = form.elements.namedItem("descricao") as HTMLTextAreaElement | null;
      const valor = form.elements.namedItem("valor") as HTMLInputElement | null;
      if (desc && r.descricao) desc.value = r.descricao;
      if (valor && r.preco_sugerido != null) valor.value = String(r.preco_sugerido);
    }
    setIaSugestao({
      keywords: r.seo_keywords ?? [],
      preco: r.preco_sugerido ?? 0,
      justificativa: r.preco_justificativa ?? "",
    });
  }

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="rounded bg-aco-600 px-5 py-2 text-sm font-semibold text-white hover:bg-aco-900"
      >
        Cadastrar Novo
      </button>
    );
  }

  return (
    <form ref={formRef} action={action} className="max-w-3xl space-y-6 rounded-lg border border-line bg-surface p-6">
      {editando && <input type="hidden" name="id" value={produto.id} />}
      {/* ponytail: IA só no seller — as ia-actions filtram por owner_id e
          rejeitariam o admin editando produto de outro dono. */}
      {editando && !salvarAction && (
        <div className="rounded border border-aco-800/40 bg-aco-100/60 p-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={rodarCuradoria}
              disabled={iaPending}
              className="rounded bg-aco-800 px-4 py-1.5 text-sm font-semibold text-white hover:bg-aco-900 disabled:opacity-50"
            >
              {iaPending ? "Gerando..." : "IA: gerar descrição, SEO e preço"}
            </button>
            {iaErro && <span className="text-sm text-erro">{iaErro}</span>}
          </div>
          {iaSugestao && (
            <div className="mt-3 space-y-1 text-sm text-ink-2">
              <p>
                <strong>Preço sugerido:</strong> R$ {iaSugestao.preco.toFixed(2)} — {iaSugestao.justificativa}
              </p>
              <p>
                <strong>Palavras-chave:</strong> {iaSugestao.keywords.join(", ")}
              </p>
              <p className="text-xs text-muted">Descrição e valor já preenchidos acima; ajuste e salve.</p>
            </div>
          )}
        </div>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="text-ink-2">Nome *</span>
          <input name="nome" required defaultValue={produto?.nome ?? ""} className={inputCls} />
        </label>
        <label className="block text-sm">
          <span className="text-ink-2">Valor (R$) *</span>
          <input name="valor" type="number" step="any" defaultValue={produto?.valor ?? "0"} className={`${inputCls} num font-semibold`} />
        </label>
        <label className="block text-sm">
          <span className="text-ink-2">Quantidade mínima</span>
          <input name="quantidade_minima" type="number" step="1" defaultValue={produto?.quantidade_minima ?? ""} className={`${inputCls} num`} />
        </label>
        <label className="block text-sm">
          <span className="text-ink-2">Estoque atual</span>
          <input name="estoque_atual" type="number" step="1" defaultValue={produto?.estoque_atual ?? "0"} className={`${inputCls} num`} />
        </label>
        <label className="block text-sm">
          <span className="text-ink-2">SKU</span>
          <input name="sku" defaultValue={produto?.sku ?? ""} className={inputCls} />
        </label>
        <label className="block text-sm">
          <span className="text-ink-2">CEP (onde o produto está)</span>
          <input name="cep_produto" defaultValue={produto?.cep_produto ?? ""} className={inputCls} />
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
          <select name="subcategoria_id" defaultValue={produto?.subcategoria_id ?? ""} className={inputCls}>
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
          <input type="checkbox" name="permite_afiliacao" defaultChecked={produto?.permite_afiliacao ?? false} />
          Permite afiliação
        </label>
        <label className="block text-sm">
          <span className="text-ink-2">Porcentagem do afiliado (%)</span>
          <input name="porcentagem_afiliado" type="number" step="any" defaultValue={produto?.porcentagem_afiliado ?? "5"} className={`${inputCls} num`} />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="permite_logistica_afiliado" defaultChecked={produto?.permite_logistica_afiliado ?? true} />
          Afiliado logístico da loja pode entregar este produto
        </label>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold">Dimensões e peso (frete)</legend>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <label className="block text-sm">
            <span className="text-ink-2">Altura (cm)</span>
            <input name="altura" type="number" step="any" defaultValue={produto?.altura ?? ""} className={`${inputCls} num`} />
          </label>
          <label className="block text-sm">
            <span className="text-ink-2">Comprimento (cm)</span>
            <input name="comprimento" type="number" step="any" defaultValue={produto?.comprimento ?? ""} className={`${inputCls} num`} />
          </label>
          <label className="block text-sm">
            <span className="text-ink-2">Largura (cm)</span>
            <input name="largura" type="number" step="any" defaultValue={produto?.largura ?? ""} className={`${inputCls} num`} />
          </label>
          <label className="block text-sm">
            <span className="text-ink-2">Peso (kg)</span>
            <input name="peso" type="number" step="any" defaultValue={produto?.peso ?? ""} className={`${inputCls} num`} />
          </label>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="frete_gratis" defaultChecked={produto?.frete_gratis ?? false} />
          Frete grátis (este produto não cobra frete no checkout)
        </label>
      </fieldset>

      {!editando && centros.length > 0 && (
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
        <textarea name="descricao" rows={3} defaultValue={produto?.descricao ?? ""} className={inputCls} />
      </label>

      {!salvarAction && (
      <div data-tour="gerar-imagem" className="rounded border border-aco-800/40 bg-aco-100/60 p-3">
        {imgUrl && <input type="hidden" name="imagem_url" value={imgUrl} />}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={gerarImagem}
            disabled={imgPending}
            className="rounded border border-aco-800 px-4 py-1.5 text-sm font-semibold text-aco-600 hover:bg-aco-100 disabled:opacity-50"
          >
            {imgPending ? "Gerando imagem..." : "IA: gerar imagem da descrição"}
          </button>
          <span className="text-xs text-muted">
            Cria uma foto de catálogo a partir do nome e da descrição.
          </span>
          {imgErro && <span className="text-sm text-erro">{imgErro}</span>}
        </div>
        {imgUrl && (
          <div className="mt-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imgUrl}
              alt="Imagem gerada por IA"
              className="h-40 w-40 rounded border border-line object-cover"
            />
            <p className="mt-1 text-xs text-ok">
              Imagem gerada. {editando ? "Salve para anexar ao produto." : "Será anexada ao cadastrar."}
            </p>
          </div>
        )}
      </div>
      )}

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-sinal px-5 py-2 text-sm font-semibold text-white hover:bg-sinal-escuro disabled:opacity-50"
        >
          {pending ? "Salvando..." : editando ? "Salvar alterações" : "Salvar produto"}
        </button>
        <button
          type="button"
          onClick={() => (editando ? onCancelarEdicao?.() : setAberto(false))}
          className="text-sm text-ink-2 hover:underline"
        >
          Cancelar
        </button>
        {state.ok && <span className="text-sm text-ok">{editando ? "Produto atualizado." : "Produto cadastrado."}</span>}
        {state.error && <span className="text-sm text-erro">{state.error}</span>}
      </div>
    </form>
  );
}
