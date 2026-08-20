import type { Metadata } from "next";
import {
  VitrineHeader,
  VitrineFooter,
  Entrega24hBadge,
  SubNavCategorias,
  Breadcrumb,
} from "@/components/vitrine/ui";
import { CapturaRef } from "@/components/vitrine/CapturaRef";
import { notFound } from "next/navigation";
import { createPublicClient } from "@/lib/supabase/public";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { ErrorState } from "@/components/ErrorState";
import { formatBRL } from "@/components/seller/format";
import { BotaoAddCarrinho } from "@/components/carrinho/carrinho";
import { BotaoFalarComVendedor } from "@/components/vitrine/BotaoFalarComVendedor";
import { GaleriaProduto } from "@/components/vitrine/GaleriaProduto";
import { MercadoFuturo, type VendaFuturaItem } from "@/components/vitrine/MercadoFuturo";
import { normalizeWhatsapp } from "@/lib/whatsapp";
import { limparBBCode } from "@/lib/bbcode";
import { cookies } from "next/headers";
import { lerEnderecoCookie, lojaCobreCep, CEP_COOKIE, type FaixaCep } from "@/lib/cep";
import { FormCriarColetiva, BarraProgresso } from "@/components/vitrine/CompraColetiva";
import { CrossSellRail } from "@/components/carrinho/CrossSellRail";
import { AvaliacoesProduto } from "@/components/vitrine/AvaliacoesProduto";
import { buscarFavoritoResumo, listarAvaliacoes } from "@/app/produto/[id]/social-actions";
import { SelecaoFaixaProvider } from "@/components/vitrine/SelecaoFaixaContext";
import { TabelaFaixasProgressivas } from "@/components/vitrine/TabelaFaixasProgressivas";
import { PrecoDinamico } from "@/components/vitrine/PrecoDinamico";
import { extrairIdDoParam, permalinkProduto } from "@/lib/slug";

import type { Faixa } from "@/lib/preco-faixa";

const SITE_URL = "https://industria24.com.br";

// ISR curto (preço/estoque exibidos aqui) — o checkout_criar_pedido revalida
// preço/estoque de verdade no banco, então uma vitrine com até 30s de atraso
// não quebra a integridade da compra, só a exatidão do que é exibido.
export const revalidate = 30;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id: param } = await params;
  const id = extrairIdDoParam(param);
  const supabase = createPublicClient();
  const { data: produto } = await supabase
    .from("produtos")
    .select("nome, descricao, valor")
    .eq("id", id)
    .eq("status_produto", "Aprovado")
    .maybeSingle();

  if (!produto) return {};

  const preco = formatBRL(Number(produto.valor));
  const descricao = produto.descricao
    ? limparBBCode(produto.descricao).slice(0, 155)
    : `${produto.nome} por ${preco} na Indústria 24h — compre direto da indústria em Manaus, com desconto por faixa de quantidade.`;

  const { data: imagem } = await supabase
    .from("produto_imagens")
    .select("url")
    .eq("produto_id", id)
    .order("ordem", { ascending: true })
    .limit(1)
    .maybeSingle();

  const canonical = `${SITE_URL}${permalinkProduto(id, produto.nome)}`;

  return {
    title: produto.nome,
    description: descricao,
    alternates: { canonical },
    openGraph: {
      title: produto.nome,
      description: descricao,
      url: canonical,
      images: imagem ? [{ url: imagem.url }] : undefined,
    },
    twitter: imagem ? { card: "summary_large_image", images: [imagem.url] } : undefined,
  };
}

