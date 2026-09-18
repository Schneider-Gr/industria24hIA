import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { ErrorState } from "@/components/ErrorState";
import { PageHeader, Table, StatusBadge, EmptyState } from "@/components/admin/ui";
import { FulfillmentContent } from "./components/FulfillmentContent";

export const dynamic = "force-dynamic";

export default async function FulfillmentPage() {
  if (!isSupabaseConfigured) {
    return (
      <ErrorState
        title="Supabase não configurado"
        detail="Defina as variáveis do Supabase em web/.env.local."
      />
    );
  }

  const supabase = await createClient();

  // Buscar centro Indústria de Manaus
  const { data: centros, error: centroError } = await supabase
    .from("centros_distribuicao")
    .select("*")
    .eq("tipo", "industria");

  if (centroError) {
    return <ErrorState title="Falha ao carregar centros" detail={centroError.message} />;
  }

  // Se não há centro do tipo industria, mostrar mensagem
  if (!centros || centros.length === 0) {
    return (
      <div>
        <PageHeader
          title="Fulfillment - Gestão do CD"
          subtitle="Operação do centro de distribuição"
        />
        <EmptyState>
          Nenhum centro de distribuição do tipo "industria" cadastrado. Crie um centro antes de prosseguir.
        </EmptyState>
      </div>
    );
  }

  // Para o MVP, pegar o primeiro centro (esperado: Manaus)
  const centro = centros[0];

  // Buscar dados necesários
  const [
    { data: lojasPiloto },
    { data: posicoes },
    { data: reservas },
    { data: saldoCentro },
    { data: saldosEndereco }
  ] = await Promise.all([
    supabase
      .from("cd_lojas_piloto")
      .select("loja_id, centro_id, criado_em, criado_por")
      .eq("centro_id", centro.id),
    supabase
      .from("estoque_enderecos")
      .select("id, centro_id, endereco, bloqueado")
      .eq("centro_id", centro.id),
    supabase
      .from("estoque_reservas")
      .select("id, pedido_id, produto_id, quantidade, status")
      .eq("centro_id", centro.id)
      .in("status", ["ativa", "confirmada"]),
    supabase
      .from("estoque_saldos")
      .select("produto_id, centro_id, quantidade")
      .eq("centro_id", centro.id),
    supabase
      .from("estoque_saldos_endereco")
      .select("endereco_id, produto_id, quantidade")
  ]);

  return (
    <div>
      <PageHeader
        title="Fulfillment - Gestão do CD"
        subtitle="Operação do centro de distribuição"
      />

      <FulfillmentContent
        centro={centro}
        lojasPiloto={lojasPiloto ?? []}
        posicoes={posicoes ?? []}
        reservas={reservas ?? []}
        saldoCentro={saldoCentro ?? []}
        saldosEndereco={saldosEndereco ?? []}
      />
    </div>
  );
}
