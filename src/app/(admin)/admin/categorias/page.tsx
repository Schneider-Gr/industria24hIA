import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { ErrorState } from "@/components/ErrorState";
import { PageHeader, EmptyState } from "@/components/admin/ui";
import {
  criarCategoria,
  excluirCategoria,
  criarSubcategoria,
  excluirSubcategoria,
} from "./actions";

export const dynamic = "force-dynamic";

const inputCls =
  "rounded border border-line bg-surface px-3 py-1.5 text-sm outline-none focus:border-roxo-800 dark:border-line dark:bg-surface";
const btnCls =
  "rounded bg-laranja px-3 py-1.5 text-sm font-semibold text-white hover:bg-laranja-escuro";

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
  const [{ data: cats, error: e1 }, { data: subs, error: e2 }] = await Promise.all([
    supabase.from("categorias").select("id, nome").order("nome"),
    supabase.from("subcategorias").select("id, nome, categoria_id").order("nome"),
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
  const subporcat = new Map<string, { id: string; nome: string }[]>();
  for (const s of subs ?? []) {
    if (!s.categoria_id) continue;
    const arr = subporcat.get(s.categoria_id) ?? [];
    arr.push({ id: s.id, nome: s.nome });
    subporcat.set(s.categoria_id, arr);
  }

  return (
    <div>
      <PageHeader
        title="Categorias"
        subtitle="Taxonomia do marketplace (categorias e subcategorias)"
        count={categorias.length}
      />

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
            return (
              <div
                key={c.id}
                className="rounded-lg border border-line bg-surface p-4 dark:border-line dark:bg-surface"
              >
                <div className="flex items-center justify-between">
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

                {filhas.length > 0 && (
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {filhas.map((s) => (
                      <li
                        key={s.id}
                        className="flex items-center gap-2 rounded bg-roxo-100 px-3 py-1 text-sm text-roxo-900 dark:bg-roxo-900 dark:text-roxo-100"
                      >
                        <span>{s.nome}</span>
                        <form action={excluirSubcategoria}>
                          <input type="hidden" name="id" value={s.id} />
                          <button
                            type="submit"
                            aria-label={`Excluir ${s.nome}`}
                            className="text-erro hover:text-erro dark:text-erro"
                          >
                            ×
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
                    className="rounded border-2 border-roxo-800 px-3 py-1.5 text-sm font-semibold text-roxo-800 hover:bg-roxo-800 hover:text-white dark:border-roxo-800 dark:text-roxo-800 dark:hover:bg-roxo-800 dark:hover:text-white"
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
