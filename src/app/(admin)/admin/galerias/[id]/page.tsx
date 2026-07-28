import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { ErrorState } from "@/components/ErrorState";
import { PageHeader, EmptyState } from "@/components/admin/ui";
import { atualizarGaleria, vincularProduto, desvincularProduto } from "../actions";

export const dynamic = "force-dynamic";

const TIPOS = [
  { value: "lancamento", label: "Lançamento" },
  { value: "mais_baratos", label: "Mais baratos" },
  { value: "desconto_progressivo", label: "Desconto progressivo" },
  { value: "custom", label: "Custom (produtos selecionados)" },
] as const;

const inputCls =
  "rounded border border-line bg-surface px-3 py-1.5 text-sm outline-none focus:border-aco-600";
const btnCls =
  "rounded bg-sinal px-3 py-1.5 text-sm font-semibold text-white hover:bg-sinal-escuro";

export default async function EditarGaleriaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  if (!isSupabaseConfigured) {
    return (
      <ErrorState
        title="Supabase não configurado"
        detail="Defina as variáveis do Supabase em web/.env.local."
      />
    );
  }

  const { id } = await params;
  const { erro } = await searchParams;
  const supabase = await createClient();

  const { data: galeria, error } = await supabase
    .from("vitrine_galerias")
    .select("id, titulo, tipo, ordem, ativo")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return <ErrorState title="Falha ao carregar galeria" detail={error.message} />;
  }
  if (!galeria) notFound();

  // Vínculos e busca de produtos só importam para tipo custom.
  const isCustom = galeria.tipo === "custom";
  const [{ data: vinculos }, { data: produtos }] = await Promise.all([
    isCustom
      ? supabase
          .from("vitrine_galeria_produtos")
          .select("id, produto_id, ordem, produtos(nome)")
          .eq("galeria_id", id)
          .order("ordem")
      : Promise.resolve({ data: [] as never[] }),
    isCustom
      ? supabase.from("produtos").select("id, nome").order("nome").limit(500)
      : Promise.resolve({ data: [] as { id: string; nome: string }[] }),
  ]);

  return (
    <div>
      <PageHeader title={`Editar galeria: ${galeria.titulo}`} subtitle={`Tipo: ${galeria.tipo}`} />

      {erro && (
        <div className="mb-4 rounded-lg border border-erro/30 bg-erro/10 px-4 py-3 text-sm text-erro">
          {erro}
        </div>
      )}

      <form action={atualizarGaleria} className="mb-8 flex flex-wrap items-end gap-2">
        <input type="hidden" name="id" value={galeria.id} />
        <div>
          <label className="block text-xs text-muted">Título</label>
          <input name="titulo" required defaultValue={galeria.titulo} className={inputCls} />
        </div>
        <div>
          <label className="block text-xs text-muted">Tipo</label>
          <select name="tipo" required defaultValue={galeria.tipo} className={inputCls}>
            {TIPOS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-muted">Ordem</label>
          <input
            name="ordem"
            type="number"
            defaultValue={galeria.ordem}
            className={`${inputCls} w-20`}
          />
        </div>
        <label className="flex items-center gap-1.5 pb-2 text-sm text-ink">
          <input name="ativo" type="checkbox" defaultChecked={galeria.ativo} />
          Ativo
        </label>
        <button type="submit" className={btnCls}>
          Salvar
        </button>
      </form>

      {isCustom && (
        <div>
          <h2 className="mb-3 font-display text-lg font-semibold text-ink">
            Produtos vinculados
          </h2>

          <form action={vincularProduto} className="mb-4 flex flex-wrap items-end gap-2">
            <input type="hidden" name="galeria_id" value={galeria.id} />
            <div>
              <label className="block text-xs text-muted">Produto</label>
              {/* select nativo: digitar no foco pula para a opção (busca por nome do browser) */}
              <select name="produto_id" required defaultValue="" className={`${inputCls} w-72`}>
                <option value="" disabled>
                  Selecione um produto
                </option>
                {(produtos ?? []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-muted">Ordem</label>
              <input name="ordem" type="number" defaultValue={0} className={`${inputCls} w-20`} />
            </div>
            <button type="submit" className={btnCls}>
              Adicionar produto
            </button>
          </form>

          {(vinculos ?? []).length === 0 ? (
            <EmptyState>Nenhum produto vinculado a esta galeria ainda.</EmptyState>
          ) : (
            <ul className="space-y-2">
              {(vinculos ?? []).map(
                (v: { id: string; ordem: number; produtos: { nome: string } | null }) => (
                  <li
                    key={v.id}
                    className="flex items-center justify-between rounded-lg border border-line bg-surface px-4 py-2 text-sm text-ink"
                  >
                    <span>
                      <span className="num text-muted">#{v.ordem}</span>{" "}
                      {v.produtos?.nome ?? "—"}
                    </span>
                    <form action={desvincularProduto}>
                      <input type="hidden" name="id" value={v.id} />
                      <input type="hidden" name="galeria_id" value={galeria.id} />
                      <button type="submit" className="text-xs font-medium text-erro hover:underline">
                        Remover
                      </button>
                    </form>
                  </li>
                )
              )}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
