import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { ErrorState } from "@/components/ErrorState";
import { PageHeader } from "@/components/admin/ui";
import { ModerarSituacaoLoja } from "@/components/admin/ModerarSituacaoLoja";
import { LojaForm } from "@/components/seller/LojaForm";
import { salvarLojaAdmin } from "../actions";

export const dynamic = "force-dynamic";

// Edição cadastral da loja pelo admin. Reusa o formulário do seller com a
// action de admin (a chave PIX continua fora — só pelo RPC auditado).
export default async function LojaDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!isSupabaseConfigured) {
    return (
      <ErrorState
        title="Supabase não configurado"
        detail="Defina as variáveis do Supabase em web/.env.local."
      />
    );
  }

  const { id } = await params;
  const supabase = await createClient();
  const { data: loja, error } = await supabase
    .from("lojas")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return <ErrorState title="Falha ao carregar loja" detail={error.message} />;
  }
  if (!loja) notFound();

  return (
    <div>
      <Link href="/admin/lojas" className="mb-4 inline-block text-sm text-ink-2 hover:underline">
        ← Voltar pra Lojas
      </Link>
      <PageHeader title={loja.nome} subtitle="Dados cadastrais da loja" />

      <div className="mb-6 flex flex-wrap items-center gap-4 text-sm">
        <ModerarSituacaoLoja id={loja.id} situacao={loja.situacao} />
        <Link href={`/loja/${loja.id}`} target="_blank" className="text-ink-2 hover:underline">
          Visualizar loja →
        </Link>
        <span className="text-ink-2">
          Proprietário: <span className="font-mono text-xs">{loja.owner_id}</span>
        </span>
      </div>

      <LojaForm loja={loja} salvarAction={salvarLojaAdmin} />
    </div>
  );
}
