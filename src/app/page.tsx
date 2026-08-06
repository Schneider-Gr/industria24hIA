import {
  VitrineHeader,
  VitrineFooter,
  ProdutoCard,
  ProdutoDescontoCard,
  GroceryCard,
  TituloSecao,
  TrustBar,
  type Loja,
} from "@/components/vitrine/ui";
import { BannerCarousel } from "@/components/vitrine/BannerCarousel";
import { CategoriaCarousel } from "@/components/vitrine/CategoriaCarousel";
import { HeroDialBadge } from "@/components/vitrine/HeroDialBadge";
import { VendaFuturaPassos } from "@/components/vitrine/VendaFuturaPassos";
import { DealsCountdown } from "@/components/vitrine/DealsCountdown";
import { CestasBanner } from "@/components/vitrine/CestasBanner";
import { BannerGalerias, GaleriaCarrossel, type CardGaleria } from "@/components/vitrine/BannerGalerias";
import { MercadoFuturo, type VendaFuturaItem } from "@/components/vitrine/MercadoFuturo";
import { MercadoFuturoIntro } from "@/components/vitrine/MercadoFuturoIntro";
import { PortaoCep } from "@/components/vitrine/PortaoCep";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import Link from "next/link";
import { ErrorState } from "@/components/ErrorState";
import { cookies } from "next/headers";
import { lerEnderecoCookie, lojaCobreCep, CEP_COOKIE, type FaixaCep } from "@/lib/cep";
import { buscarGaleriasVitrine } from "@/lib/galerias";
import { BannerRecrutamentoSeller } from "@/components/vitrine/BannerRecrutamentoSeller";
import { LojaSeletor } from "@/components/vitrine/LojaSeletor";

