import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { ErrorState } from "@/components/ErrorState";
import { PageHeader, Table, EmptyState, StatusBadge } from "@/components/admin/ui";
import { FormTransportadora } from "@/components/seller/transportadoras/FormTransportadora";
import { alternarFaixaFrete, salvarTransportadora } from "../actions";

export const dynamic = "force-dynamic";

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// Edição da global e faixas de qualquer transportadora (global ou de loja,
// esta em leitura para o cadastro). Spec admin-transportadoras/
// transportadora-global e tabela-frete.
export default async function FaixasTransportadoraPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!isSupabaseConfigured) {
    return <ErrorState title="Supabase não configurado" detail="Defina as variáveis do Supabase em web/.env.local." />;
  }

  const supabase = await createClient();
  const [{ data: t }, { data: faixas, error }] = await Promise.all([
    supabase
      .from("transportadoras")
      .select(
        "id, nome, loja_id, codigo_referencia, peso_min, peso_max, valor_min, valor_max, altura_max, largura_max, comprimento_max, fator_cubagem, url_rastreio, prazo_dias, encerra_em, lojas(nome)",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("transportadora_faixas_frete")
      .select(
        "id, cep_origem_inicial, cep_origem_final, cep_destino_inicial, cep_destino_final, peso_min, peso_max, valor, prazo_min, prazo_max, kg_adicional, frete_minimo, ativo",
      )
      .eq("transportadora_id", id)
      .order("cep_destino_inicial")
      .order("peso_min")
      .limit(1000),
  ]);

  if (error) return <ErrorState title="Falha ao carregar faixas" detail={error.message} />;
  if (!t) return <ErrorState title="Transportadora não encontrada" detail={id} />;

  const linhas = faixas ?? [];
  const global = t.loja_id === null;

  return (
    <div className="flex flex-col gap-6">
      <Link href="/admin/transportadoras" className="text-xs text-muted hover:underline">
        ← Transportadoras
      </Link>
      <PageHeader
        title={t.nome}
        subtitle={global ? "Transportadora global" : `Transportadora da loja ${t.lojas?.nome ?? ""}`}
        count={linhas.length}
      />

      {global && (
        <section className="rounded-lg border border-line bg-surface p-4">
          <h2 className="mb-3 text-sm font-semibold">Dados da global</h2>
          <FormTransportadora
            action={salvarTransportadora}
            valores={t}
            extra={
              <label className="text-sm">
                <span className="mb-1 block text-xs text-muted">Encerra em</span>
                <input
                  type="date"
                  name="encerra_em"
                  defaultValue={t.encerra_em ?? ""}
                  className="rounded border border-line bg-surface px-2 py-1 text-sm outline-none focus:border-roxo-800"
                />
              </label>
            }
          />
        </section>
      )}

      <section>
        <h2 className="mb-2 text-sm font-semibold">Faixas de frete</h2>
        {linhas.length === 0 ? (
          <EmptyState>Nenhuma faixa para esta transportadora.</EmptyState>
        ) : (
          <Table headers={["CEP destino", "Origem", "Peso (kg)", "Valor", "Prazo", "Kg adic.", "Mínimo", "Status", ""]}>
            {linhas.map((f) => (
              <tr key={f.id} className="text-ink dark:text-ink-2">
                <td className="px-4 py-[9px] text-sm">
                  {f.cep_destino_inicial}–{f.cep_destino_final}
                </td>
                <td className="px-4 py-[9px] text-sm text-muted">
                  {f.cep_origem_inicial === null ? "qualquer" : `${f.cep_origem_inicial}–${f.cep_origem_final}`}
                </td>
                <td className="px-4 py-[9px] text-sm">
                  {f.peso_min}–{f.peso_max}
                </td>
                <td className="px-4 py-[9px] text-sm">{brl(Number(f.valor))}</td>
                <td className="px-4 py-[9px] text-sm">
                  {f.prazo_max === null ? "a combinar" : `${f.prazo_min ?? 0} a ${f.prazo_max} d.u.`}
                </td>
                <td className="px-4 py-[9px] text-sm">{brl(Number(f.kg_adicional))}</td>
                <td className="px-4 py-[9px] text-sm">{brl(Number(f.frete_minimo))}</td>
                <td className="px-4 py-[9px]">
                  <StatusBadge status={f.ativo ? "Ativa" : "Inativa"} />
                </td>
                <td className="px-4 py-[9px] text-right">
                  <form action={alternarFaixaFrete} className="inline">
                    <input type="hidden" name="id" value={f.id} />
                    <input type="hidden" name="ativo" value={String(f.ativo)} />
                    <input type="hidden" name="transportadora_id" value={id} />
                    <button type="submit" className="rounded border border-line px-2 py-1 text-xs hover:bg-surface">
                      {f.ativo ? "Desativar" : "Ativar"}
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </Table>
        )}
        {linhas.length === 1000 && <p className="mt-1 text-xs text-muted">Mostrando as 1.000 primeiras faixas.</p>}
      </section>
    </div>
  );
}
