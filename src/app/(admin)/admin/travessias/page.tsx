import { createClient } from "@/lib/supabase/server";
import { ErrorState } from "@/components/ErrorState";
import { PageHeader } from "@/components/admin/ui";
import { FormTravessia, type TravessiaLinha } from "@/components/admin/FormTravessia";

export const dynamic = "force-dynamic";

// Tabela de travessias (0202, #804). A ANTAQ não publica as tarifas em arquivo
// importável: o admin mantém a tabela a partir dos documentos oficiais, com
// fonte e data, que o seller vê no simulador do avião.
export default async function TravessiasPage() {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- tabela da 0202 fora dos tipos gerados
  const { data, error } = await (supabase as any)
    .from("travessias")
    .select("id, nome, operador, valor_equivalente, fator_moto, fator_carro, fator_caminhao, fatores_oficiais, fonte_url, fonte_descricao, vigente_desde, ativo, atualizado_em")
    .order("nome");
  if (error) return <ErrorState title="Falha ao carregar as travessias" detail={error.message} />;

  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader
        title="Travessias"
        subtitle="Balsas e portos que o simulador do avião soma quando a rota atravessa o rio. Valor por veículo equivalente × fator do veículo, só de ida."
      />
      {((data ?? []) as TravessiaLinha[]).map((t) => (
        <FormTravessia key={t.id} travessia={t} />
      ))}
      <div>
        <h2 className="mb-2 text-sm font-semibold text-ink">Nova travessia</h2>
        <FormTravessia />
      </div>
    </div>
  );
}
