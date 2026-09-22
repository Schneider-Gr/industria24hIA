import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { ErrorState } from "@/components/ErrorState";
import { PageHeader, EmptyState } from "@/components/admin/ui";
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
          Nenhum centro de distribuição do tipo &quot;industria&quot; cadastrado. Crie um centro antes de prosseguir.
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
    { data: saldosEndereco },
    { data: lojas },
    { data: produtos }
  ] = await Promise.all([
    supabase
      .from("cd_lojas_piloto")
      .select("loja_id, centro_id, criado_em, criado_por")
      .eq("centro_id", centro.id),
    supabase
      .from("estoque_enderecos")
      .select("id, centro_id, codigo, bloqueado")
      .eq("centro_id", centro.id),
    supabase
      // estoque_reservas não tem centro_id: a reserva é do produto, e o centro
      // se resolve pelo produto. Lista as reservas abertas de todos os centros.
      .from("estoque_reservas")
      .select("id, pedido_id, produto_id, quantidade, status")
      .in("status", ["ativa", "confirmada"]),
    supabase
      .from("estoque_saldos")
      .select("produto_id, centro_id, quantidade")
      .eq("centro_id", centro.id),
    supabase
      .from("estoque_saldos_endereco")
      .select("endereco_id, produto_id, quantidade"),
    // Nome no lugar de UUID nos formulários e nas listas. 22 lojas e 223
    // produtos em produção: cabe num <select>, não precisa de busca.
    supabase.from("lojas").select("id, nome").order("nome"),
    supabase.from("produtos").select("id, nome, loja_id").order("nome")
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
        lojas={lojas ?? []}
        produtos={produtos ?? []}
      />
    </div>
  );
}
