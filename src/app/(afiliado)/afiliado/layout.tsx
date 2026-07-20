import { getUser } from "@/lib/auth";
import { PrecisaLogin } from "@/components/seller/states";
import { AfiliadoSidebar } from "@/components/afiliado/AfiliadoSidebar";
import { PortaoTermos } from "@/components/termos/PortaoTermos";
import { termosPendentes, TERMOS_AFILIADO } from "@/components/termos/gate";
import { sair } from "@/lib/auth-actions";

export default async function AfiliadoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();

  // Opt-in obrigatório: sem aceite, o painel não renderiza.
  const pendentes = await termosPendentes(TERMOS_AFILIADO);
  if (user && pendentes.length > 0) {
    return (
      <PortaoTermos
        documentos={pendentes}
        caminho="/afiliado"
        descricao="Antes de usar o painel do afiliado, confirme que leu e concorda com os termos abaixo."
      />
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <AfiliadoSidebar />

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-line bg-surface px-5 py-2.5">
          <span className="truncate text-xs tracking-[0.04em] text-muted">
            {user ? user.email : "Painel do afiliado"}
          </span>
          {user && (
            <form action={sair}>
              <button
                type="submit"
                className="flex items-center gap-1.5 text-xs tracking-[0.04em] text-aco-600 hover:underline"
              >
                <svg
                  viewBox="0 0 24 24"
                  width={15}
                  height={15}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.75}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <path d="M16 17l5-5-5-5M21 12H9" />
                </svg>
                Sair
              </button>
            </form>
          )}
        </header>

        <div className="flex-1 p-5">{!user ? <PrecisaLogin /> : children}</div>
      </main>
    </div>
  );
}
