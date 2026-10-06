import { getUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ErrorState } from "@/components/ErrorState";
import { PageTitle, PrecisaLogin } from "@/components/seller/states";
import { ConfigAfiliadoForm } from "@/components/afiliado/ConfigAfiliadoForm";
import { ZonaEntregadorForm } from "@/components/afiliado/ZonaEntregadorForm";
import { zonaDasLinhas, type LinhaZona } from "@/lib/logistica-parceiro/zonas";

export const dynamic = "force-dynamic";

// Aba "Configurações" do painel /afiliadologistica do Bubble.
export default async function ConfiguracoesAfiliadoLogisticaPage() {
  const user = await getUser();
  if (!user) return <PrecisaLogin />;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("parceiros_logisticos")
    .select("nome, cep_base, cidade, bairro, numero, telefone, veiculo, capacidade_kg, valor_minimo_entrega")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) return <ErrorState title="Falha ao carregar suas configurações" detail={error.message} />;

  const { data: linhasZona, error: erroZona } = await supabase
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- tabela da 0214 fora dos tipos gerados
    .from("entregador_zonas" as any)
    .select("tipo, valor")
    .eq("user_id", user.id);
  if (erroZona) return <ErrorState title="Falha ao carregar sua zona de entrega" detail={erroZona.message} />;
  const zona = zonaDasLinhas((linhasZona ?? []) as unknown as LinhaZona[]);

  return (
    <div className="max-w-2xl space-y-6">
      <PageTitle title="Configurações" subtitle="Seus dados de entrega como afiliado logístico" />
      <ConfigAfiliadoForm atual={data} nomePadrao={user.email ?? ""} />
      <ZonaEntregadorForm bairros={zona.bairros} prefixos={zona.prefixos} />
    </div>
  );
}
