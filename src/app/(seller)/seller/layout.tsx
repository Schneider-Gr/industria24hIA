import { getUser } from "@/lib/auth";
import { SellerShell } from "@/components/seller/SellerShell";

// Shell do painel do vendedor: sidebar off-canvas em mobile, fixa em md+.
export default async function SellerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();
  const userLabel = user ? `Bem-vindo, ${user.email}` : "Sessão não autenticada";

  return (
    <SellerShell userLabel={userLabel} userEmail={user?.email}>
      {children}
    </SellerShell>
  );
}
