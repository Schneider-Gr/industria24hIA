import { getUser } from "@/lib/auth";
import { Sidebar } from "@/components/seller/Sidebar";

// Shell do painel do vendedor: sidebar fixa + header com o e-mail do logado.
export default async function SellerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();

  return (
    <div className="flex min-h-screen flex-1">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b border-line pl-14 pr-6 md:pl-6">
          <span className="text-sm font-medium text-ink">
            {user ? `Bem-vindo, ${user.email}` : "Sessão não autenticada"}
          </span>
        </header>
        <main className="flex-1 bg-surface p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
