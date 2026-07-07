import { PageHeader } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

const inputCls =
  "w-full rounded border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-roxo-800 dark:border-line dark:bg-surface";

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

      <div className="mb-4 rounded border border-warn bg-warn/10 px-4 py-3 text-sm text-warn dark:border-warn dark:bg-warn/20 dark:text-warn">
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
          className="cursor-not-allowed rounded bg-muted px-4 py-2 text-sm font-medium text-ink-2 dark:bg-muted dark:text-ink-2"
        >
          Salvar (persistência pendente)
        </button>
      </form>
    </div>
  );
}
