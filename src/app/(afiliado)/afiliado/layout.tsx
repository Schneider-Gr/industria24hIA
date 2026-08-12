import { getUser } from "@/lib/auth";
import { PrecisaLogin } from "@/components/seller/states";
import { Sidebar } from "@/components/afiliado/Sidebar";

export default async function AfiliadoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();

  return (
    <div className="flex min-h-screen">
      <Sidebar />

      <main className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-borda py-4 pl-14 pr-6 md:pl-6">
          <p className="text-sm text-ink-secondary">
            {user ? `Bem-vindo, ${user.email}` : "Painel do afiliado"}
          </p>
        </header>

        <div className="flex-1 p-6">
          {!user ? <PrecisaLogin /> : children}
        </div>
      </main>
    </div>
  );
}
