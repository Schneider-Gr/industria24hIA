import {
  VitrineHeader,
  VitrineFooter,
  LojaCard,
  ProdutoCard,
  ProdutoDescontoCard,
  TituloSecao,
  TrustBar,
} from "@/components/vitrine/ui";
import { BannerCarousel } from "@/components/vitrine/BannerCarousel";
import { BannerGalerias, type CardGaleria } from "@/components/vitrine/BannerGalerias";
import { MercadoFuturo, type VendaFuturaItem } from "@/components/vitrine/MercadoFuturo";
import { PortaoCep } from "@/components/vitrine/PortaoCep";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import Link from "next/link";
import { ErrorState } from "@/components/ErrorState";
import { cookies } from "next/headers";
import { lerEnderecoCookie, lojaCobreCep, CEP_COOKIE, type FaixaCep } from "@/lib/cep";

export const dynamic = "force-dynamic";

// Faixa editorial de destaques — não existe tabela de banners/campanhas no
// schema, então o conteúdo é constante e as imagens são as reais de
// public/banners. Trocar aqui até existir cadastro de campanha.
const CARDS_GALERIA: CardGaleria[] = [
  {
    titulo: "Mercado Futuro — reserve a produção",
    img: "/banners/banner-mercado-futuro.png",
    href: "#mercado-futuro",
  },
  { titulo: "Leilões de lote", img: "/banners/banner-3.jpg", href: "/leilao", badge: "Novo" },
  { titulo: "Corridas de frete", img: "/banners/banner-principal.png", href: "/corridas" },
];

