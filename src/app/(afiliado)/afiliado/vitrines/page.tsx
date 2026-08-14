import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import { ErrorState } from "@/components/ErrorState";
import { PrecisaLogin, PageTitle } from "@/components/seller/states";
import { EmptyState } from "@/components/admin/ui";
import Link from "next/link";
import { criarVitrine } from "./actions";

export default async function VitrinesPage() {
  const user = await getUser();
  if (!user) return <PrecisaLogin />;

  const supabase = await createClient();
  const { data: vitrines, error } = await supabase
    .from("afiliado_vitrines")
    .select("id, nome, slug, criado_em")
    .eq("afiliado_id", user.id)
    .order("criado_em", { ascending: false });

  if (error) {
    return <ErrorState title="Erro ao carregar coleções" detail={error.message} />;
  }

  return (
    <div className="p-6">
      <PageTitle
        title="Minha vitrine curada"
        subtitle="Monte coleções de produtos afiliados e divulgue com um único link"
      />

      <form action={criarVitrine} className="mb-6 flex gap-2">
        <input
          type="text"
          name="nome"
          required
          placeholder="Nome da coleção (ex.: Ferramentas para obra)"
          className="flex-1 rounded border border-borda px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="rounded bg-sinal px-4 py-2 text-sm font-semibold text-white hover:bg-sinal-escuro"
        >
          Criar coleção
        </button>
      </form>

      {!vitrines || vitrines.length === 0 ? (
        <EmptyState>Você ainda não criou nenhuma coleção.</EmptyState>
      ) : (
        <ul className="space-y-2">
          {vitrines.map((v) => (
            <li key={v.id}>
              <Link
                href={`/afiliado/vitrines/${v.id}`}
                className="block rounded border border-borda p-3 hover:border-sinal"
              >
                <p className="font-semibold text-ink">{v.nome}</p>
                <p className="text-xs text-secundario">/vitrine-afiliado/{v.slug}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
