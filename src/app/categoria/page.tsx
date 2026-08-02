import Link from "next/link";
import { VitrineHeader, VitrineFooter } from "@/components/vitrine/ui";
import { IconeCategoria } from "@/components/vitrine/icones-categoria";
import { createPublicClient } from "@/lib/supabase/public";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { ErrorState } from "@/components/ErrorState";

// Destino da aba "Categorias" da tab bar mobile — grid tocável de todas as
// categorias, mesma fonte de dados do MegaMenuCategorias (tabela `categorias`
// já existente, nenhuma coluna nova).
export const revalidate = 300;

export default async function CategoriasIndexPage() {
  if (!isSupabaseConfigured) {
    return (
      <ErrorState
        title="Supabase não configurado"
        detail="Defina as variáveis do Supabase em web/.env.local (ou nas env vars da Vercel em produção)."
      />
    );
  }

  const supabase = createPublicClient();
  const { data: categorias, error } = await supabase
    .from("categorias")
    .select("id, nome")
    .order("nome");

  return (
    <div className="flex min-h-screen flex-col">
      <VitrineHeader />
      <main className="flex-1 bg-surface pb-20 md:pb-0">
        <div className="mx-auto max-w-5xl px-4 py-6">
          <h1 className="mb-4 text-lg font-semibold text-ink">Categorias</h1>
          {error ? (
            <p className="text-sm text-muted">Não foi possível carregar as categorias agora.</p>
          ) : !categorias?.length ? (
            <p className="text-sm text-muted">Nenhuma categoria disponível.</p>
          ) : (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {categorias.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/categoria/${c.id}`}
                    className="flex flex-col items-center gap-2 rounded-md border border-line bg-white p-4 text-center transition-colors active:bg-lm-azul/5"
                  >
                    <IconeCategoria nome={c.nome} className="h-7 w-7 text-lm-azul" />
                    <span className="text-[13px] font-medium leading-tight text-ink-2">{c.nome}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
      <VitrineFooter />
    </div>
  );
}
