import Link from "next/link";
import * as Sentry from "@sentry/nextjs";
import { VitrineHeader, VitrineFooter } from "@/components/vitrine/ui";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { ErrorState } from "@/components/ErrorState";
import { formatBRL } from "@/components/seller/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Favoritos" };

// Lista os favoritos do comprador — a tabela existe desde a migration 0096
// (o coração da galeria já grava nela), mas não havia tela para revê-los.
// RLS `favoritos_dono` já restringe ao próprio usuário; o filtro por user_id
// fica explícito assim mesmo, para a query não depender só da policy.
export default async function FavoritosPage() {
  if (!isSupabaseConfigured) return <ErrorState title="Supabase não configurado" />;

  const user = await getUser();
  if (!user) {
    return (
      <Shell>
        <ErrorState title="Faça login" detail="Entre para ver os produtos que você favoritou." />
        <p className="mt-3 text-center">
          <Link href="/login?next=/favoritos" className="text-lm-azul underline">
            Ir para o login
          </Link>
        </p>
      </Shell>
    );
  }

  const supabase = await createClient();
  type FavoritoComProduto = {
    produto_id: string;
    produtos: { id: string; nome: string; valor: number | null } | null;
  };
  let favoritos: FavoritoComProduto[] | null = null;
  try {
    ({ data: favoritos } = await supabase
      .from("favoritos")
      .select("produto_id, produtos ( id, nome, valor )")
      .eq("user_id", user.id)
      .order("criado_em", { ascending: false })
      .returns<FavoritoComProduto[]>());
  } catch (erro) {
    Sentry.captureException(erro, { tags: { area: "favoritos", step: "query" } });
    return (
      <Shell>
        <ErrorState
          title="Não foi possível carregar seus favoritos"
          detail="Houve uma falha temporária. Recarregue a página em instantes."
        />
      </Shell>
    );
  }

  const itens = (favoritos ?? []).filter((f) => f.produtos);

  return (
    <Shell>
      <h1 className="font-display text-2xl font-bold text-ink">Favoritos</h1>

      {itens.length === 0 ? (
        <div className="mt-6 rounded border border-line bg-white p-8 text-center">
          <p className="text-sm text-muted">
            Você ainda não favoritou nenhum produto. Toque no coração na página de um produto para
            guardá-lo aqui.
          </p>
          <p className="mt-3">
            <Link href="/" className="text-lm-azul underline underline-offset-2">
              Ir para a vitrine
            </Link>
          </p>
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {itens.map((f) => (
            <li key={f.produto_id}>
              <Link
                href={`/produto/${f.produto_id}`}
                className="flex items-center justify-between gap-3 rounded border border-line bg-white p-4 hover:border-lm-azul"
              >
                <p className="min-w-0 flex-1 font-semibold text-ink">{f.produtos!.nome}</p>
                <p className="num shrink-0 font-semibold text-ink">
                  {f.produtos!.valor != null ? formatBRL(f.produtos!.valor) : "—"}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-[#FAFAF9]">
      <VitrineHeader />
      <main className="mx-auto w-full max-w-[700px] flex-1 px-4 py-8 pb-24">{children}</main>
      <VitrineFooter />
    </div>
  );
}
