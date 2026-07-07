import { getUser } from "@/lib/auth";
import { PrecisaLogin } from "@/components/seller/states";
import Link from "next/link";

export default async function AfiliadoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();

  return (
    <div className="flex min-h-screen">
      <aside className="w-[200px] shrink-0 bg-roxo-900 flex flex-col">
        <div className="px-4 py-5 border-b border-roxo-800">
          <p className="font-display font-bold text-white text-lg leading-tight">
            Indústria 24h
          </p>
          <p className="text-xs text-roxo-100 mt-1">Painel do afiliado</p>
        </div>
        <nav className="flex flex-col py-2">
          <Link
            href="/afiliado"
            className="px-4 py-2.5 text-sm text-roxo-100 hover:bg-roxo-800 transition-colors"
          >
            Minhas afiliações
          </Link>
          <Link
            href="/afiliado/solicitar"
            className="px-4 py-2.5 text-sm text-roxo-100 hover:bg-roxo-800 transition-colors"
          >
            Solicitar afiliação
          </Link>
        </nav>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-borda px-6 py-4">
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