export default async function ProdutoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ref?: string }>;
}) {
  if (!isSupabaseConfigured) {
    return (
      <ErrorState
        title="Supabase não configurado"
        detail="Defina as variáveis do Supabase em web/.env.local (ou nas env vars da Vercel em produção)."
      />
    );
  }

  const { id: param } = await params;
  const id = extrairIdDoParam(param);
  const supabase = createPublicClient();

  const { data: produto, error } = await supabase
    .from("produtos")
    .select("*")
    .eq("id", id)
    .single();

  // Produto sem preço é rascunho: não deve ser acessível na vitrine pública,
  // mesmo por link direto. Trata como inexistente (coerente com H5).
  if (
    error ||
    !produto ||
    !produto.valor ||
    Number(produto.valor) <= 0 ||
    produto.status_produto !== "Aprovado"
  ) {
    notFound();
  }

  // Dados da loja via view pública sem PII (migration 0012) — a tabela
  // lojas não tem mais leitura anônima.
  const { data: loja } = await supabase
    .from("lojas_vitrine")
    .select("id, nome, whatsapp, cidade, estado")
    .eq("id", produto.loja_id)
    .maybeSingle();

  const [{ data: categoria }, { data: todasCategorias }] = await Promise.all([
    produto.categoria_id
      ? supabase.from("categorias").select("id, nome").eq("id", produto.categoria_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("categorias").select("id, nome").order("nome"),
  ]);

  const { data: imagens } = await supabase
    .from("produto_imagens")
    .select("*")
    .eq("produto_id", id)
    .order("ordem", { ascending: true });

  const { data: promocao } = await supabase
    .from("promocoes_progressivas")
    .select("*")
    .eq("produto_id", id)
    .eq("ativo", true)
    .maybeSingle();

  const faixas: Faixa[] = Array.isArray(promocao?.faixas) ? (promocao.faixas as unknown as Faixa[]) : [];

  // Compra coletiva (PRD MPDD-36): coletivas abertas deste produto — quem não
  // atinge a 1ª faixa sozinho soma quantidade com outros compradores.
  // Só oferece a coletiva se a faixa dá desconto REAL sobre o preço base
  // (há promoções cadastradas com faixa MAIS CARA que o produto; a RPC
  // coletiva_criar da migration 0070 aplica o mesmo guard no banco).
  // Mesmos filtros da RPC coletiva_criar (0070): desconto real, faixa não
  // vencida E estoque suficiente para a meta — senão a vitrine anuncia uma
  // meta que o banco vai recusar/trocar.
  // Regra configurada pelo seller (0076) manda; sem regra, o comportamento
  // herdado continua valendo (1ª faixa da promoção progressiva).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- tabela 0076 fora dos tipos gerados
  const { data: regraColetiva } = await (supabase as any)
    .from("coletiva_regras")
    .select("meta_qtd, lotes, ativo, min_participantes, max_participantes, prazo_dias, frete_conjunto")
    .eq("produto_id", id)
    .eq("ativo", true)
    .maybeSingle();

  const hoje = new Date().toISOString().slice(0, 10);
  const lotesRegra: Faixa[] = Array.isArray(regraColetiva?.lotes)
    ? (regraColetiva.lotes as Faixa[])
    : [];
  const candidatas: Faixa[] = lotesRegra.length > 0 ? lotesRegra : faixas;
  const primeiraValida =
    candidatas
      .filter(
        (f) =>
          Number(f.valor_unitario) < Number(produto.valor) &&
          (!f.validade || f.validade >= hoje) &&
          f.min_qtd <= (produto.estoque_atual ?? 0),
      )
      .sort((a, b) => a.min_qtd - b.min_qtd)[0] ?? null;
  // Meta explícita da regra vence a derivação, desde que caiba no estoque.
  const metaColetiva =
    regraColetiva?.meta_qtd && regraColetiva.meta_qtd <= (produto.estoque_atual ?? 0)
      ? Number(regraColetiva.meta_qtd)
      : (primeiraValida?.min_qtd ?? null);
  const faixaColetiva = primeiraValida && metaColetiva ? primeiraValida : null;
  const { data: coletivas } = await supabase
    .from("compras_coletivas")
    .select("id, meta_qtd, qtd_atual, valor_unitario, prazo, status")
    .eq("produto_id", id)
    // 'Viavel' (0077) = meta batida mas ainda aceitando volume para descer de lote.
    .in("status", ["Aberta", "Viavel"])
    .gt("prazo", new Date().toISOString())
    .order("created_at", { ascending: false });

  const { data: vendasFuturas } = await supabase
    .from("vendas_futuras")
    .select("id, previsao, estoque, valor")
    .eq("produto_id", id)
    .gt("estoque", 0)
    .order("previsao", { ascending: true });

  // Favoritos/avaliações: agregado público, seguro sob ISR (revalidate=30)
  // — nada específico de usuário é lido/embutido aqui (ver comentário em
  // BotaoFavorito.tsx sobre por que o favorito do usuário não pode vir daqui).
  const [resumoSocial, avaliacoes] = await Promise.all([
    buscarFavoritoResumo(produto.id),
    listarAvaliacoes(produto.id),
  ]);

  const itensMercadoFuturo: VendaFuturaItem[] = (vendasFuturas ?? [])
    .filter((v) => v.previsao)
    .map((v) => ({
      id: v.id,
      produto_id: produto.id,
      produto_nome: produto.nome,
      loja_id: produto.loja_id,
      loja_nome: loja?.nome ?? "—",
      img: imagens?.[0]?.url ?? null,
      previsao: v.previsao as string,
      estoque: v.estoque ?? 0,
      valor: v.valor,
      preco_base: Number(produto.valor),
      quantidade_minima: produto.quantidade_minima,
    }));

  const cookieStore = await cookies();
  const cepComprador = lerEnderecoCookie(cookieStore.get(CEP_COOKIE)?.value)?.cep ?? null;
  const { data: faixasCep } = await supabase
    .from("faixas_cep")
    .select("cep_inicial, cep_final, loja_id, ativo")
    .eq("ativo", true);
  const foraDaCobertura =
    !!cepComprador && !lojaCobreCep((faixasCep ?? []) as FaixaCep[], produto.loja_id, cepComprador);

  const whatsappNumero = normalizeWhatsapp(loja?.whatsapp);
  const textoWhatsapp = encodeURIComponent(
    `Olá! Tenho interesse no produto "${produto.nome}" que vi no Indústria 24h.`
  );
  const linkWhatsapp = whatsappNumero
    ? `https://wa.me/${whatsappNumero}?text=${textoWhatsapp}`
    : null;

  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: produto.nome,
    description: produto.descricao ? limparBBCode(produto.descricao) : produto.nome,
    image: imagens?.map((img) => img.url) ?? [],
    sku: produto.sku ?? undefined,
    offers: {
      "@type": "Offer",
      url: `${SITE_URL}${permalinkProduto(produto.id, produto.nome)}`,
      priceCurrency: "BRL",
      price: Number(produto.valor).toFixed(2),
      availability:
        produto.estoque_atual > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      seller: loja ? { "@type": "Organization", name: loja.nome } : undefined,
    },
  };
  if (avaliacoes.length > 0) {
    const media = avaliacoes.reduce((soma, a) => soma + a.nota, 0) / avaliacoes.length;
    jsonLd.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: media.toFixed(1),
      reviewCount: avaliacoes.length,
    };
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <CapturaRef identificador={(await searchParams).ref ?? null} />
      <VitrineHeader />
      <SubNavCategorias categorias={todasCategorias ?? []} ativaId={categoria?.id} />

      <SelecaoFaixaProvider>
      <main className="mx-auto max-w-[1280px] px-4 py-5 pb-28 md:py-7 md:pb-8">
        <Breadcrumb
          itens={[
            { label: "Home", href: "/" },
            ...(categoria ? [{ label: categoria.nome, href: `/categoria/${categoria.id}` }] : []),
            { label: produto.nome },
          ]}
        />
        <a
          href={loja ? `/loja/${loja.id}` : "/"}
          className="mb-3 inline-flex items-center gap-1 text-sm text-ink-2 hover:text-lm-azul"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden>
            <path d="M15 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {loja ? `Voltar para ${loja.nome}` : "Voltar"}
        </a>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-10">
          {/* Galeria (DESIGN.md, padrão 2026-07-17): componente client interativo,
              miniaturas clicáveis trocam a foto principal sem reload */}
          <div>
            <GaleriaProduto imagens={imagens ?? []} nomeProduto={produto.nome} produtoId={produto.id} />
          </div>

          {/* Painel de informações */}
          <div className="flex flex-col gap-3">
            <div>
              {loja?.nome && (
                <a
                  href={`/loja/${loja.id}`}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-lm-azul hover:underline"
                >
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-lm-azul/10 text-[10px] font-bold">
                    {loja.nome.charAt(0).toUpperCase()}
                  </span>
                  {loja.nome}
                  {[loja.cidade, loja.estado].filter(Boolean).length > 0 && (
                    <span className="font-normal text-muted">
                      · {[loja.cidade, loja.estado].filter(Boolean).join("/")}
                    </span>
                  )}
                </a>
              )}
              <h1 className="font-display mt-1 text-2xl font-bold leading-tight text-ink md:text-[26px]">
                {produto.nome}
              </h1>
            </div>

            {/* Bloco compacto acima da dobra: preço + badges + CTA — o resto
                (faixas de desconto, coletiva, descrição) vira accordion abaixo
                para reduzir a rolagem até a compra (redesign 2026-07-29). */}
            <div className="rounded-md border border-line bg-white p-3">
              <PrecoDinamico
                valorBase={Number(produto.valor)}
                faixas={faixas}
                quantidadeMinima={produto.quantidade_minima}
              />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {!foraDaCobertura && (
                  <Entrega24hBadge cidade={loja?.cidade} estado={loja?.estado} />
                )}
                <span className="inline-flex items-center gap-1 rounded-sm bg-lm-amarelo/20 px-2 py-0.5 text-[11px] font-medium text-lm-marinho">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                    <path d="M3 9l9-6 9 6-9 6-9-6z" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M3 9v6l9 6 9-6V9" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  estoque: <span className="num">{produto.estoque_atual}</span>&nbsp;un
                </span>
                {produto.quantidade_minima != null && (
                  <span className="inline-flex items-center gap-1 rounded-sm bg-lm-azul/10 px-2 py-0.5 text-[11px] font-medium text-lm-azul">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                      <rect x="4" y="7" width="16" height="13" rx="1.5" />
                      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" strokeLinecap="round" />
                    </svg>
                    pedido mín.: <span className="num">{produto.quantidade_minima}</span>&nbsp;un
                  </span>
                )}
              </div>
            </div>

            {/* Ações de compra — escondidas no mobile, onde viram a barra fixa no rodapé */}
            <div className="hidden flex-col gap-2 md:flex">
              {foraDaCobertura ? (
                <button
                  type="button"
                  disabled
                  className="rounded bg-line px-5 py-2.5 text-sm font-semibold text-muted cursor-not-allowed"
                >
                  indisponível na sua região
                </button>
              ) : (
                <BotaoAddCarrinho
                  produto={{
                    produto_id: produto.id,
                    nome: produto.nome,
                    valor: Number(produto.valor),
                    quantidade_minima: produto.quantidade_minima,
                    loja_id: produto.loja_id,
                    loja_nome: loja?.nome ?? "",
                    img: imagens?.[0]?.url ?? null,
                  }}
                  estoqueMaximo={produto.estoque_atual}
                  faixas={faixas}
                />
              )}
              {linkWhatsapp ? (
                <a
                  href={linkWhatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded bg-lm-azul px-6 py-2.5 text-sm font-semibold text-white hover:bg-lm-azul-escuro"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5.1-1.3A10 10 0 1 0 12 2zm5.4 14.2c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .1-1.7-.1-.4-.1-.9-.3-1.6-.6-2.8-1.2-4.6-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.8 0-1.3.7-2 .9-2.2.2-.2.5-.3.7-.3h.5c.2 0 .4 0 .6.4.2.5.7 1.8.8 1.9.1.2.1.3 0 .5-.1.2-.1.3-.3.5-.1.2-.3.4-.4.5-.1.1-.3.3-.1.6.2.3.9 1.5 1.9 2.4 1.3 1.2 2.4 1.5 2.7 1.7.3.2.5.1.7-.1.2-.2.8-.9 1-1.2.2-.3.4-.2.7-.1.3.1 1.8.9 2.1 1 .3.1.5.2.6.3.1.2.1.6-.1 1.2z" />
                  </svg>
                  Pedir pelo WhatsApp
                </a>
              ) : (
                <p className="text-sm text-muted">
                  Esta loja não disponibilizou WhatsApp para contato.
                </p>
              )}
              {/* Duas ações secundárias de mesmo peso, lado a lado, para não
                  empilhar 2 linhas inteiras de botão (menos altura na dobra). */}
              <div className="grid grid-cols-2 gap-2.5">
                {/* Chat interno (MPDD-15): histórico fica no marketplace, sem
                    depender do WhatsApp externo. */}
                <BotaoFalarComVendedor lojaId={produto.loja_id} produtoId={produto.id}>
                  <button
                    type="submit"
                    className="inline-flex w-full items-center justify-center gap-1.5 rounded bg-ok px-3 py-2.5 text-[13px] font-semibold text-white hover:bg-ok/85"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                      <path d="M21 11.5a8.38 8.38 0 0 1-4.06 7.21A8.5 8.5 0 0 1 3 15.5V15A8.38 8.38 0 0 1 7.06 7.79 8.5 8.5 0 0 1 21 11.5z" strokeLinecap="round" strokeLinejoin="round" />
                      <circle cx="8.5" cy="12" r="0.9" fill="currentColor" stroke="none" />
                      <circle cx="12" cy="12" r="0.9" fill="currentColor" stroke="none" />
                      <circle cx="15.5" cy="12" r="0.9" fill="currentColor" stroke="none" />
                    </svg>
                    Falar com vendedor
                  </button>
                </BotaoFalarComVendedor>
                {/* Leilão reverso: comprador que quer volume maior/preço melhor
                    publica um pedido pré-preenchido com este produto, em vez de
                    comprar direto. Link simples com query string — reaproveita
                    o form já existente em /leilao. */}
                <a
                  href={`/leilao?titulo=${encodeURIComponent(produto.nome)}${produto.categoria_id ? `&categoria_id=${produto.categoria_id}` : ""}`}
                  className="inline-flex items-center justify-center gap-1.5 rounded border border-lm-azul px-3 py-2.5 text-[13px] font-semibold text-lm-azul hover:bg-lm-azul/5"
                  title="Pedir em leilão (volume/preço melhor)"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                    <path d="m14.5 4.5-8 8" strokeLinecap="round" />
                    <path d="m17.5 7.5-8 8" strokeLinecap="round" />
                    <path d="m2 22 4-4" strokeLinecap="round" />
                    <path d="m11 3 3-1 5 5-1 3z" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Pedir em leilão
                </a>
              </div>
            </div>

            {/* Detalhes progressivos: fora da dobra inicial, abertos sob demanda
                (redesign 2026-07-29, menos rolagem até o CTA de compra). */}
            {faixas.length > 0 && (
              <details
                className="rounded-sm border border-line bg-white p-4 md:hidden"
                open={faixas.length <= 2}
              >
                <summary className="flex cursor-pointer items-center gap-1.5 text-xs font-semibold uppercase tracking-[.12em] text-muted">
                  <IconePromocaoProgressiva className="h-4 w-4 shrink-0 text-lm-azul" />
                  Promoção progressiva
                </summary>
                <TabelaFaixasProgressivas faixas={faixas} />
              </details>
            )}

            {faixaColetiva && (
              <details id="compra-coletiva" className="rounded-sm border border-line bg-white p-4">
                <summary className="flex cursor-pointer items-center gap-1.5 text-xs font-semibold uppercase tracking-[.12em] text-muted">
                  <IconeCompraColetiva className="h-4 w-4 shrink-0 text-lm-azul" />
                  Compra coletiva
                </summary>
                <p className="mb-3 mt-2 text-sm text-ink-2">
                  Não atinge a quantidade do desconto sozinho? Junte-se a outros
                  compradores — ninguém paga nada antes do fechamento, e quanto
                  mais volume entrar, mais barato fica para todos.
                </p>
                {lotesRegra.length > 1 && (
                  <ul className="num mb-3 grid gap-1 text-xs text-ink-2">
                    {lotesRegra.map((l) => (
                      <li key={l.min_qtd}>
                        a partir de {l.min_qtd} un → {formatBRL(l.valor_unitario)}/un
                      </li>
                    ))}
                  </ul>
                )}
                {(coletivas ?? []).map((c) => (
                  <a
                    key={c.id}
                    href={`/coletiva/${c.id}`}
                    className="mb-3 block rounded border border-line p-3 hover:border-lm-azul"
                  >
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="num font-semibold text-lm-azul">
                        {formatBRL(c.valor_unitario)}/un
                      </span>
                      <span className="text-xs text-muted">
                        até <span className="num">{new Date(c.prazo).toLocaleDateString("pt-BR")}</span>
                      </span>
                    </div>
                    <BarraProgresso atual={c.qtd_atual} meta={c.meta_qtd} />
                  </a>
                ))}
                <FormCriarColetiva
                  produtoId={produto.id}
                  metaQtd={metaColetiva ?? faixaColetiva.min_qtd}
                  freteConjunto={regraColetiva?.frete_conjunto === true}
                />
              </details>
            )}

            {produto.descricao && (
              <details className="border-t border-line pt-5">
                <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[.12em] text-muted">
                  Descrição
                </summary>
                <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink-2">
                  {limparBBCode(produto.descricao)}
                </p>
              </details>
            )}
          </div>
        </div>

        {/* Cross-sell/upsell: mesmo motor de sugestões do carrinho (mesma
            categoria, exclui o próprio produto) — reaproveitado passando um
            item sintético, sem persistir nada no carrinho real. */}
        <CrossSellRail
          itens={[
            {
              produto_id: produto.id,
              nome: produto.nome,
              valor: Number(produto.valor),
              quantidade: 1,
              quantidade_minima: produto.quantidade_minima,
              loja_id: produto.loja_id,
              loja_nome: loja?.nome ?? "",
              img: imagens?.[0]?.url ?? null,
            },
          ]}
        />

        {itensMercadoFuturo.length > 0 && (
          <div id="venda-futura" className="mt-4">
            <MercadoFuturo itens={itensMercadoFuturo} />
          </div>
        )}

        <AvaliacoesProduto
          produtoId={produto.id}
          media={resumoSocial.media}
          totalAvaliacoes={resumoSocial.totalAvaliacoes}
          totalFavoritos={resumoSocial.totalFavoritos}
          avaliacoesIniciais={avaliacoes}
        />
      </main>

      {/* Barra de compra fixa no mobile: preço + ações sempre visíveis, sem rolar até o fim da descrição.
          bottom-14 (não bottom-0): a TabBarMobile também é fixed/bottom-0 com z-40 — empilhada em
          cima desta barra em vez de por cima, senão a tab bar cobre a base quando esta barra cresce
          (ex.: confirmação "Adicionado ao carrinho"). */}
      <div className="fixed inset-x-0 bottom-14 z-30 border-t border-line bg-white p-3 shadow-[0_-2px_12px_rgba(0,0,0,.08)] md:hidden">
        <div className="flex items-center gap-3">
          <div className="min-w-0 shrink-0">
            <p className="num text-lg font-bold leading-none text-ink">
              {formatBRL(produto.valor)}
              <span className="text-xs font-normal text-muted">/un</span>
            </p>
          </div>
          <div className="min-w-0 flex-1">
            {foraDaCobertura ? (
              <button
                type="button"
                disabled
                className="h-10 w-full rounded bg-line px-4 text-sm font-semibold text-muted cursor-not-allowed"
              >
                indisponível na sua região
              </button>
            ) : (
              <BotaoAddCarrinho
                produto={{
                  produto_id: produto.id,
                  nome: produto.nome,
                  valor: Number(produto.valor),
                  quantidade_minima: produto.quantidade_minima,
                  loja_id: produto.loja_id,
                  loja_nome: loja?.nome ?? "",
                  img: imagens?.[0]?.url ?? null,
                }}
                estoqueMaximo={produto.estoque_atual}
                faixas={faixas}
                compacto
              />
            )}
          </div>
        </div>
      </div>
      </SelecaoFaixaProvider>

      <VitrineFooter />
    </>
  );
}

type IconeSecaoProps = { className?: string };

// Etiqueta de preço com "%" — reforça visualmente que a faixa é desconto por
// volume, não decoração.
function IconePromocaoProgressiva({ className }: IconeSecaoProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M3 12.5V5a2 2 0 0 1 2-2h7.5a2 2 0 0 1 1.4.6l7 7a2 2 0 0 1 0 2.8l-7.6 7.6a2 2 0 0 1-2.8 0l-7-7A2 2 0 0 1 3 12.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle cx="8" cy="8" r="1.3" fill="currentColor" />
      <path d="m8 15 7-7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

// Duas pessoas — reforça que a compra coletiva depende de mais gente
// entrando (o negócio real, não só um "grupo" genérico).
function IconeCompraColetiva({ className }: IconeSecaoProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <circle cx="8.5" cy="7.5" r="3" stroke="currentColor" strokeWidth="1.6" />
      <path d="M2.5 20c0-3.6 2.7-6.5 6-6.5s6 2.9 6 6.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="17" cy="8.5" r="2.3" stroke="currentColor" strokeWidth="1.5" />
      <path d="M15.5 13.2c2.7.3 4.7 2.7 4.9 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
