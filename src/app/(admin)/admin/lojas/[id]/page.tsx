import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { ErrorState } from "@/components/ErrorState";
import { PageHeader } from "@/components/admin/ui";
import { ModerarSituacaoLoja } from "@/components/admin/ModerarSituacaoLoja";
import { LojaForm } from "@/components/seller/LojaForm";
import { salvarLojaAdmin, salvarPisoKm } from "../actions";

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

      <form action={salvarPisoKm} className="mt-6 flex max-w-xl flex-wrap items-end gap-2 rounded-lg border border-line bg-surface p-6">
        <input type="hidden" name="id" value={loja.id} />
        <label className="block text-sm">
          <span className="text-ink-2">Piso por km do parceiro de entrega (R$)</span>
          <input
            name="piso_km_afiliado"
            type="number"
            min="0.01"
            step="0.01"
            required
            defaultValue={loja.piso_km_afiliado.toFixed(2)}
            className="mt-1 w-40 rounded border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-aco-600"
          />
        </label>
        <button type="submit" className="rounded bg-aco-600 px-4 py-2 text-sm font-semibold text-white">
          Salvar piso
        </button>
        <p className="w-full text-xs text-muted">
          O seller não consegue salvar valor por km abaixo deste piso. Produtos já abaixo dele saem do checkout até o seller corrigir.
        </p>
      </form>
    </div>
  );
}
