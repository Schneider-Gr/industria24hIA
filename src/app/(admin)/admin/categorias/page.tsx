import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { ErrorState } from "@/components/ErrorState";
import { PageHeader, EmptyState } from "@/components/admin/ui";
import {
  criarCategoria,
  excluirCategoria,
  criarSubcategoria,
  excluirSubcategoria,
  salvarComissao,
} from "./actions";
import { PADRAO_PCT } from "@/lib/comissao/percentual";

export const dynamic = "force-dynamic";

const inputCls =
  "rounded border border-line bg-surface px-3 py-1.5 text-sm outline-none focus:border-aco-600 dark:border-line dark:bg-surface";
const btnCls =
  "rounded bg-sinal px-3 py-1.5 text-sm font-semibold text-white hover:bg-sinal-escuro";


const fmt = (n: number) =>
  n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Campo de comissão de um nó. Vazio significa herança e 0 significa comissão
 * nula deliberada, e por isso os dois estados são exibidos de forma distinta. */
function CampoComissao({
  id,
  tipo,
  proprio,
  efetivo,
  origem,
  produtos,
}: {
  id: string;
  tipo: "categoria" | "subcategoria";
  proprio: number | null;
  efetivo: number;
  origem: "proprio" | "herdado" | "padrao";
  produtos: number;
}) {
  return (
    <form action={salvarComissao} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="tipo" value={tipo} />
      <label className="sr-only" htmlFor={`pct-${id}`}>
        Comissão da plataforma
      </label>
      <input
        id={`pct-${id}`}
        name="comissao_pct"
        inputMode="decimal"
        defaultValue={proprio === null ? "" : fmt(proprio)}
        placeholder={origem === "proprio" ? "" : fmt(efetivo)}
        className={`${inputCls} w-24 text-right`}
      />
      <span className="text-sm text-ink-fraco dark:text-ink-fraco">%</span>
      <button
        type="submit"
        className="rounded border border-line px-2 py-1 text-xs font-semibold text-ink hover:bg-aco-100 dark:border-line dark:text-ink dark:hover:bg-aco-900"
      >
        Salvar
      </button>
      <span className="text-xs text-ink-fraco dark:text-ink-fraco">
        {origem === "proprio"
          ? `seller recebe ${fmt(100 - efetivo)}%`
          : origem === "herdado"
            ? `herda ${fmt(efetivo)}% da categoria`
            : `padrão ${fmt(efetivo)}%`}
        {" · "}
        {produtos} {produtos === 1 ? "produto" : "produtos"}
      </span>
    </form>
  );
}

