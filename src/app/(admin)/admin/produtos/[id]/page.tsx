import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { ErrorState } from "@/components/ErrorState";
import { PageHeader, StatusBadge, fmtBRL, fmtDate } from "@/components/admin/ui";
import { ModerarStatusProduto } from "@/components/admin/ModerarStatusProduto";
import { GaleriaProdutoAdmin } from "@/components/admin/GaleriaProdutoAdmin";
import { CuradoriaProduto } from "@/components/admin/CuradoriaProduto";
import { ProdutoForm } from "@/components/seller/ProdutoForm";
import { SugestoesIA } from "@/components/admin/SugestoesIA";
import { salvarProdutoAdmin } from "./actions";

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
      "id, nome, descricao, valor, estoque_atual, status_produto, loja_id, sku, created_at, quantidade_minima, cep_produto, categoria_id, subcategoria_id, permite_afiliacao, porcentagem_afiliado, permite_logistica_afiliado, altura, comprimento, largura, peso, frete_gratis",
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return <ErrorState title="Falha ao carregar produto" detail={error.message} />;
  }
  if (!produto) notFound();

  const [
    { data: loja },
    { data: imagens },
    { data: curadoria },
    { data: categorias },
    { data: subcategorias },
    { data: sugestoesIA },
  ] = await Promise.all([
    supabase.from("lojas").select("nome, email").eq("id", produto.loja_id).maybeSingle(),
    supabase
      .from("produto_imagens")
      .select("id, url")
      .eq("produto_id", produto.id)
      .order("ordem", { ascending: true }),
    supabase
      .from("produto_curadoria")
      .select("id, decisao, observacao, created_at")
      .eq("produto_id", produto.id)
      .order("created_at", { ascending: false }),
    supabase.from("categorias").select("id, nome").order("nome"),
    supabase.from("subcategorias").select("id, nome, categoria_id").order("nome"),
    supabase
      .from("produto_sugestoes_ia")
      .select("id, tipo, conteudo, motivo, created_at")
      .eq("produto_id", produto.id)
      .eq("status", "pendente")
      .order("created_at", { ascending: false }),
  ]);

  const rotuloDecisao: Record<string, string> = {
    aprovado: "Aprovado",
    reprovado: "Reprovado",
    sugestao: "Ajustes sugeridos",
  };

  return (
    <div className="max-w-3xl">
      <Link href="/admin/produtos" className="mb-4 inline-block text-sm text-ink-2 hover:underline">
        ← Voltar pra Produtos
      </Link>
      <PageHeader title={produto.nome} subtitle={loja?.nome ?? "—"} />

      <p className="mb-4 text-sm">
        <Link
          href={`/produto/${produto.id}`}
          target="_blank"
          className="text-aco-600 hover:underline"
        >
          Ver publicação do vendedor ↗
        </Link>
        {loja?.email && <span className="ml-3 text-ink-2">Contato: {loja.email}</span>}
      </p>

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

      <SugestoesIA produtoId={produto.id} sugestoes={sugestoesIA ?? []} />

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
          Editar dados do produto
        </h2>
        {/* Mesmo formulário do seller; o admin salva por action própria
            (sem filtro de dono), autorizada pela policy is_admin. */}
        <ProdutoForm
          categorias={categorias ?? []}
          subcategorias={subcategorias ?? []}
          centros={[]}
          produto={produto}
          salvarAction={salvarProdutoAdmin}
        />
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

      <div className="mb-6">
        <h2 className="mb-2 font-display text-sm font-semibold uppercase tracking-wide text-ink-2">
          Curadoria
        </h2>
        <CuradoriaProduto produtoId={produto.id} sellerTemEmail={Boolean(loja?.email)} />
        <p className="mt-2 text-xs text-ink-2">
          Moderação rápida, sem parecer:{" "}
          <ModerarStatusProduto id={produto.id} status={produto.status_produto} />
        </p>
      </div>

      <div>
        <h2 className="mb-2 font-display text-sm font-semibold uppercase tracking-wide text-ink-2">
          Histórico de curadoria
        </h2>
        {(curadoria ?? []).length === 0 ? (
          <p className="text-sm text-ink-2">Nenhum parecer registrado.</p>
        ) : (
          <ul className="space-y-2">
            {(curadoria ?? []).map((c) => (
              <li key={c.id} className="rounded border border-line p-3 text-sm">
                <p className="font-semibold">
                  {rotuloDecisao[c.decisao] ?? c.decisao}{" "}
                  <span className="font-normal text-ink-2">— {fmtDate(c.created_at)}</span>
                </p>
                {c.observacao && (
                  <p className="mt-1 whitespace-pre-wrap text-ink-2">{c.observacao}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
