import { PageHeader } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

const inputCls =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-violet-500 dark:border-neutral-700 dark:bg-neutral-900";

// CMS de páginas institucionais (QUEM SOMOS, termos, política…).
// Ainda NÃO existe tabela paginas_cms — UI presente, persistência desabilitada.
// TODO: tabela paginas_cms(slug, titulo, conteudo_rich) + policy is_admin.
export default function PaginasPage() {
  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Páginas"
        subtitle="CMS de páginas institucionais"
      />

      <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
        Persistência pendente: a tabela <code>paginas_cms</code> ainda não
        existe. O editor abaixo é a interface final; o salvamento será habilitado
        quando a tabela e a policy is_admin forem criadas.
      </div>

      <form className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Slug</label>
            <input disabled placeholder="quem-somos" className={inputCls} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Título</label>
            <input disabled placeholder="Quem Somos" className={inputCls} />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Conteúdo</label>
          <textarea
            disabled
            rows={10}
            placeholder="Conteúdo da página…"
            className={inputCls}
          />
        </div>
        <button
          type="button"
          disabled
          title="Persistência pendente (tabela paginas_cms)"
          className="cursor-not-allowed rounded-md bg-neutral-300 px-4 py-2 text-sm font-medium text-neutral-600 dark:bg-neutral-700 dark:text-neutral-400"
        >
          Salvar (persistência pendente)
        </button>
      </form>
    </div>
  );
}
