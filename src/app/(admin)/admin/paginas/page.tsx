import { PageHeader } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

const inputCls =
  "w-full rounded border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-roxo-800 dark:border-line dark:bg-surface";

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

      <div className="mb-4 rounded border border-warn bg-warn/10 px-4 py-3 text-sm text-warn dark:border-warn dark:bg-warn/20 dark:text-warn">
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
          className="cursor-not-allowed rounded bg-muted px-4 py-2 text-sm font-medium text-ink-2 dark:bg-muted dark:text-ink-2"
        >
          Salvar (persistência pendente)
        </button>
      </form>
    </div>
  );
}
