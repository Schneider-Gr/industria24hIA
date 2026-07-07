import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { ErrorState } from "@/components/ErrorState";
import { PageHeader } from "@/components/admin/ui";
import { salvarMarketplaceConfig } from "./actions";

export const dynamic = "force-dynamic";

const inputCls =
  "w-full rounded border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-roxo-800 dark:border-line dark:bg-surface";

// Configuração visual da home (banners desktop 1460x482 / mobile 892x817).
export default async function EditarMarketplacePage() {
  if (!isSupabaseConfigured) {
    return (
      <ErrorState
        title="Supabase não configurado"
        detail="Defina as variáveis do Supabase em web/.env.local."
      />
    );
  }

  const supabase = await createClient();
  const { data: config, error } = await supabase
    .from("marketplace_config")
    .select("banner_desktop_url, banner_mobile_url")
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    return <ErrorState title="Falha ao carregar configuração" detail={error.message} />;
  }

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Editar Marketplace"
        subtitle="Banners da home (desktop 1460×482, mobile 892×817)"
      />

      <form action={salvarMarketplaceConfig} className="space-y-5">
        <div>
          <label className="mb-1 block text-sm font-medium">
            Banner desktop (URL) — 1460×482
          </label>
          <input
            name="banner_desktop_url"
            type="url"
            defaultValue={config?.banner_desktop_url ?? ""}
            placeholder="https://…"
            className={inputCls}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">
            Banner mobile (URL) — 892×817
          </label>
          <input
            name="banner_mobile_url"
            type="url"
            defaultValue={config?.banner_mobile_url ?? ""}
            placeholder="https://…"
            className={inputCls}
          />
        </div>
        <button
          type="submit"
          className="rounded bg-laranja px-4 py-2 text-sm font-semibold text-white hover:bg-laranja-escuro"
        >
          Salvar
        </button>
      </form>
    </div>
  );
}
