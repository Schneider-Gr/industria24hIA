import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { ErrorState } from "@/components/ErrorState";
import { PageHeader, EmptyState } from "@/components/admin/ui";
import { salvarPagina, excluirPagina } from "./actions";

export const dynamic = "force-dynamic";

const inputCls =
  "w-full rounded border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-aco-600 dark:border-line dark:bg-surface";
const btnCls =
  "rounded bg-sinal px-4 py-2 text-sm font-semibold text-white hover:bg-sinal-escuro";

// CMS de páginas institucionais (QUEM SOMOS, termos, política…).
export default async function PaginasPage() {
  if (!isSupabaseConfigured) {
    return (
      <ErrorState
        title="Supabase não configurado"
        detail="Defina as variáveis do Supabase em web/.env.local."
      />
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("paginas_cms")
    .select("slug, titulo, conteudo_rich")
    .order("titulo");

  if (error) {
    return <ErrorState title="Falha ao carregar páginas" detail={error.message} />;
  }

  const paginas = data ?? [];

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Páginas"
        subtitle="CMS de páginas institucionais"
        count={paginas.length}
      />

      {/* Nova página */}
      <form action={salvarPagina} className="mb-8 space-y-4 rounded-lg border border-line bg-surface p-4 dark:border-line dark:bg-surface">
        <h3 className="text-sm font-semibold text-ink dark:text-ink">Nova página</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Slug</label>
            <input name="slug" required placeholder="quem-somos" className={inputCls} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Título</label>
            <input name="titulo" required placeholder="Quem Somos" className={inputCls} />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Conteúdo</label>
          <textarea
            name="conteudo_rich"
            rows={8}
            placeholder="Conteúdo da página…"
            className={inputCls}
          />
        </div>
        <button type="submit" className={btnCls}>
          Salvar página
        </button>
      </form>

      {/* Páginas existentes (edição inline por slug) */}
      {paginas.length === 0 ? (
        <EmptyState>Nenhuma página cadastrada ainda.</EmptyState>
      ) : (
        <div className="space-y-4">
          {paginas.map((p) => (
            <form
              key={p.slug}
              action={salvarPagina}
              className="space-y-3 rounded-lg border border-line bg-surface p-4 dark:border-line dark:bg-surface"
            >
              <input type="hidden" name="slug" value={p.slug} />
              <div className="flex items-center justify-between">
                <code className="text-xs text-muted">/{p.slug}</code>
                <button
                  type="submit"
                  formAction={excluirPagina}
                  className="text-xs font-medium text-erro hover:underline"
                >
                  Excluir
                </button>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Título</label>
                <input name="titulo" required defaultValue={p.titulo} className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Conteúdo</label>
                <textarea
                  name="conteudo_rich"
                  rows={8}
                  defaultValue={p.conteudo_rich}
                  className={inputCls}
                />
              </div>
              <button type="submit" className={btnCls}>
                Atualizar
              </button>
            </form>
          ))}
        </div>
      )}
    </div>
  );
}
