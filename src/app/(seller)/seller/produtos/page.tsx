import { getUser, getMinhaLoja } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ErrorState } from "@/components/ErrorState";
import { KpiCard } from "@/components/seller/KpiCard";
import { PageTitle, PrecisaLogin, SemLoja, VazioBox } from "@/components/seller/states";
import { ProdutoForm } from "@/components/seller/ProdutoForm";
import { estadoEstoque, foraDaVitrine, vendendoPorReserva } from "@/lib/seller/estoque-estado";
import { ProdutoLinha } from "@/components/seller/ProdutoLinha";
import { bandasDasColunas, COLUNAS_BANDAS, type ColunasBandas } from "@/lib/logistica-parceiro/simulador-km";
import { formatBRL } from "@/components/seller/format";

export const dynamic = "force-dynamic";

export default async function ProdutosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; estoque?: string }>;
}) {
  const user = await getUser();
  if (!user) return <PrecisaLogin />;

  const loja = await getMinhaLoja();
  if (!loja) return <SemLoja />;

  const supabase = await createClient();

  const [produtosRes, categoriasRes, subcategoriasRes, centrosRes, faixasRes, faixasProdutoRes] =
    await Promise.all([
    supabase
      .from("produtos")
      .select(
        "id, nome, valor, estoque_atual, quantidade_minima, estoque_critico, sku, cep_produto, raio_entrega_km, faixa_cep_id, status_produto, created_at, categoria_id, subcategoria_id, taxonomia_no_id, permite_afiliacao, porcentagem_afiliado, permite_logistica_afiliado, valor_km_afiliado, altura, comprimento, largura, peso, descricao, frete_gratis, perecivel, produto_imagens(url)",
      )
      .eq("loja_id", loja.id)
      .order("created_at", { ascending: false }),
    supabase.from("categorias").select("id, nome").order("nome"),
    supabase.from("subcategorias").select("id, nome, categoria_id").order("nome"),
    supabase.from("centros_distribuicao").select("*").eq("loja_id", loja.id),
    supabase
      .from("faixas_cep")
      .select("id, cep_inicial, cep_final, nome")
      .is("transportadora_id", null)
      .is("loja_id", null)
      .order("nome", { nullsFirst: false })
      .order("cep_inicial"),
    // Cobertura N:N (0169) de todos os produtos da loja, numa query só; o
    // formulário de edição precisa saber o que já está marcado, senão salvar
    // apagaria a cobertura do produto.
    supabase
      .from("produto_faixas_cep")
      .select("produto_id, faixa_cep_id, produtos!inner(loja_id)")
      .eq("produtos.loja_id", loja.id),
  ]);

  const faixasPorProduto = new Map<string, string[]>();
  for (const v of faixasProdutoRes.data ?? []) {
    const lista = faixasPorProduto.get(v.produto_id) ?? [];
    lista.push(v.faixa_cep_id);
    faixasPorProduto.set(v.produto_id, lista);
  }

  if (produtosRes.error) {
    return <ErrorState title="Falha ao carregar produtos" detail={produtosRes.error.message} />;
  }

  // 0095 e 0201: colunas fora de database.types.ts até a migration ser aplicada e os
  // tipos regenerados (supabase generate-types) — busca à parte, cast pontual.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- colunas 0095/0201 fora dos tipos gerados
  const { data: revisaoData } = await (supabase as any)
    .from("produtos")
    .select(`id, parceiro_logistico_habilitado, ${COLUNAS_BANDAS}`)
    .eq("loja_id", loja.id);
  type Extra = { id: string; parceiro_logistico_habilitado: boolean } & ColunasBandas;
  const extraPorId = new Map<string, Extra>(((revisaoData ?? []) as Extra[]).map((r) => [r.id, r]));

  const { q, status, estoque } = await searchParams;
  const todos = (produtosRes.data ?? []).map((p) => ({
    ...p,
    parceiro_logistico_habilitado: extraPorId.get(p.id)?.parceiro_logistico_habilitado ?? false,
    // 0201: bandas de frete do avião
    bandas: bandasDasColunas(extraPorId.get(p.id) ?? {}),
  }));
  const statusDisponiveis = [...new Set(todos.map((p) => p.status_produto))].sort();
  const produtos = todos.filter(
    (p) =>
      (!q || p.nome.toLowerCase().includes(q.toLowerCase())) &&
      (!status || p.status_produto === status) &&
      (!estoque || estadoEstoque(p) === estoque),
  );
  // KPIs sempre sobre o catálogo inteiro (como no painel Bubble), não sobre o filtro.
  const valorEstoque = todos.reduce(
    (s, p) => s + (p.valor ?? 0) * (p.estoque_atual ?? 0),
    0,
  );
  // Faixa que a loja mais usa: vira o default do formulário de novo produto,
  // para o catálogo não voltar a acumular produto sem cobertura declarada.
  const faixaSugerida = [...todos.reduce((m, p) => {
    if (p.faixa_cep_id) m.set(p.faixa_cep_id, (m.get(p.faixa_cep_id) ?? 0) + 1);
    return m;
  }, new Map<string, number>())].sort((a, b) => b[1] - a[1])[0]?.[0];

  // Esgotado e crítico eram um número só; separados, o seller vê o que já
  // parou de vender antes do que vai parar. Reserva ativa muda o veredito:
  // esgotado com venda futura continua na vitrine (0173).
  const { data: reservasAtivas } = await supabase
    .from("vendas_futuras")
    .select("produto_id")
    .in("produto_id", todos.map((p) => p.id))
    .gt("estoque", 0);
  const comReserva = new Set((reservasAtivas ?? []).map((v) => v.produto_id));
  const comEstado = todos.map((p) => ({ ...p, temReserva: comReserva.has(p.id) }));

  const criticos = comEstado.filter((p) => estadoEstoque(p) === "critico").length;
  const esgotadosForaDaVitrine = comEstado.filter(foraDaVitrine).length;
  const esgotadosComReserva = comEstado.filter(vendendoPorReserva).length;

  return (
    <div>
      <PageTitle title="Produtos" subtitle="Gerencie o catálogo da sua loja" />

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Total de produtos" value={todos.length} />
        <KpiCard label="Valor total em estoque" value={formatBRL(valorEstoque)} />
        <KpiCard label="Estoque crítico" value={criticos} accent={criticos > 0 ? "warning" : "default"} />
        <KpiCard
          label="Esgotados fora da vitrine"
          value={esgotadosForaDaVitrine}
          accent={esgotadosForaDaVitrine > 0 ? "warning" : "default"}
        />
      </div>

      {(esgotadosForaDaVitrine > 0 || esgotadosComReserva > 0) && (
        <div className="mb-6 rounded border border-line bg-surface px-4 py-3 text-sm text-ink-2">
          {esgotadosForaDaVitrine > 0 && (
            <p>
              <span className="font-semibold text-ink">
                {esgotadosForaDaVitrine} produto(s) esgotado(s) não aparecem na vitrine.
              </span>{" "}
              Reponha o estoque ou crie uma oferta em{" "}
              <a href="/seller/venda-futura" className="text-lm-azul underline underline-offset-2">
                Venda Futura
              </a>{" "}
              para voltar a vender.
            </p>
          )}
          {esgotadosComReserva > 0 && (
            <p className="mt-1">
              {esgotadosComReserva} produto(s) esgotado(s) seguem na vitrine vendendo por reserva.
            </p>
          )}
        </div>
      )}

      <div className="mb-8">
        <ProdutoForm
          categorias={categoriasRes.data ?? []}
          subcategorias={subcategoriasRes.data ?? []}
          centros={centrosRes.data ?? []}
          faixasCep={faixasRes.data ?? []}
          faixaSugerida={faixaSugerida}
        />
      </div>

      <form method="get" className="mb-4 flex flex-wrap items-center gap-2">
        <input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Buscar"
          className="w-64 rounded border border-line bg-surface px-3 py-2 text-sm"
        />
        <select
          name="status"
          defaultValue={status ?? ""}
          className="rounded border border-line bg-surface px-3 py-2 text-sm"
        >
          <option value="">Todos</option>
          {statusDisponiveis.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          name="estoque"
          defaultValue={estoque ?? ""}
          aria-label="Filtrar por estoque"
          className="rounded border border-line bg-surface px-3 py-2 text-sm"
        >
          <option value="">Qualquer estoque</option>
          <option value="esgotado">Esgotados</option>
          <option value="critico">Estoque crítico</option>
          <option value="normal">Em estoque</option>
        </select>
        <button
          type="submit"
          className="rounded bg-aco-900 px-4 py-2 text-sm font-semibold text-white"
        >
          Filtrar
        </button>
      </form>

      {produtos.length === 0 ? (
        <VazioBox>
          {todos.length === 0
            ? 'Nenhum produto cadastrado. Use "Cadastrar Novo" acima.'
            : "Nenhum produto encontrado com esse filtro."}
        </VazioBox>
      ) : (
        <div className="overflow-x-auto rounded border-line border">
          <table className="w-full text-sm">
            <thead className="bg-surface">
              <tr>
                <th className="px-4 py-2 text-left text-[11px] uppercase tracking-wider text-muted font-medium">Imagem</th>
                <th className="px-4 py-2 text-left text-[11px] uppercase tracking-wider text-muted font-medium">Produto</th>
                <th className="px-4 py-2 text-left text-[11px] uppercase tracking-wider text-muted font-medium">SKU</th>
                <th className="px-4 py-2 text-right text-[11px] uppercase tracking-wider text-muted font-medium">Valor</th>
                <th className="px-4 py-2 text-right text-[11px] uppercase tracking-wider text-muted font-medium">Estoque</th>
                <th className="px-4 py-2 text-right text-[11px] uppercase tracking-wider text-muted font-medium">Mínimo</th>
                <th className="px-4 py-2 text-left text-[11px] uppercase tracking-wider text-muted font-medium">DT criação</th>
                <th className="px-4 py-2 text-right text-[11px] uppercase tracking-wider text-muted font-medium">Valor Estoque</th>
                <th className="px-4 py-2 text-left text-[11px] uppercase tracking-wider text-muted font-medium">Status</th>
                <th className="px-4 py-2 text-right text-[11px] uppercase tracking-wider text-muted font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {produtos.map((p) => (
                <ProdutoLinha
                  key={p.id}
                  produto={p}
                  loja={loja}
                  categorias={categoriasRes.data ?? []}
                  subcategorias={subcategoriasRes.data ?? []}
                  centros={centrosRes.data ?? []}
                  faixasCep={faixasRes.data ?? []}
                  faixasDoProduto={faixasPorProduto.get(p.id) ?? []}
                  temReserva={comReserva.has(p.id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
