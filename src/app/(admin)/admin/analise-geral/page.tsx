import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { ErrorState } from "@/components/ErrorState";
import { PageHeader, KpiCard } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

async function count(
  supabase: Awaited<ReturnType<typeof createClient>>,
  table: "lojas" | "produtos" | "pedidos" | "afiliacoes",
): Promise<number> {
  const { count } = await supabase.from(table).select("*", { count: "exact", head: true });
  return count ?? 0;
}

export default async function AnaliseGeralPage() {
  if (!isSupabaseConfigured) {
    return (
      <ErrorState
        title="Supabase não configurado"
        detail="Defina as variáveis do Supabase em web/.env.local."
      />
    );
  }

  const supabase = await createClient();
  // Contagens reais (head+count). Cross-seller depende da policy is_admin;
  // até lá os totais refletem só o escopo visível pela RLS.
  const [lojas, produtos, pedidos, afiliacoes] = await Promise.all([
    count(supabase, "lojas"),
    count(supabase, "produtos"),
    count(supabase, "pedidos"),
    count(supabase, "afiliacoes"),
  ]);

  return (
    <div>
      <PageHeader
        title="Análise Geral"
        subtitle="Totais agregados da plataforma (escopo visível pela RLS)"
      />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard label="Lojas" value={String(lojas)} />
        <KpiCard label="Produtos" value={String(produtos)} />
        <KpiCard label="Pedidos" value={String(pedidos)} />
        <KpiCard label="Afiliações" value={String(afiliacoes)} />
      </div>
      <p className="mt-4 text-xs text-neutral-400">
        {/* TODO: requer policy is_admin para números cross-seller reais */}
        Os totais consideram apenas o que a RLS atual expõe. Após a policy
        is_admin, refletirão a plataforma inteira.
      </p>
    </div>
  );
}
