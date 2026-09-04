import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { ErrorState } from "@/components/ErrorState";
import { PageHeader, EmptyState } from "@/components/admin/ui";
import { BannerDestaqueForm } from "@/components/admin/BannerDestaqueForm";
import {
  criarBannerDestaque,
  atualizarBannerDestaque,
  excluirBannerDestaque,
} from "./actions";

export const dynamic = "force-dynamic";

// Admin da faixa "Destaques da Indústria" no topo da home (BannerGalerias em
// src/app/page.tsx), antes hardcoded no array CARDS_GALERIA.
export default async function DestaquesPage() {
  if (!isSupabaseConfigured) {
    return (
      <ErrorState
        title="Supabase não configurado"
        detail="Defina as variáveis do Supabase em web/.env.local."
      />
    );
  }

  const supabase = await createClient();
  const { data: banners, error } = await supabase
    .from("banners_destaque")
    .select("id, titulo, imagem_url, href, badge, ordem, ativo, posicao")
    .order("ordem")
    .order("created_at");

  if (error) {
    return <ErrorState title="Falha ao carregar banners" detail={error.message} />;
  }

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Destaques da Indústria"
        subtitle="Banners exibidos na faixa do topo da home"
        count={banners?.length ?? 0}
      />

      <div className="mb-8 rounded-lg border border-line bg-surface p-4">
        <h2 className="mb-3 text-sm font-semibold text-ink">Novo banner</h2>
        <BannerDestaqueForm action={criarBannerDestaque} submitLabel="Adicionar banner" />
      </div>

      {!banners || banners.length === 0 ? (
        <EmptyState>Nenhum banner cadastrado ainda.</EmptyState>
      ) : (
        <div className="space-y-4">
          {banners.map((b) => (
            <div key={b.id} className="rounded-lg border border-line bg-surface p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-semibold text-ink">{b.titulo}</h3>
                <form action={excluirBannerDestaque}>
                  <input type="hidden" name="id" value={b.id} />
                  <button type="submit" className="text-xs font-medium text-erro hover:underline">
                    Excluir
                  </button>
                </form>
              </div>
              <BannerDestaqueForm
                action={atualizarBannerDestaque}
                id={b.id}
                titulo={b.titulo}
                imagemUrl={b.imagem_url}
                href={b.href}
                badge={b.badge ?? ""}
                ordem={b.ordem}
                posicao={b.posicao ?? "topo"}
                ativo={b.ativo}
                submitLabel="Salvar alterações"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
