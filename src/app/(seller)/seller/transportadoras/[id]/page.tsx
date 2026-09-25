import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMinhaLoja } from "@/lib/auth";
import { PageTitle, SemLoja } from "@/components/seller/states";
import { EmptyState, Table } from "@/components/admin/ui";
import { FormTransportadora } from "@/components/seller/transportadoras/FormTransportadora";
import { CategoriasTransportadora } from "@/components/seller/transportadoras/CategoriasTransportadora";
import { carregarPais } from "@/lib/transportadoras/arvore";
import { contarCobertos } from "@/lib/transportadoras/pendencias";
import { salvarTransportadoraPropria, salvarCategorias, buscarNosTaxonomia, alternarFaixaPropria } from "../actions";

export const dynamic = "force-dynamic";

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default async function TransportadoraPropriaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const loja = await getMinhaLoja();
  if (!loja) return <SemLoja />;

  const supabase = await createClient();
  const { data: t } = await supabase
    .from("transportadoras")
    .select(
      "id, nome, codigo_referencia, peso_min, peso_max, valor_min, valor_max, altura_max, largura_max, comprimento_max, fator_cubagem, url_rastreio, prazo_dias, desativada_por_admin, motivo_desativacao, revisar_categorias",
    )
    .eq("id", id)
    .eq("loja_id", loja.id)
    .maybeSingle();
  if (!t) notFound();

  const [{ data: faixas }, { data: ligados }, { data: produtos }] = await Promise.all([
    supabase
      .from("transportadora_faixas_frete")
      .select(
        "id, cep_origem_inicial, cep_origem_final, cep_destino_inicial, cep_destino_final, peso_min, peso_max, valor, prazo_min, prazo_max, ativo",
      )
      .eq("transportadora_id", id)
      .order("cep_destino_inicial")
      .order("peso_min")
      .limit(500),
    supabase.from("transportadora_nos").select("taxonomia_no_id, taxonomia_nos(id, nome, caminho)").eq("transportadora_id", id),
    supabase.from("produtos").select("id, taxonomia_no_id").eq("loja_id", loja.id).eq("status_produto", "Aprovado"),
  ]);

  const iniciais = (ligados ?? [])
    .map((l) => l.taxonomia_nos)
    .filter((n): n is { id: string; nome: string; caminho: string } => !!n)
    .map((n) => ({ id: n.id, nome: n.nome, caminho: n.caminho || n.nome }));
  const listaProdutos = (produtos ?? []).map((p) => ({ taxonomiaNoId: p.taxonomia_no_id }));
  const pais = await carregarPais(supabase, [
    ...listaProdutos.map((p) => p.taxonomiaNoId).filter((x): x is string => !!x),
    ...iniciais.map((n) => n.id),
  ]);
  const contagem = Object.fromEntries(iniciais.map((n) => [n.id, contarCobertos(n.id, listaProdutos, pais)]));

  return (
    <div className="flex flex-col gap-6">
      <Link href="/seller/transportadoras" className="text-xs text-muted hover:underline">
        ← Transportadoras
      </Link>
      <PageTitle title={t.nome} subtitle="Dados, categorias atendidas e faixas de frete" />

      {t.desativada_por_admin && (
        <p className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          Desativada pelo admin: {t.motivo_desativacao ?? "sem motivo informado"}. Só o admin pode reativar.
        </p>
      )}

      <section className="rounded-lg border border-line bg-surface p-4">
        <h2 className="mb-3 text-sm font-semibold">Dados da transportadora</h2>
        <FormTransportadora action={salvarTransportadoraPropria} valores={t} />
      </section>

      <section className="rounded-lg border border-line bg-surface p-4">
        <h2 className="mb-1 text-sm font-semibold">Categorias que ela leva</h2>
        {t.revisar_categorias && (
          <p className="mb-2 text-xs text-amber-700">
            Uma categoria desta transportadora foi removida da árvore. Revise e salve.
          </p>
        )}
        <CategoriasTransportadora
          transportadoraId={t.id}
          iniciais={iniciais}
          contagem={contagem}
          buscar={buscarNosTaxonomia}
          salvar={salvarCategorias}
        />
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold">Faixas de frete</h2>
        {(faixas ?? []).length === 0 ? (
          <EmptyState>Sem tabela: esta transportadora não aparece no checkout. Suba a tabela na página anterior.</EmptyState>
        ) : (
          <Table headers={["CEP destino", "Origem", "Peso (kg)", "Valor", "Prazo", "Status", ""]}>
            {(faixas ?? []).map((f) => (
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
                <td className="px-4 py-[9px] text-sm">{brl(f.valor)}</td>
                <td className="px-4 py-[9px] text-sm">
                  {f.prazo_max === null ? "a combinar" : `${f.prazo_min ?? 0} a ${f.prazo_max} dias úteis`}
                </td>
                <td className="px-4 py-[9px] text-sm">{f.ativo ? "Ativa" : "Desligada"}</td>
                <td className="px-4 py-[9px] text-right">
                  {!t.desativada_por_admin && (
                    <form action={alternarFaixaPropria}>
                      <input type="hidden" name="id" value={f.id} />
                      <input type="hidden" name="transportadora_id" value={t.id} />
                      <input type="hidden" name="ativo" value={String(f.ativo)} />
                      <button type="submit" className="rounded border border-line px-2 py-1 text-xs hover:bg-surface">
                        {f.ativo ? "Desligar" : "Religar"}
                      </button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </Table>
        )}
        {(faixas ?? []).length === 500 && (
          <p className="mt-1 text-xs text-muted">Mostrando as 500 primeiras faixas.</p>
        )}
      </section>
    </div>
  );
}
