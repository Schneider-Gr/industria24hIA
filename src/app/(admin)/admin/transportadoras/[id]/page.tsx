import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { ErrorState } from "@/components/ErrorState";
import { PageHeader, Table, EmptyState, StatusBadge } from "@/components/admin/ui";
import { alternarFaixaFrete } from "../actions";

export const dynamic = "force-dynamic";

// Gestão de faixas por transportadora (spec admin-transportadoras/
// gestao-faixas): listar e desativar faixas de transportadora_faixas_frete
// (0145), incluindo overrides de loja (loja_id preenchido, ver spec
// seller-transportadoras/override-tabela-frete) em modo leitura pro admin.
export default async function FaixasTransportadoraPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!isSupabaseConfigured) {
    return (
      <ErrorState
        title="Supabase não configurado"
        detail="Defina as variáveis do Supabase em web/.env.local."
      />
    );
  }

  const supabase = await createClient();
  const [{ data: transportadora }, { data: faixas, error }] = await Promise.all([
    supabase.from("transportadoras").select("id, nome").eq("id", id).maybeSingle(),
    supabase
      .from("transportadora_faixas_frete")
      .select("id, cep_destino_inicial, cep_destino_final, peso_min, peso_max, valor, ativo, loja_id, lojas(nome)")
      .eq("transportadora_id", id)
      .order("cep_destino_inicial"),
  ]);

  if (error) {
    return <ErrorState title="Falha ao carregar faixas" detail={error.message} />;
  }
  if (!transportadora) {
    return <ErrorState title="Transportadora não encontrada" detail={id} />;
  }

  const linhas = faixas ?? [];

  return (
    <div>
      <Link href="/admin/transportadoras" className="mb-2 inline-block text-xs text-muted hover:underline">
        ← Transportadoras
      </Link>
      <PageHeader
        title={`Faixas de frete — ${transportadora.nome}`}
        subtitle="Faixas globais e overrides de loja (leitura)"
        count={linhas.length}
      />

      {linhas.length === 0 ? (
        <EmptyState>Nenhuma faixa importada para esta transportadora.</EmptyState>
      ) : (
        <Table headers={["CEP destino", "Peso (kg)", "Valor", "Origem", "Status", ""]}>
          {linhas.map((f) => (
            <tr key={f.id} className="text-ink dark:text-ink-2">
              <td className="px-4 py-[9px] text-sm">
                {f.cep_destino_inicial}–{f.cep_destino_final}
              </td>
              <td className="px-4 py-[9px] text-sm">
                {f.peso_min}–{f.peso_max}
              </td>
              <td className="px-4 py-[9px] text-sm">R$ {Number(f.valor).toFixed(2)}</td>
              <td className="px-4 py-[9px] text-sm text-muted">
                {f.loja_id ? (f.lojas?.nome ?? "Loja") : "Global"}
              </td>
              <td className="px-4 py-[9px]">
                <StatusBadge status={f.ativo ? "Ativa" : "Inativa"} />
              </td>
              <td className="px-4 py-[9px] text-right">
                <form action={alternarFaixaFrete} className="inline">
                  <input type="hidden" name="id" value={f.id} />
                  <input type="hidden" name="ativo" value={String(f.ativo)} />
                  <input type="hidden" name="transportadora_id" value={id} />
                  <button
                    type="submit"
                    className="rounded border border-line px-2 py-1 text-xs hover:bg-surface"
                  >
                    {f.ativo ? "Desativar" : "Ativar"}
                  </button>
                </form>
              </td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}
