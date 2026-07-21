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
  const userLabel = user ? `Bem-vindo, ${user.email}` : "Sessão não autenticada";

  // Opt-in obrigatório: sem aceite, o painel não renderiza.
  const pendentes = await termosPendentes(TERMOS_SELLER);
  if (user && pendentes.length > 0) {
    return (
      <PortaoTermos
        documentos={pendentes}
        caminho="/seller"
        descricao="Antes de usar o painel do vendedor, confirme que leu e concorda com os termos abaixo."
      />
    );
  }

  // Mesmos contadores da faixa "Precisa de você" do dashboard.
  const loja = await getMinhaLoja();
  const supabase = await createClient();
  const [{ count: semEstoque }, { count: afiliacoesPendentes }, { count: aguardando }] = loja
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
      ])
    : [{ count: 0 }, { count: 0 }, { count: 0 }];

  const badges = {
    "/seller/produtos": semEstoque ?? 0,
    "/seller/afiliados": afiliacoesPendentes ?? 0,
    "/seller/pedidos": aguardando ?? 0,
  };

  return (
    <SellerShell userLabel={userLabel} userEmail={user?.email} badges={badges}>
      {children}
    </SellerShell>
  );
}
