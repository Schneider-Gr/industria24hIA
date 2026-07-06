import { PageHeader } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

const inputCls =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-violet-500 dark:border-neutral-700 dark:bg-neutral-900";

// Configuração visual da home (banners desktop 1460x482 / mobile 892x817).
// Ainda NÃO existe tabela marketplace_config — a UI existe, mas a persistência
// fica desabilitada (sem mock) até a tabela ser criada.
// TODO: tabela marketplace_config (banners desktop/mobile) + policy is_admin.
export default function EditarMarketplacePage() {
  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Editar Marketplace"
        subtitle="Banners da home (desktop 1460×482, mobile 892×817)"
      />

      <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
        Persistência pendente: a tabela <code>marketplace_config</code> ainda não
        existe. O formulário abaixo é a interface final; o salvamento será
        habilitado quando a tabela e a policy is_admin forem criadas.
      </div>

      <form className="space-y-5">
        <div>
          <label className="mb-1 block text-sm font-medium">
            Banner desktop (URL) — 1460×482
          </label>
          <input disabled placeholder="https://…" className={inputCls} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">
            Banner mobile (URL) — 892×817
          </label>
          <input disabled placeholder="https://…" className={inputCls} />
        </div>
        <button
          type="button"
          disabled
          title="Persistência pendente (tabela marketplace_config)"
          className="cursor-not-allowed rounded-md bg-neutral-300 px-4 py-2 text-sm font-medium text-neutral-600 dark:bg-neutral-700 dark:text-neutral-400"
        >
          Salvar (persistência pendente)
        </button>
      </form>
    </div>
  );
}
