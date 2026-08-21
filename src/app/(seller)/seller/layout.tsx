import { redirect } from "next/navigation";
import { getUser, getMinhaLoja } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SellerShell } from "@/components/seller/SellerShell";
import { PortaoTermos } from "@/components/termos/PortaoTermos";
import { termosPendentes, TERMOS_SELLER } from "@/components/termos/gate";

// Shell do painel do vendedor: sidebar off-canvas em mobile, fixa em md+.
export default async function SellerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();
  // Mesmo padrão de gate do admin: sem sessão, não entra no painel.
  if (!user) redirect("/login?next=/seller");
  const userLabel = `Bem-vindo, ${user.email}`;

  // Mesmos contadores da faixa "Precisa de você" do dashboard.
  const loja = await getMinhaLoja();
  // Autorização por papel: sem loja própria, o usuário não é seller — mesmo
  // logado, não entra no painel (era o vazamento: qualquer conta autenticada
  // renderizava o shell do seller, só sem dados, em vez de barrar o acesso).
  // Volta pro login com o slug de destino preservado em vez de cair calado
  // na home — a conta logada pode não ser a certa (ex.: admin sem loja).
  if (!loja) redirect("/login?next=/seller&erro=sem_loja");

  // Opt-in obrigatório: sem aceite, o painel não renderiza.
  const pendentes = await termosPendentes(TERMOS_SELLER);
  if (pendentes.length > 0) {
    return (
      <PortaoTermos
        documentos={pendentes}
        caminho="/seller"
        descricao="Antes de usar o painel do vendedor, confirme que leu e concorda com os termos abaixo."
      />
    );
  }

  const supabase = await createClient();
  const [
    { count: semEstoque },
    { count: afiliacoesPendentes },
    { count: aguardando },
    { count: mensagensNaoLidas },
    { count: disputasAguardando },
  ] = loja
    ? await Promise.all([
        supabase
          .from("produtos")
          .select("id", { count: "exact", head: true })
          .eq("loja_id", loja.id)
          .lte("estoque_atual", 0),
        supabase
          .from("afiliacoes")
          .select("id", { count: "exact", head: true })
          .eq("loja_id", loja.id)
          .neq("status", "Aprovada"),
        supabase
          .from("pedidos")
          .select("id", { count: "exact", head: true })
          .eq("loja_id", loja.id)
          .ilike("status_pedido", "%aguardando%"),
        supabase
          .from("mensagens")
          .select("id, conversas!inner(loja_id)", { count: "exact", head: true })
          .eq("conversas.loja_id", loja.id)
          .neq("autor_id", user?.id ?? "")
          .is("lida_em", null),
        // Loja "precisa de atenção" enquanto a disputa não foi decidida —
        // inclui em_mediacao_admin para não perder o alerta quando o
        // comprador recusa a proposta e escala (antes só contava aberta/
        // em_atendimento_loja, e a loja ficava sem sinal visual depois
        // disso, mesmo tendo canal privado de mediação ativo com ela).
        supabase
          .from("disputas")
          .select("id", { count: "exact", head: true })
          .eq("loja_id", loja.id)
          .in("status", ["aberta", "em_atendimento_loja", "em_mediacao_admin"]),
      ])
    : [{ count: 0 }, { count: 0 }, { count: 0 }, { count: 0 }, { count: 0 }];

  const badges = {
    "/seller/produtos": semEstoque ?? 0,
    "/seller/afiliados": afiliacoesPendentes ?? 0,
    "/seller/pedidos": aguardando ?? 0,
    "/seller/mensagens": mensagensNaoLidas ?? 0,
    "/seller/disputas": disputasAguardando ?? 0,
  };

  return (
    <SellerShell userLabel={userLabel} userEmail={user?.email} badges={badges}>
      {children}
    </SellerShell>
  );
}