export default async function CategoriasPage() {
  if (!isSupabaseConfigured) {
    return (
      <ErrorState
        title="Supabase não configurado"
        detail="Defina as variáveis do Supabase em web/.env.local."
      />
    );
  }

  const supabase = await createClient();
  const [{ data: cats, error: e1 }, { data: subs, error: e2 }, { data: prods }] =
    await Promise.all([
      supabase.from("categorias").select("id, nome, comissao_pct").order("nome"),
      supabase
        .from("subcategorias")
        .select("id, nome, categoria_id, comissao_pct")
        .order("nome"),
      // ponytail: catálogo de centenas, contagem em memória. Vira agregação no
      // banco quando passar de alguns milhares de produtos.
      supabase.from("produtos").select("categoria_id, subcategoria_id"),
    ]);

  if (e1 || e2) {
    return (
      <ErrorState
        title="Falha ao carregar categorias"
        detail={(e1 ?? e2)?.message}
      />
    );
  }

  const categorias = cats ?? [];
  const porCategoria = new Map<string, number>();
  const porSubcategoria = new Map<string, number>();
  for (const p of prods ?? []) {
    if (p.categoria_id)
      porCategoria.set(p.categoria_id, (porCategoria.get(p.categoria_id) ?? 0) + 1);
    if (p.subcategoria_id)
      porSubcategoria.set(
        p.subcategoria_id,
        (porSubcategoria.get(p.subcategoria_id) ?? 0) + 1,
      );
  }

  type Sub = { id: string; nome: string; comissao_pct: number | null };
  const subporcat = new Map<string, Sub[]>();
  for (const s of subs ?? []) {
    if (!s.categoria_id) continue;
    const arr = subporcat.get(s.categoria_id) ?? [];
    arr.push({ id: s.id, nome: s.nome, comissao_pct: s.comissao_pct });
    subporcat.set(s.categoria_id, arr);
  }

  return (
    <div>
      <PageHeader
        title="Categorias"
        subtitle="Taxonomia do marketplace e comissão da plataforma por categoria"
        count={categorias.length}
      />

      <p className="mb-6 max-w-2xl text-sm text-ink-fraco dark:text-ink-fraco">
        A comissão é o quanto a plataforma retém de cada item vendido. Campo vazio
        herda: a subcategoria herda da categoria, e a categoria sem percentual usa
        o padrão de {fmt(PADRAO_PCT)}%. Zero é comissão nula, e é diferente de
        vazio. O percentual vale a partir do próximo pedido; vendas já fechadas
        guardam o percentual que foi cobrado nelas.
      </p>

      <form action={criarCategoria} className="mb-8 flex gap-2">
        <input
          name="nome"
          required
          placeholder="Nova categoria"
          className={inputCls}
        />
        <button type="submit" className={btnCls}>
          Adicionar categoria
        </button>
      </form>

      {categorias.length === 0 ? (
        <EmptyState>Nenhuma categoria cadastrada ainda.</EmptyState>
      ) : (
        <div className="space-y-4">
          {categorias.map((c) => {
            const filhas = subporcat.get(c.id) ?? [];
            const pctCat = c.comissao_pct ?? null;
            const efetivoCat = pctCat ?? PADRAO_PCT;
            return (
              <div
                key={c.id}
                className="rounded-lg border border-line bg-surface p-4 dark:border-line dark:bg-surface"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="font-semibold text-ink dark:text-ink">
                    {c.nome}
                  </h3>
                  <form action={excluirCategoria}>
                    <input type="hidden" name="id" value={c.id} />
                    <button
                      type="submit"
                      className="text-xs font-medium text-erro hover:underline"
                    >
                      Excluir categoria
                    </button>
                  </form>
                </div>

                <div className="mt-2">
                  <CampoComissao
                    id={c.id}
                    tipo="categoria"
                    proprio={pctCat}
                    efetivo={efetivoCat}
                    origem={pctCat === null ? "padrao" : "proprio"}
                    produtos={porCategoria.get(c.id) ?? 0}
                  />
                </div>

                {filhas.length > 0 && (
                  <ul className="mt-4 space-y-2 border-t border-line pt-3 dark:border-line">
                    {filhas.map((s) => (
                      <li
                        key={s.id}
                        className="flex flex-wrap items-center gap-3 pl-4"
                      >
                        <span className="min-w-40 text-sm text-ink dark:text-ink">
                          {s.nome}
                        </span>
                        <CampoComissao
                          id={s.id}
                          tipo="subcategoria"
                          proprio={s.comissao_pct}
                          efetivo={s.comissao_pct ?? efetivoCat}
                          origem={s.comissao_pct === null ? "herdado" : "proprio"}
                          produtos={porSubcategoria.get(s.id) ?? 0}
                        />
                        <form action={excluirSubcategoria}>
                          <input type="hidden" name="id" value={s.id} />
                          <button
                            type="submit"
                            aria-label={`Excluir ${s.nome}`}
                            className="text-sm text-erro hover:underline dark:text-erro"
                          >
                            Excluir
                          </button>
                        </form>
                      </li>
                    ))}
                  </ul>
                )}

                <form action={criarSubcategoria} className="mt-3 flex gap-2">
                  <input type="hidden" name="categoria_id" value={c.id} />
                  <input
                    name="nome"
                    required
                    placeholder="Nova subcategoria"
                    className={inputCls}
                  />
                  <button
                    type="submit"
                    className="rounded border-2 border-aco-600 px-3 py-1.5 text-sm font-semibold text-aco-600 hover:bg-aco-600 hover:text-white dark:border-aco-600 dark:text-aco-600 dark:hover:bg-aco-600 dark:hover:text-white"
                  >
                    Adicionar
                  </button>
                </form>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
