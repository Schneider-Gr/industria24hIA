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
        <header className="flex h-14 items-center justify-between border-b border-neutral-200 px-6 dark:border-neutral-800">
          <span className="text-sm font-medium">
            {user ? `Bem-vindo, ${user.email}` : "Sessão não autenticada"}
          </span>
        </header>
        <main className="flex-1 bg-neutral-50 p-6 dark:bg-neutral-950">
          {children}
        </main>
      </div>
    </div>
  );
}
