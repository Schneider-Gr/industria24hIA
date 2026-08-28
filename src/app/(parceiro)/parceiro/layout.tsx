import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import Link from "next/link";

export default async function ParceiroLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();
  // Mesmo padrão de gate do admin/seller: sem sessão, redireciona pro login
  // preservando o destino — antes o shell + sidebar renderizavam pra qualquer
  // um, com um <PrecisaLogin /> solto no meio. O caso "logado sem cadastro de
  // parceiro" fica na própria página (link pra /parceiro/cadastro, que também
  // vive sob este layout — por isso o gate aqui é só de sessão).
  if (!user) redirect("/login?next=/parceiro");

  return (
    <div className="flex min-h-screen">
      <aside className="w-[200px] shrink-0 bg-aco-900 flex flex-col">
        <div className="px-4 py-5 border-b border-aco-800">
          <p className="font-display font-bold text-white text-lg leading-tight">
            Indústria 24h
          </p>
          <p className="text-xs text-white/70 mt-1">Parceiro logístico</p>
        </div>
        <nav className="flex flex-col py-2">
          <Link
            href="/parceiro"
            className="px-4 py-2.5 text-sm text-white/70 hover:bg-aco-800 transition-colors"
          >
            Corridas
          </Link>
          <Link
            href="/parceiro/cadastro"
            className="px-4 py-2.5 text-sm text-white/70 hover:bg-aco-800 transition-colors"
          >
            Meu cadastro
          </Link>
          <Link
            href="/afiliado/logistica"
            className="px-4 py-2.5 text-sm text-white/70 hover:bg-aco-800 transition-colors"
          >
            Entregas (afiliado)
          </Link>
        </nav>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-borda px-6 py-4">
          <p className="text-sm text-ink-secondary">Bem-vindo, {user.email}</p>
        </header>

        <div className="flex-1 p-6">{children}</div>
      </main>
    </div>
  );
}