export const dynamic = "force-dynamic";

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

  const { data: bannersDestaque } = await supabase
    .from("banners_destaque")
    .select("titulo, imagem_url, href, badge")
    .eq("ativo", true)
    .order("ordem")
    .order("created_at");

  const cardsGaleria: CardGaleria[] = (bannersDestaque ?? []).map((b) => ({
    titulo: b.titulo,
    img: b.imagem_url,
    href: b.href,
    badge: b.badge ?? undefined,
  }));

  // Filtro de cobertura por CEP (cobertura por loja, decisão 2026-07-14):
  // sem CEP salvo, a vitrine mostra tudo; com CEP, esconde loja/produtos que
  // nenhuma faixa (da própria loja ou o fallback global loja_id null) cobre.
  const faixas = (faixasCep ?? []) as FaixaCep[];
  const cobreLoja = (lojaId: string) =>
    !cepComprador || lojaCobreCep(faixas, lojaId, cepComprador);

  const galeriasVitrine = await buscarGaleriasVitrine(supabase, faixas, cepComprador);

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

  const lojasNaCobertura = (lojas ?? []).filter(
    (l) => !!l.id && !!l.nome && cobreLoja(l.id)
  ) as Loja[];
  const lojaPorId = new Map((lojas ?? []).map((l) => [l.id, l]));

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
        loja_id: produto.loja_id,
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

  // Supermercado & Hortifruti (mockup 29/07): categoria real "Supermercado"
  // (confirmada no banco) — busca pelo nome já carregado acima, sem fixar UUID.
  const categoriaSupermercado = (categorias ?? []).find(
    (c) => c.nome.trim().toLowerCase() === "supermercado",
  );

  let produtosSupermercado: {
    id: string;
    nome: string;
    valor: number;
    img: string | null;
    temDescontoProgressivo: boolean;
  }[] = [];

  if (categoriaSupermercado) {
    const { data: produtosCat } = await supabase
      .from("produtos")
      .select("id, loja_id, nome, valor")
      .eq("categoria_id", categoriaSupermercado.id)
      .gt("valor", 0)
      .eq("status_produto", "Aprovado")
      .order("nome")
      .limit(12);

    const idsCat = (produtosCat ?? []).map((p) => p.id);
    const { data: imagensCat } = idsCat.length
      ? await supabase
          .from("produto_imagens")
          .select("produto_id, url, ordem")
          .in("produto_id", idsCat)
          .order("ordem", { ascending: true })
      : { data: [] as { produto_id: string; url: string }[] };

    const imagemPorProdutoCat = new Map<string, string>();
    (imagensCat ?? []).forEach((img) => {
      if (!imagemPorProdutoCat.has(img.produto_id)) imagemPorProdutoCat.set(img.produto_id, img.url);
    });

    const idsComDesconto = new Set(idsDesconto);
    produtosSupermercado = (produtosCat ?? [])
      .filter((p) => cobreLoja(p.loja_id))
      .map((p) => ({
        id: p.id,
        nome: p.nome,
        valor: p.valor,
        img: imagemPorProdutoCat.get(p.id) ?? null,
        temDescontoProgressivo: idsComDesconto.has(p.id),
      }));
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <VitrineHeader />

      {/* Fora do <main>: a animação `.anim-entra` usa transform e viraria o
          containing block do card `fixed` do mobile, tirando-o da viewport. */}
      {pedirCep && <PortaoCep />}

      <main className="anim-entra flex-1">
        {/* Hero full-bleed: sangra de borda a borda, fora do container 1280px.
            HeroDialBadge é posicionado absolute — precisa do wrapper relative. */}
        <div className="relative">
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
          <HeroDialBadge />
        </div>

        {/* Contador "ofertas relâmpago" — logo abaixo do banner inicial,
            só com oferta real por trás */}
        {produtosComDesconto.length > 0 && <DealsCountdown />}

        {/* Categorias — carrossel colorido, logo abaixo do hero (mockup 29/07) */}
        <section className="max-w-[1280px] mx-auto px-4 sm:px-6 mt-6">
          <TituloSecao kicker="Navegue">Categorias</TituloSecao>
          {categoriasError ? (
            <ErrorState
              title="Não foi possível carregar as categorias"
              detail={categoriasError.message}
            />
          ) : (
            <CategoriaCarousel categorias={categorias ?? []} />
          )}
        </section>

        {/* Como funciona a Venda Futura (mockup 29/07) */}
        <VendaFuturaPassos />

        {/* Padrão Mercado Livre: a primeira fileira de produtos sobe sobre o
            banner (margem negativa + z-10) em vez de começar abaixo dele. */}
        {produtosComDesconto.length > 0 && (
          <section
            id="ofertas"
            className="relative z-10 mx-auto -mt-6 max-w-[1280px] px-4 sm:-mt-8 sm:px-6 scroll-mt-24"
          >
            {/* Sem título de faixa: no ML esta fileira sobreposta não tem
                cabeçalho, e um título sobre o banner ficaria ilegível. */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-6 [&>a]:shadow-[0_4px_16px_rgba(15,26,36,.18)]">
              {produtosComDesconto.map((produto) => (
                <ProdutoDescontoCard
                  key={produto.id}
                  produto={produto}
                  lojaCidade={lojaPorId.get(produto.loja_id)?.cidade}
                  lojaEstado={lojaPorId.get(produto.loja_id)?.estado}
                />
              ))}
            </div>
          </section>
        )}

        <TrustBar />

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
                <ProdutoCard
                  key={produto.id}
                  produto={{ ...produto, img: produto.imagemUrl }}
                  lojaCidade={lojaPorId.get(produto.loja_id)?.cidade}
                  lojaEstado={lojaPorId.get(produto.loja_id)?.estado}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-[#7C7C7C]">
              Nenhum produto disponível ainda.
            </p>
          )}
        </section>

        {/* Compre do Mercado Futuro (venda futura) — em meio à galeria de
            produtos, como no app real (ver screenshot 03/08). */}
        <div id="mercado-futuro" className="scroll-mt-24">
          <MercadoFuturoIntro />
          <div id="mercado-futuro-datas" className="scroll-mt-24">
            <MercadoFuturo itens={itensMercadoFuturo} />
          </div>
        </div>

        {/* Supermercado & Hortifruti — categoria real, produtos reais */}
        {produtosSupermercado.length > 0 && (
          <section id="supermercado" className="max-w-[1280px] mx-auto px-4 sm:px-6 mt-10 scroll-mt-24">
            <TituloSecao kicker="Quanto mais leva, maior o desconto">Supermercado &amp; Hortifruti</TituloSecao>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
              {produtosSupermercado.map((produto) => (
                <GroceryCard key={produto.id} produto={produto} />
              ))}
            </div>
          </section>
        )}

        {produtosSupermercado.length > 0 && <CestasBanner />}

        {/* Faixa de galerias: abaixo dos produtos, como no Mercado Livre */}
        <BannerGalerias titulo="Destaques da indústria" cards={cardsGaleria} />

        {/* Galerias cadastráveis (vitrine_galerias, migration 0092) — só
            renderiza quem sobrar produto após o filtro de cobertura por CEP. */}
        {galeriasVitrine.map((galeria) =>
          galeria.tipo === "desconto_progressivo" ? (
            <GaleriaCarrossel
              key={galeria.id}
              titulo={galeria.titulo}
              itens={galeria.produtos}
              keyFn={(produto) => produto.id}
              itemClassName="w-[45%] shrink-0 snap-start sm:w-[30%] md:w-[22%] lg:w-[15%]"
              renderItem={(produto) => <ProdutoDescontoCard produto={produto} />}
            />
          ) : (
            <GaleriaCarrossel
              key={galeria.id}
              titulo={galeria.titulo}
              itens={galeria.produtos}
              keyFn={(produto) => produto.id}
              itemClassName="w-[45%] shrink-0 snap-start sm:w-[30%] md:w-[22%] lg:w-[15%]"
              renderItem={(produto) => <ProdutoCard produto={produto} />}
            />
          ),
        )}

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
            <LojaSeletor lojas={lojasNaCobertura} />
          ) : (
            <p className="text-sm text-[#7C7C7C]">
              Nenhuma loja disponível ainda.
            </p>
          )}
        </section>

        <BannerRecrutamentoSeller />
      </main>

      <VitrineFooter />
    </div>
  );
}
