import { getUser, getMinhaLoja } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ErrorState } from "@/components/ErrorState";
import { KpiCard } from "@/components/seller/KpiCard";
import { PageTitle, PrecisaLogin, SemLoja } from "@/components/seller/states";

export const dynamic = "force-dynamic";

// Limites inspirados no painel de Reputação do Mercado Livre (ver
// docs/seller-module.md): cada indicador é medido sobre os pedidos da loja.
const LIMITE_CANCELAMENTO_PCT = 1.5;
const LIMITE_RECLAMACAO_PCT = 2;
const LIMITE_ENVIO_INCORRETO_PCT = 10;

function formatPct(valor: number) {
  return `${valor.toFixed(1).replace(".", ",")}%`;
}

export default async function ReputacaoPage() {
  const user = await getUser();
  if (!user) return <PrecisaLogin />;

  const loja = await getMinhaLoja();
  if (!loja) return <SemLoja />;

  const supabase = await createClient();

  const { data: pedidos, error: errPedidos } = await supabase
    .from("pedidos")
    .select("id, status_pedido")
    .eq("loja_id", loja.id);

  if (errPedidos) {
    return <ErrorState title="Falha ao carregar pedidos" detail={errPedidos.message} />;
  }

  const totalPedidos = pedidos?.length ?? 0;
  const cancelados = pedidos?.filter((p) => p.status_pedido === "Cancelado").length ?? 0;

  const { data: reclamacoes, error: errReclamacoes } = await supabase
    .from("reclamacoes")
    .select("id")
    .eq("loja_id", loja.id);

  if (errReclamacoes) {
    return <ErrorState title="Falha ao carregar reclamações" detail={errReclamacoes.message} />;
  }

  const ids = (pedidos ?? []).map((p) => p.id);
  const { data: linhas, error: errLinhas } = ids.length
    ? await supabase.from("linha_itens").select("id, pedido_id").in("pedido_id", ids)
    : { data: [], error: null };

  if (errLinhas) {
    return <ErrorState title="Falha ao carregar itens" detail={errLinhas.message} />;
  }

  const linhaIds = (linhas ?? []).map((l) => l.id);
  const { data: entregas, error: errEntregas } = linhaIds.length
    ? await supabase.from("entregas").select("linha_item_id, envio_correto").in("linha_item_id", linhaIds)
    : { data: [], error: null };

  if (errEntregas) {
    return <ErrorState title="Falha ao carregar entregas" detail={errEntregas.message} />;
  }

  const totalEntregas = entregas?.length ?? 0;
  const enviosIncorretos = entregas?.filter((e) => e.envio_correto === false).length ?? 0;

  const pctCancelamento = totalPedidos ? (cancelados / totalPedidos) * 100 : 0;
  const pctReclamacao = totalPedidos ? ((reclamacoes?.length ?? 0) / totalPedidos) * 100 : 0;
  const pctEnvioIncorreto = totalEntregas ? (enviosIncorretos / totalEntregas) * 100 : 0;

  return (
    <div>
      <PageTitle
        title="Reputação"
        subtitle="Indicadores calculados sobre os pedidos da sua loja, mesma métrica do Mercado Livre."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard
          label={`Reclamações (limite ${LIMITE_RECLAMACAO_PCT}%)`}
          value={formatPct(pctReclamacao)}
        />
        <KpiCard
          label={`Canceladas por você (limite ${LIMITE_CANCELAMENTO_PCT}%)`}
          value={formatPct(pctCancelamento)}
        />
        <KpiCard
          label={`Envios incorretos (limite ${LIMITE_ENVIO_INCORRETO_PCT}%)`}
          value={formatPct(pctEnvioIncorreto)}
        />
      </div>

      <p className="mt-6 text-sm text-muted">
        Cálculo com base em {totalPedidos} pedido{totalPedidos === 1 ? "" : "s"} da loja
        {totalEntregas > 0 ? ` e ${totalEntregas} entrega${totalEntregas === 1 ? "" : "s"} registrada${totalEntregas === 1 ? "" : "s"}` : ""}.
      </p>
    </div>
  );
}
