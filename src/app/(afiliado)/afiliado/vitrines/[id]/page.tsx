import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import { ErrorState } from "@/components/ErrorState";
import { PrecisaLogin, PageTitle } from "@/components/seller/states";
import { EmptyState } from "@/components/admin/ui";
import { notFound } from "next/navigation";
import {
  renomearVitrine,
  adicionarProdutoNaVitrine,
  removerProdutoDaVitrine,
} from "../actions";
import { CopiarLink } from "@/components/afiliado/CopiarLink";

const ORIGEM = "https://industria24.com.br";

export default async function VitrineDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getUser();
  if (!user) return <PrecisaLogin />;

  const supabase = await createClient();

  const { data: vitrine, error: vitrineError } = await supabase
    .from("afiliado_vitrines")
    .select("id, nome, slug")
    .eq("id", id)
    .eq("afiliado_id", user.id)
    .maybeSingle();

  if (vitrineError) {
    return <ErrorState title="Erro ao carregar coleção" detail={vitrineError.message} />;
  }
  if (!vitrine) notFound();

  const { data: itens, error: itensError } = await supabase
    .from("afiliado_vitrine_produtos")
    .select("id, produto_id, afiliacao_id, produtos(nome, valor)")
    .eq("vitrine_id", vitrine.id);

  if (itensError) {
    return <ErrorState title="Erro ao carregar produtos da coleção" detail={itensError.message} />;
  }

  const idsNaVitrine = new Set((itens ?? []).map((i) => i.afiliacao_id));

  // Afiliações do usuário elegíveis para entrar na coleção — não precisa ser
  // Aprovada (requirement "Montagem de coleção a partir de produtos afiliados").
  const { data: afiliacoes, error: afiliacoesError } = await supabase
    .from("afiliacoes")
    .select("id, produto_id, status, produtos(nome)")
    .eq("afiliado_id", user.id)
    .not("produto_id", "is", null);

  if (afiliacoesError) {
    return <ErrorState title="Erro ao carregar suas afiliações" detail={afiliacoesError.message} />;
  }

  const disponiveis = (afiliacoes ?? []).filter((a) => !idsNaVitrine.has(a.id));
  const urlPublica = `${ORIGEM}/vitrine-afiliado/${vitrine.slug}`;

  return (
    <div className="p-6">
      <PageTitle title={vitrine.nome} subtitle="Gerencie os produtos e o link público desta coleção" />

      <div className="mb-6 space-y-3">
        <form action={renomearVitrine} className="flex gap-2">
          <input type="hidden" name="vitrine_id" value={vitrine.id} />
          <input
            type="text"
            name="nome"
            defaultValue={vitrine.nome}
            required
            className="flex-1 rounded border border-borda px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="rounded border border-borda px-4 py-2 text-sm font-semibold text-ink hover:border-sinal"
          >
            Renomear
          </button>
        </form>

        <CopiarLink url={urlPublica} />
      </div>

      <h2 className="mb-2 font-display text-[17px] font-bold text-ink">Produtos na coleção</h2>
      {(itens ?? []).length === 0 ? (
        <EmptyState>Nenhum produto nesta coleção ainda.</EmptyState>
      ) : (
        <ul className="mb-6 space-y-2">
          {(itens ?? []).map((i) => (
            <li
              key={i.id}
              className="flex items-center justify-between rounded border border-borda p-2.5"
            >
              <span className="text-sm text-ink">
                {(i.produtos as unknown as { nome: string } | null)?.nome ?? "Produto removido"}
              </span>
              <form action={removerProdutoDaVitrine}>
                <input type="hidden" name="vitrine_id" value={vitrine.id} />
                <input type="hidden" name="item_id" value={i.id} />
                <button type="submit" className="text-xs font-medium text-vermelho hover:underline">
                  Remover
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}

      <h2 className="mb-2 font-display text-[17px] font-bold text-ink">Adicionar afiliação</h2>
      {disponiveis.length === 0 ? (
        <EmptyState>
          Nenhuma afiliação disponível para adicionar. Solicite afiliação a produtos em{" "}
          <a href="/afiliado/solicitar" className="underline">
            Solicitar afiliação
          </a>
          .
        </EmptyState>
      ) : (
        <ul className="space-y-2">
          {disponiveis.map((a) => (
            <li
              key={a.id}
              className="flex items-center justify-between rounded border border-borda p-2.5"
            >
              <span className="text-sm text-ink">
                {(a.produtos as unknown as { nome: string } | null)?.nome ?? "Produto removido"}{" "}
                <span className="text-xs text-secundario">({a.status})</span>
              </span>
              <form action={adicionarProdutoNaVitrine}>
                <input type="hidden" name="vitrine_id" value={vitrine.id} />
                <input type="hidden" name="afiliacao_id" value={a.id} />
                <button
                  type="submit"
                  className="rounded bg-sinal px-3 py-1.5 text-xs font-semibold text-white hover:bg-sinal-escuro"
                >
                  Adicionar
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
