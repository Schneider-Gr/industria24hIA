import {
  VitrineHeader,
  VitrineFooter,
  TituloSecao,
  TrustBar,
  BarraGarantias,
  type Loja,
} from "@/components/vitrine/ui";
import { BannerCarousel } from "@/components/vitrine/BannerCarousel";
import { CategoriaCarousel } from "@/components/vitrine/CategoriaCarousel";
import { HeroDialBadge } from "@/components/vitrine/HeroDialBadge";
import { VendaFuturaPassos } from "@/components/vitrine/VendaFuturaPassos";
import { DealsCountdown } from "@/components/vitrine/DealsCountdown";
import { CestasBanner } from "@/components/vitrine/CestasBanner";
import { BannerGalerias } from "@/components/vitrine/BannerGalerias";
import { TrilhoProdutos } from "@/components/vitrine/TrilhoProdutos";
import { MercadoFuturo } from "@/components/vitrine/MercadoFuturo";
import { MercadoFuturoIntro } from "@/components/vitrine/MercadoFuturoIntro";
import { VendaFuturaGaleria } from "@/components/vitrine/VendaFuturaGaleria";
import { PortaoCep } from "@/components/vitrine/PortaoCep";
import { CardLocalizacao } from "@/components/vitrine/CardLocalizacao";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { ErrorState } from "@/components/ErrorState";
import { cookies } from "next/headers";
import { lerEnderecoCookie, CEP_COOKIE } from "@/lib/cep";
import { buscarGaleriasVitrine } from "@/lib/catalogo-compra/galerias";
import { BannerRecrutamentoSeller } from "@/components/vitrine/BannerRecrutamentoSeller";
import { LojaSeletor } from "@/components/vitrine/LojaSeletor";
import { buscarFlagsRapidas } from "@/lib/vitrine-quick-flags";
import { obterVitrineHomeCacheada } from "@/lib/catalogo-compra/vitrine-home";

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

  // getUser() e o catálogo cacheado não dependem um do outro; a busca de
  // galerias fica fora deste Promise.all (waterfall estrutural, issue #333).
  const [
    {
      data: { user },
    },
    vitrineHomeBase,
  ] = await Promise.all([supabase.auth.getUser(), obterVitrineHomeCacheada()]);

  const {
    config,
    categorias,
    categoriasError,
    lojas,
    lojasError,
    produtos,
    produtosError,
    imagensError,
    produtosComDesconto: produtosComDescontoBase,
    itensMercadoFuturo: itensMercadoFuturoBase,
    produtosSupermercado: produtosSupermercadoBase,
    cardsGaleria,
    cardsGaleriaMeio,
  } = vitrineHomeBase;

  // Sem CEP e sem sessão a home pede o CEP numa faixa translúcida, sem
  // bloquear a listagem (os produtos seguem abaixo).
  const pedirCep = !cepComprador && !user;

  // Decisão 2026-09-05: a vitrine não esconde mais nada por CEP. O cadastro de
  // `faixas_cep` só cobre AM e DF, então filtrar aqui deixava a home vazia para
  // o resto do país. A indisponibilidade é avisada na página do produto e da
  // loja, e o checkout continua bloqueando (RPC checkout_criar_pedido).
  const galeriasVitrine = await buscarGaleriasVitrine(supabase);

  const produtosComImagem = produtos;
  const produtosComDesconto = produtosComDescontoBase;
  const itensMercadoFuturo = itensMercadoFuturoBase;
  const produtosSupermercado = produtosSupermercadoBase;

  const lojasNaCobertura = lojas.filter((l) => !!l.id && !!l.nome) as Loja[];
  const lojaPorId = new Map(lojas.map((l) => [l.id, l]));

  // Produtos das duas seções que usam ProdutoCard (o carrossel de desconto
  // progressivo usa ProdutoDescontoCard, sem os botões rápidos).
  const produtosParaFlagsRapidas = [
    ...produtosComImagem.map((p) => ({ id: p.id, valor: p.valor })),
    ...galeriasVitrine
      .filter((g) => g.tipo !== "desconto_progressivo")
      .flatMap((g) => g.produtos.map((p) => ({ id: p.id, valor: p.valor }))),
  ];
  const { vendaFutura, coletiva } = await buscarFlagsRapidas(supabase, produtosParaFlagsRapidas);

  const bannerUrl = config?.banner_desktop_url || "/banners/banner-principal.png";
  const bannerMobileUrl = config?.banner_mobile_url || "/banners/banner-3-mobile.jpg";

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <VitrineHeader />

      {/* Fora do <main>: a animação `.anim-entra` usa transform e viraria o
          containing block do card `fixed` do mobile, tirando-o da viewport. */}
      {pedirCep && <PortaoCep />}

      <main className="anim-entra flex-1">
        {pedirCep && <CardLocalizacao />}

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
                cabeçalho, e um título sobre o banner ficaria ilegível.
                Fileira única com rolagem lateral (formato da vitrine antiga),
                em vez de grid que quebra em várias linhas. */}
            <TrilhoProdutos
              variante="desconto"
              className="group"
              trilhoClassName="[&>div>div]:shadow-[0_4px_16px_rgba(15,26,36,.18)]"
              itens={produtosComDesconto.map((produto) => ({
                produto,
                lojaCidade: lojaPorId.get(produto.loja_id)?.cidade,
                lojaEstado: lojaPorId.get(produto.loja_id)?.estado,
              }))}
            />
          </section>
        )}

        {/* Faixa de banners cadastrável (posicao='meio' em /admin/destaques),
            logo abaixo da primeira fileira de produtos. */}
        {cardsGaleriaMeio.length > 0 && (
          <BannerGalerias
            titulo="Ofertas em destaque"
            cards={cardsGaleriaMeio}
            itemClassName="w-[80%] shrink-0 snap-start sm:w-[48%] lg:w-[calc((100%-2*0.75rem)/3)]"
            aspectClassName="aspect-[5/6]"
            mostrarTitulo={false}
          />
        )}

        <TrustBar />

        {/* Venda futura abre as galerias de produto — é a proposta que
            diferencia o marketplace. */}
        <VendaFuturaGaleria itens={itensMercadoFuturo} />

        {/* Produtos recentes — antes das lojas: produto converte, loja navega */}
        <section id="produtos" className="max-w-[1280px] mx-auto px-4 sm:px-6 mt-6 sm:mt-10 scroll-mt-24">
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
            <TrilhoProdutos
              variante="produto"
              className="group"
              itens={produtosComImagem.map((produto) => ({
                produto: { ...produto, img: produto.imagemUrl },
                lojaCidade: lojaPorId.get(produto.loja_id)?.cidade,
                lojaEstado: lojaPorId.get(produto.loja_id)?.estado,
                lojaNome: lojaPorId.get(produto.loja_id)?.nome,
                temVendaFutura: vendaFutura.has(produto.id),
                temCompraColetiva: coletiva.has(produto.id),
              }))}
            />
          ) : (
            <p className="text-sm text-muted">
              Nenhum produto disponível ainda.
            </p>
          )}
        </section>

        {/* Supermercado & Hortifruti — categoria real, produtos reais */}
        {produtosSupermercado.length > 0 && (
          <section id="supermercado" className="max-w-[1280px] mx-auto px-4 sm:px-6 mt-6 sm:mt-10 scroll-mt-24">
            <TituloSecao kicker="Quanto mais leva, maior o desconto">Supermercado &amp; Hortifruti</TituloSecao>
            <TrilhoProdutos
              variante="grocery"
              className="group"
              itens={produtosSupermercado.map((produto) => ({ produto }))}
            />
          </section>
        )}

        {produtosSupermercado.length > 0 && <CestasBanner />}

        {/* Faixa de galerias: abaixo dos produtos, como no Mercado Livre */}
        <BannerGalerias titulo="Destaques da indústria" cards={cardsGaleria} />

        {/* Galerias cadastráveis (vitrine_galerias, migration 0092) — só
            renderiza quem sobrar produto após o filtro de cobertura por CEP. */}
        {galeriasVitrine.map((galeria) =>
          galeria.tipo === "desconto_progressivo" ? (
            <TrilhoProdutos
              key={galeria.id}
              variante="desconto"
              titulo={galeria.titulo}
              itens={galeria.produtos.map((produto) => ({ produto }))}
            />
          ) : (
            <TrilhoProdutos
              key={galeria.id}
              variante="produto"
              titulo={galeria.titulo}
              itens={galeria.produtos.map((produto) => ({
                produto,
                temVendaFutura: vendaFutura.has(produto.id),
                temCompraColetiva: coletiva.has(produto.id),
              }))}
            />
          ),
        )}

        {/* Compre do Mercado Futuro (venda futura, fiel à home real) */}
        <div id="mercado-futuro" className="scroll-mt-24">
          <MercadoFuturoIntro />
          <div id="mercado-futuro-datas" className="scroll-mt-24">
            <MercadoFuturo itens={itensMercadoFuturo} />
          </div>
        </div>

        {/* Lojas */}
        <section className="max-w-[1280px] mx-auto px-4 sm:px-6 mt-6 sm:mt-10 mb-8 sm:mb-12">
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
            <p className="text-sm text-muted">
              Nenhuma loja disponível ainda.
            </p>
          )}
        </section>

        <BannerRecrutamentoSeller />
        <BarraGarantias />
      </main>

      <VitrineFooter />
    </div>
  );
}
