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
import { validadeMaisProxima } from "@/lib/catalogo-compra/desconto-progressivo";
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
import { ordenarPorProximidade } from "@/lib/catalogo-compra/proximidade";
import { idsForaDaFaixaCep } from "@/lib/catalogo-compra/faixa-cep-produto";
import { contarForaDaFaixa, esconderForaDaFaixa } from "@/lib/catalogo-compra/faixa-cep-regra";
import { AvisoForaDaFaixa } from "@/components/vitrine/AvisoForaDaFaixa";

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
  const enderecoComprador = lerEnderecoCookie(cookieStore.get(CEP_COOKIE)?.value);
  const cepComprador = enderecoComprador?.cep ?? null;

  // getUser() e o catálogo cacheado não dependem um do outro; a busca de
  // galerias fica fora deste Promise.all (waterfall estrutural, issue #333).
  // A sessão não decide mais nada aqui (o portão de CEP passou a valer para
  // logado também), mas a chamada fica: é ela que revalida o cookie de auth.
  const [, vitrineHomeBase] = await Promise.all([
    supabase.auth.getUser(),
    obterVitrineHomeCacheada(),
  ]);

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

  // Decisão do dono em 08/09/2026, referência gravada em Jam: a home segue o
  // Mercado Livre e NÃO lista produto nenhum antes do CEP. Sem CEP ficam o
  // banner, as categorias, as lojas e o institucional — o suficiente para o
  // visitante entender a plataforma e informar onde está.
  //
  // O portão e o card aparecem para qualquer visitante, logado ou não: sem CEP
  // a home não tem como saber o que chega até ele.
  const semCep = !cepComprador;
  const pedirCep = semCep;
  const pedirCepNoCard = semCep;

  // Decisão 2026-09-08 (revisada pelo dono no fim do dia): o produto fora da
  // faixa declarada pelo seller NÃO é exibido. Onde nenhum seller declarou
  // cobertura a vitrine fica vazia — comportamento esperado, não bug. O
  // bloqueio de venda continua também na RPC checkout_criar_pedido.
  const galeriasVitrine = await buscarGaleriasVitrine(supabase);

  // Uma query só para as cinco listas da home: produtos, descontos,
  // supermercado, galerias e venda futura. Consultar cada uma por conta
  // própria custaria cinco idas ao banco no caminho da página inicial.
  //
  // A venda futura entra por `produto_id`, não por `id`: o item da lista é a
  // oferta agendada, e a cobertura é do produto por trás dela.
  const foraDaFaixa = semCep
    ? new Set<string>()
    : await idsForaDaFaixaCep(
    [
      ...produtos.map((p) => p.id),
      ...produtosComDescontoBase.map((p) => p.id),
      ...produtosSupermercadoBase.map((p) => p.id),
      ...galeriasVitrine.flatMap((g) => g.produtos.map((p) => p.id)),
      ...itensMercadoFuturoBase.map((i) => i.produto_id),
    ],
    cepComprador,
  );

  // Com CEP, os mais próximos do comprador vêm primeiro.
  const produtosComImagem = semCep
    ? []
    : await ordenarPorProximidade(esconderForaDaFaixa(produtos, foraDaFaixa), cepComprador);
  const produtosComDesconto = semCep
    ? []
    : esconderForaDaFaixa(produtosComDescontoBase, foraDaFaixa);
  // Galeria que fica sem produto algum some junto — um trilho vazio com título
  // é pior que nenhum trilho.
  const galeriasMarcadas = semCep
    ? []
    : (galeriasVitrine.map((g) => ({
        ...g,
        produtos: esconderForaDaFaixa(g.produtos, foraDaFaixa),
      })) as typeof galeriasVitrine).filter((g) => g.produtos.length > 0);
  // Venda futura também respeita a cobertura. Entrega agendada continua sendo
  // entrega: se a loja não atende o CEP, `checkout_criar_pedido` recusa igual,
  // e deixar a seção passar sem filtro colocava produto de volta na home de
  // quem não pode comprá-lo (era o furo que sobrou do #530).
  const itensMercadoFuturo = semCep
    ? []
    : esconderForaDaFaixa(itensMercadoFuturoBase, foraDaFaixa, (i) => i.produto_id);
  const produtosSupermercado = semCep ? [] : esconderForaDaFaixa(produtosSupermercadoBase, foraDaFaixa);

  // Quantos produtos o CEP tirou da vitrine. Esconder em silêncio faz o
  // catálogo parecer menor do que é, ainda mais quando a localização veio da
  // geolocalização e o comprador nem digitou o CEP.
  const escondidosPeloCep = contarForaDaFaixa(
    [
      ...produtos,
      ...produtosComDescontoBase,
      ...produtosSupermercadoBase,
      ...galeriasVitrine.flatMap((g) => g.produtos),
      // `contarForaDaFaixa` conta ids únicos, então o produto que aparece
      // também em outra seção não é contado duas vezes.
      ...itensMercadoFuturoBase.map((i) => ({ id: i.produto_id })),
    ],
    foraDaFaixa,
  );

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

  // Cronômetro de ofertas só com validade real (decisão da dona em 11/09).
  const validadeOferta = validadeMaisProxima(produtosComDesconto);

  // Chips de categoria do topo mobile: só categorias com produto visível nesta
  // home para o CEP do comprador. Sem CEP a home não lista produto, então não
  // há chip. Uma consulta pelos ids já filtrados.
  const idsVisiveis = [
    ...new Set([
      ...produtosComImagem.map((p) => p.id),
      ...produtosComDesconto.map((p) => p.id),
      ...produtosSupermercado.map((p) => p.id),
      ...galeriasMarcadas.flatMap((g) => g.produtos.map((p) => p.id)),
      ...itensMercadoFuturo.map((i) => i.produto_id),
    ]),
  ];
  const { data: categoriasVisiveis } = idsVisiveis.length
    ? await supabase.from("produtos").select("categoria_id").in("id", idsVisiveis)
    : { data: [] as { categoria_id: string | null }[] };
  const idsCategoriaVisivel = new Set((categoriasVisiveis ?? []).map((p) => p.categoria_id));
  const chipsCategorias = (categorias ?? [])
    .filter((c) => idsCategoriaVisivel.has(c.id))
    .map((c) => ({ id: c.id, nome: c.nome }));

  const bannerUrl = config?.banner_desktop_url || "/banners/banner-principal.png";
  const bannerMobileUrl = config?.banner_mobile_url || "/banners/banner-3-mobile.jpg";

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <VitrineHeader chipsCategorias={chipsCategorias} />

      {/* Fora do <main>: a animação `.anim-entra` usa transform e viraria o
          containing block do card `fixed` do mobile, tirando-o da viewport. */}
      {pedirCep && <PortaoCep />}

      <main className="anim-entra flex-1">
        {pedirCepNoCard && <CardLocalizacao />}
        <AvisoForaDaFaixa
          quantidade={escondidosPeloCep}
          cidade={enderecoComprador?.cidade}
          uf={enderecoComprador?.uf}
        />

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

        {/* Cronômetro de ofertas logo abaixo do banner: só aparece quando
            alguma faixa de desconto tem validade real, e conta até ela. */}
        {validadeOferta && <DealsCountdown validade={validadeOferta} />}

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
            titulo=""
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
        {!semCep && (
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
        )}

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
            renderiza quem sobrar produto depois do filtro de cobertura. */}
        {galeriasMarcadas.map((galeria) =>
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
