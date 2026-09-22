import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { ErrorState } from "@/components/ErrorState";
import { PageHeader } from "@/components/admin/ui";
import { MarketplaceBannerForm } from "@/components/admin/MarketplaceBannerForm";
import { parseBannersHero } from "@/lib/banners-hero";
import { salvarMarketplaceConfig } from "./actions";

export const dynamic = "force-dynamic";

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
    .select("banners_hero")
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    return <ErrorState title="Falha ao carregar configuração" detail={error.message} />;
  }

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Editar Marketplace"
        subtitle="Galeria do carousel da home (desktop 1460×482, mobile 892×817)"
      />

      <MarketplaceBannerForm
        action={salvarMarketplaceConfig}
        slides={parseBannersHero(config?.banners_hero)}
      />
    </div>
  );
}
