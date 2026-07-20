import { getUser } from "@/lib/auth";
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

  return (
    <SellerShell userLabel={userLabel} userEmail={user?.email}>
      {children}
    </SellerShell>
  );
}
