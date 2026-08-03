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
  const [
    { count: semEstoque },
    { count: afiliacoesPendentes },
    { count: aguardando },
    { count: mensagensNaoLidas },
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
      ])
    : [{ count: 0 }, { count: 0 }, { count: 0 }, { count: 0 }];

  const badges = {
    "/seller/produtos": semEstoque ?? 0,
    "/seller/afiliados": afiliacoesPendentes ?? 0,
    "/seller/pedidos": aguardando ?? 0,
    "/seller/mensagens": mensagensNaoLidas ?? 0,
  };

  return (
    <SellerShell userLabel={userLabel} userEmail={user?.email} badges={badges}>
      {children}
    </SellerShell>
  );
}
