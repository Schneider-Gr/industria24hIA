import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { ErrorState } from "@/components/ErrorState";
import { PageHeader, StatusBadge, fmtBRL, fmtDate } from "@/components/admin/ui";
import { ModerarStatusProduto } from "@/components/admin/ModerarStatusProduto";
import { GaleriaProdutoAdmin } from "@/components/admin/GaleriaProdutoAdmin";

export const dynamic = "force-dynamic";

// Visão de detalhe: dá contexto (descrição, imagens) pra decidir a moderação
// sem precisar abrir outra ferramenta pra ver o produto.
export default async function ProdutoDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!isSupabaseConfigured) {
    return (
      <ErrorState
        title="Supabase não configurado"
        detail="Defina as variáveis do Supabase em web/.env.local."
      />
    );
  }

  const { id } = await params;
  const supabase = await createClient();

  // Leitura cross-seller garantida pela policy is_admin (migration 0004).
  const { data: produto, error } = await supabase
    .from("produtos")
    .select(
      "id, nome, descricao, valor, estoque_atual, status_produto, loja_id, sku, created_at",
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return <ErrorState title="Falha ao carregar produto" detail={error.message} />;
  }
  if (!produto) notFound();

  const [{ data: loja }, { data: imagens }] = await Promise.all([
    supabase.from("lojas").select("nome").eq("id", produto.loja_id).maybeSingle(),
    supabase
      .from("produto_imagens")
      .select("id, url")
      .eq("produto_id", produto.id)
      .order("ordem", { ascending: true }),
  ]);

  return (
    <div className="max-w-3xl">
      <Link href="/admin/produtos" className="mb-4 inline-block text-sm text-ink-2 hover:underline">
        ← Voltar pra Produtos
      </Link>
      <PageHeader title={produto.nome} subtitle={loja?.nome ?? "—"} />

      <div className="mb-6 grid grid-cols-2 gap-4 rounded border border-line p-4 sm:grid-cols-4">
        <div>
          <p className="text-xs text-ink-2">Valor</p>
          <p className="num font-semibold">{fmtBRL(produto.valor)}</p>
        </div>
        <div>
          <p className="text-xs text-ink-2">Estoque</p>
          <p className="num font-semibold">{produto.estoque_atual}</p>
        </div>
        <div>
          <p className="text-xs text-ink-2">Cadastrado em</p>
          <p>{fmtDate(produto.created_at)}</p>
        </div>
        <div>
          <p className="text-xs text-ink-2">Status</p>
          <StatusBadge status={produto.status_produto} />
        </div>
      </div>

      <div className="mb-6">
        <h2 className="mb-2 font-display text-sm font-semibold uppercase tracking-wide text-ink-2">
          Descrição
        </h2>
        <p className="whitespace-pre-wrap text-sm text-ink">
          {produto.descricao || "Sem descrição cadastrada."}
        </p>
      </div>

      <div className="mb-6">
        <h2 className="mb-2 font-display text-sm font-semibold uppercase tracking-wide text-ink-2">
          Galeria
        </h2>
        <GaleriaProdutoAdmin
          key={(imagens ?? []).map((img) => img.id).join(",")}
          produtoId={produto.id}
          lojaId={produto.loja_id}
          imagensIniciais={imagens ?? []}
        />
      </div>

      <div>
        <h2 className="mb-2 font-display text-sm font-semibold uppercase tracking-wide text-ink-2">
          Moderação
        </h2>
        <ModerarStatusProduto id={produto.id} status={produto.status_produto} />
      </div>
    </div>
  );
}