export default async function HomePage() {
  if (!isSupabaseConfigured) {
    return (
      <ErrorState
        title="Supabase não configurado"
        detail="Defina as variáveis do Supabase em web/.env.local (ou nas env vars da Vercel em produção)."
      />
    );
  }

  const supabase = await createClient();
  const cookieStore = await cookies();
  const cepComprador = lerEnderecoCookie(cookieStore.get(CEP_COOKIE)?.value)?.cep ?? null;

  // Sem CEP e sem sessão a home pede o CEP numa faixa translúcida, sem
  // bloquear a listagem (os produtos seguem abaixo).
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const pedirCep = !cepComprador && !user;

  const [
    { data: config },
    { data: categorias, error: categoriasError },
    { data: lojas, error: lojasError },
    { data: produtos, error: produtosError },
    { data: promocoes },
    { data: vendasFuturas },
    { data: faixasCep },
  ] = await Promise.all([
    supabase
      .from("marketplace_config")
      .select("banner_desktop_url, banner_mobile_url")
      .limit(1)
      .maybeSingle(),
    supabase.from("categorias").select("id, nome").order("nome"),
    supabase
      // View pública sem PII (migration 0012): só lojas Ativas.
      .from("lojas_vitrine")
      .select(
        "id, nome, descricao, logotipo_url, banner_url, cidade, estado, valor_pedido_minimo, permite_retirada_na_loja"
      )
      .order("nome"),
    supabase
      .from("produtos")
      .select(
        "id, loja_id, nome, descricao, valor, sku, quantidade_minima, estoque_atual, created_at"
      )
      .gt("valor", 0)
      .eq("status_produto", "Aprovado")
      .order("created_at", { ascending: false })
      .limit(12),
    supabase.from("promocoes_progressivas").select("produto_id, faixas").eq("ativo", true),
    supabase
      .from("vendas_futuras")
      .select("id, produto_id, previsao, estoque, valor")
      .gt("estoque", 0)
      // Reserva de produção só faz sentido para data que ainda não passou.
      .gte("previsao", new Date().toISOString().slice(0, 10))
      .order("previsao", { ascending: true }),
    supabase.from("faixas_cep").select("cep_inicial, cep_final, loja_id, ativo").eq("ativo", true),
  ]);

  // Filtro de cobertura por CEP (cobertura por loja, decisão 2026-07-14):
  // sem CEP salvo, a vitrine mostra tudo; com CEP, esconde loja/produtos que
  // nenhuma faixa (da própria loja ou o fallback global loja_id null) cobre.
  const faixas = (faixasCep ?? []) as FaixaCep[];
  const cobreLoja = (lojaId: string) =>
    !cepComprador || lojaCobreCep(faixas, lojaId, cepComprador);

  let produtosComImagem: (NonNullable<typeof produtos>[number] & {
    imagemUrl: string | null;
  })[] = [];

  let imagensError: { message: string } | null = null;

  if (produtos && produtos.length > 0) {
    const ids = produtos.map((p) => p.id);
    const { data: imagens, error } = await supabase
      .from("produto_imagens")
      .select("produto_id, url, ordem")
      .in("produto_id", ids)
      .order("ordem", { ascending: true });

    imagensError = error;

    const primeiraImagemPorProduto = new Map<string, string>();
    (imagens ?? []).forEach((img) => {
      if (!primeiraImagemPorProduto.has(img.produto_id)) {
        primeiraImagemPorProduto.set(img.produto_id, img.url);
      }
    });

    produtosComImagem = produtos
      .filter((p) => cobreLoja(p.loja_id))
      .map((p) => ({
        ...p,
        imagemUrl: primeiraImagemPorProduto.get(p.id) ?? null,
      }));
  }

  const lojasNaCobertura = (lojas ?? []).filter((l) => cobreLoja(l.id));

  const bannerUrl = config?.banner_desktop_url || "/banners/banner-principal.png";
  const bannerMobileUrl = config?.banner_mobile_url || "/banners/banner-3-mobile.jpg";

  // "Produtos com descontos progressivos" — join manual (sem FK/embed do
  // PostgREST) entre a faixa mais barata de cada promoção ativa e o produto.
  const idsDesconto = (promocoes ?? []).map((p) => p.produto_id);
  const { data: produtosDesconto } = idsDesconto.length
    ? await supabase
        .from("produtos")
        .select("id, nome, valor, loja_id")
        .in("id", idsDesconto)
        .gt("valor", 0)
    : { data: [] as { id: string; nome: string; valor: number; loja_id: string }[] };

  const { data: imagensDesconto } = idsDesconto.length
    ? await supabase
        .from("produto_imagens")
        .select("produto_id, url, ordem")
        .in("produto_id", idsDesconto)
        .order("ordem", { ascending: true })
    : { data: [] as { produto_id: string; url: string }[] };

  const imagemPorProdutoDesconto = new Map<string, string>();
  (imagensDesconto ?? []).forEach((img) => {
    if (!imagemPorProdutoDesconto.has(img.produto_id)) {
      imagemPorProdutoDesconto.set(img.produto_id, img.url);
    }
  });

  const produtosComDesconto = (promocoes ?? [])
    .map((promo) => {
      const produto = (produtosDesconto ?? []).find((p) => p.id === promo.produto_id);
      if (!produto || !cobreLoja(produto.loja_id)) return null;
      const faixas = Array.isArray(promo.faixas)
        ? (promo.faixas as { valor_unitario: number }[])
        : [];
      const menorPreco = faixas.reduce(
        (min, f) => Math.min(min, f.valor_unitario),
        produto.valor,
      );
      return {
        id: produto.id,
        nome: produto.nome,
        valor: produto.valor,
        menorPreco,
        img: imagemPorProdutoDesconto.get(produto.id) ?? null,
      };
    })
    .filter((p): p is NonNullable<typeof p> => p !== null);

  // "Compre do Mercado Futuro" — mesma lógica de join manual.
  const idsVendaFutura = [...new Set((vendasFuturas ?? []).map((v) => v.produto_id))];
  const { data: produtosVendaFutura } = idsVendaFutura.length
    ? await supabase
        .from("produtos")
        .select("id, nome, valor, loja_id, quantidade_minima")
        .in("id", idsVendaFutura)
        .gt("valor", 0)
    : { data: [] as { id: string; nome: string; valor: number; loja_id: string; quantidade_minima: number | null }[] };

  const lojaIdsVendaFutura = [...new Set((produtosVendaFutura ?? []).map((p) => p.loja_id))];
  const { data: lojasVendaFutura } = lojaIdsVendaFutura.length
    ? await supabase.from("lojas_vitrine").select("id, nome").in("id", lojaIdsVendaFutura)
    : { data: [] as { id: string; nome: string }[] };

  const { data: imagensVendaFutura } = idsVendaFutura.length
    ? await supabase
        .from("produto_imagens")
        .select("produto_id, url, ordem")
        .in("produto_id", idsVendaFutura)
        .order("ordem", { ascending: true })
    : { data: [] as { produto_id: string; url: string }[] };

  const imagemPorProdutoVF = new Map<string, string>();
  (imagensVendaFutura ?? []).forEach((img) => {
    if (!imagemPorProdutoVF.has(img.produto_id)) {
      imagemPorProdutoVF.set(img.produto_id, img.url);
    }
  });
  const produtoPorIdVF = new Map((produtosVendaFutura ?? []).map((p) => [p.id, p]));
  const lojaPorIdVF = new Map((lojasVendaFutura ?? []).map((l) => [l.id, l.nome]));

  const itensMercadoFuturo: VendaFuturaItem[] = (vendasFuturas ?? [])
    .map((v) => {
      const produto = produtoPorIdVF.get(v.produto_id);
      if (!produto || !v.previsao || !cobreLoja(produto.loja_id)) return null;
      return {
        id: v.id,
        produto_id: v.produto_id,
        produto_nome: produto.nome,
        loja_id: produto.loja_id,
        loja_nome: lojaPorIdVF.get(produto.loja_id) ?? "—",
        img: imagemPorProdutoVF.get(v.produto_id) ?? null,
        previsao: v.previsao,
        estoque: v.estoque ?? 0,
        valor: v.valor,
        preco_base: produto.valor,
        quantidade_minima: produto.quantidade_minima,
      };
    })
    .filter((v): v is NonNullable<typeof v> => v !== null);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <VitrineHeader />

      {/* Fora do <main>: a animação `.anim-entra` usa transform e viraria o
          containing block do card `fixed` do mobile, tirando-o da viewport. */}
      {pedirCep && <PortaoCep />}

      <main className="anim-entra flex-1">
        {/* Hero full-bleed: sangra de borda a borda, fora do container 1280px */}
        <BannerCarousel
          slides={[
            {
              src: bannerUrl,
              srcMobile: bannerMobileUrl,
              alt: "Indústria 24h — compre direto de quem fabrica",
            },
            {
              src: "/banners/banner-mercado-futuro.png",
              alt: "Compre do Mercado Futuro",
              href: "#mercado-futuro",
            },
            { src: "/banners/banner-3.jpg", srcMobile: "/banners/banner-3-mobile.jpg", alt: "Indústria 24h" },
          ]}
        />

        {/* Padrão Mercado Livre: a primeira fileira de produtos sobe sobre o
            banner (margem negativa + z-10) em vez de começar abaixo dele. */}
        {produtosComDesconto.length > 0 && (
          <section className="relative z-10 mx-auto -mt-6 max-w-[1280px] px-4 sm:-mt-8 sm:px-6">
            {/* Sem título de faixa: no ML esta fileira sobreposta não tem
                cabeçalho, e um título sobre o banner ficaria ilegível. */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-6 [&>a]:shadow-[0_4px_16px_rgba(15,26,36,.18)]">
              {produtosComDesconto.map((produto) => (
                <ProdutoDescontoCard key={produto.id} produto={produto} />
              ))}
            </div>
          </section>
        )}

        <TrustBar />

        {/* Categorias */}
        <section className="max-w-[1280px] mx-auto px-4 sm:px-6 mt-8">
          <TituloSecao kicker="Navegue">Categorias</TituloSecao>
          {categoriasError ? (
            <ErrorState
              title="Não foi possível carregar as categorias"
              detail={categoriasError.message}
            />
          ) : categorias && categorias.length > 0 ? (
            <div className="flex gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible">
              {categorias.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/categoria/${cat.id}`}
                  className="shrink-0 rounded-sm px-3.5 py-2 text-sm font-medium bg-surface border border-line text-ink-2 hover:border-aco-600 hover:bg-aco-100 hover:text-aco-600 transition-colors"
                >
                  {cat.nome}
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[#7C7C7C]">
              Nenhuma categoria disponível ainda.
            </p>
          )}
        </section>

        {/* Produtos recentes — antes das lojas: produto converte, loja navega */}
        <section id="produtos" className="max-w-[1280px] mx-auto px-4 sm:px-6 mt-10 scroll-mt-24">
          <TituloSecao kicker="Chegou agora">Produtos recentes</TituloSecao>
          {produtosError ? (
            <ErrorState
              title="Não foi possível carregar os produtos"
              detail={produtosError.message}
            />
          ) : imagensError ? (
            <ErrorState
              title="Não foi possível carregar as imagens dos produtos"
              detail={imagensError.message}
            />
          ) : produtosComImagem.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
              {produtosComImagem.map((produto) => (
                <ProdutoCard key={produto.id} produto={{ ...produto, img: produto.imagemUrl }} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-[#7C7C7C]">
              Nenhum produto disponível ainda.
            </p>
          )}
        </section>

        {/* Faixa de galerias: abaixo dos produtos, como no Mercado Livre */}
        <BannerGalerias titulo="Destaques da indústria" cards={CARDS_GALERIA} />

        {/* Compre do Mercado Futuro (venda futura, fiel à home real) */}
        <MercadoFuturo itens={itensMercadoFuturo} />

        {/* Lojas */}
        <section className="max-w-[1280px] mx-auto px-4 sm:px-6 mt-10 mb-12">
          <TituloSecao kicker="Quem fabrica">
            {lojasNaCobertura.length > 1
              ? `${lojasNaCobertura.length} indústrias locais`
              : "Lojas"}
          </TituloSecao>
          {lojasError ? (
            <ErrorState
              title="Não foi possível carregar as lojas"
              detail={lojasError.message}
            />
          ) : lojasNaCobertura.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {lojasNaCobertura.map((loja) => (
                <LojaCard key={loja.id} loja={loja} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-[#7C7C7C]">
              Nenhuma loja disponível ainda.
            </p>
          )}
        </section>
      </main>

      <VitrineFooter />
    </div>
  );
}
