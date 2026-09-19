import { parseBannersHero } from "@/lib/banners-hero";
import {
  VitrineHeader,
  VitrineFooter,
  TituloSecao,
  TrustBar,
  LojaCard,
  BarraGarantias,
  type Loja,
} from "@/components/vitrine/ui";
import { BannerCarousel } from "@/components/vitrine/BannerCarousel";
import { CategoriaCarousel } from "@/components/vitrine/CategoriaCarousel";
import { HeroDialBadge } from "@/components/vitrine/HeroDialBadge";
import { PortasEconomia } from "@/components/vitrine/PortasEconomia";
import { DealsCountdown } from "@/components/vitrine/DealsCountdown";
import { validadeMaisProxima } from "@/lib/catalogo-compra/desconto-progressivo";
import { CestasBanner } from "@/components/vitrine/CestasBanner";
import { BannerGalerias } from "@/components/vitrine/BannerGalerias";
import { TrilhoProdutos } from "@/components/vitrine/TrilhoProdutos";
import { MercadoFuturo } from "@/components/vitrine/MercadoFuturo";
import { MercadoFuturoIntro } from "@/components/vitrine/MercadoFuturoIntro";
import { PortaoCep } from "@/components/vitrine/PortaoCep";
import { CardLocalizacao } from "@/components/vitrine/CardLocalizacao";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { ErrorState } from "@/components/ErrorState";
import { cookies } from "next/headers";
import { lerEnderecoCookie, CEP_COOKIE } from "@/lib/cep";
import { buscarGaleriasVitrine } from "@/lib/catalogo-compra/galerias";
import { BannerRecrutamentoSeller } from "@/components/vitrine/BannerRecrutamentoSeller";
import { buscarFlagsRapidas } from "@/lib/vitrine-quick-flags";
import { obterVitrineHomeCacheada, buscarProdutosPorTermoCacheado } from "@/lib/catalogo-compra/vitrine-home";
import {
  CONSENTIMENTO_COOKIE,
  HISTORICO_BUSCA_COOKIE,
  lerHistorico,
  sortirPorLoja,
} from "@/lib/catalogo-compra/vitrine-personalizacao";
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
  // Último termo buscado (hist_busca), só existe com consentimento "todos".
  const ultimoTermo =
    cookieStore.get(CONSENTIMENTO_COOKIE)?.value === "todos"
      ? (lerHistorico(cookieStore.get(HISTORICO_BUSCA_COOKIE)?.value)[0] ?? null)
      : null;

  // getUser() e o catálogo cacheado não dependem um do outro; a busca de
  // galerias fica fora deste Promise.all (waterfall estrutural, issue #333).
  // A sessão não decide mais nada aqui (o portão de CEP passou a valer para
  // logado também), mas a chamada fica: é ela que revalida o cookie de auth.
  // Galerias entram no mesmo Promise.all: não dependem do catálogo.
  const [, vitrineHomeBase, galeriasVitrine, produtosDoTermoBase] = await Promise.all([
    supabase.auth.getUser(),
    obterVitrineHomeCacheada(),
    buscarGaleriasVitrine(supabase),
    ultimoTermo && cepComprador ? buscarProdutosPorTermoCacheado(ultimoTermo) : Promise.resolve([]),
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

  // Uma query só para as cinco listas da home: produtos, descontos,
  // supermercado, galerias e venda futura. Consultar cada uma por conta
  // própria custaria cinco idas ao banco no caminho da página inicial.
  //
  // A venda futura entra por `produto_id`, não por `id`: o item da lista é a
  // oferta agendada, e a cobertura é do produto por trás dela.
  const idsCandidatos = [
    ...new Set([
      ...produtos.map((p) => p.id),
      ...produtosComDescontoBase.map((p) => p.id),
      ...produtosSupermercadoBase.map((p) => p.id),
      ...galeriasVitrine.flatMap((g) => g.produtos.map((p) => p.id)),
      ...itensMercadoFuturoBase.map((i) => i.produto_id),
      ...produtosDoTermoBase.map((p) => p.id),
    ]),
  ];
  // Produtos das duas seções que usam ProdutoCard (o carrossel de desconto
  // progressivo usa ProdutoDescontoCard, sem os botões rápidos).
  const produtosParaFlagsRapidas = [
    ...produtos.map((p) => ({ id: p.id, valor: p.valor })),
    ...produtosDoTermoBase.map((p) => ({ id: p.id, valor: p.valor })),
    ...galeriasVitrine
      .filter((g) => g.tipo !== "desconto_progressivo")
      .flatMap((g) => g.produtos.map((p) => ({ id: p.id, valor: p.valor }))),
  ];

  // Cobertura, proximidade, flags dos cards e categorias dos chips rodam em
  // paralelo sobre os candidatos, antes do filtro de CEP: nenhuma depende da
  // outra, e o filtro depois só tira item. Em série eram 4 idas ao banco.
  const semFlags = {
    vendaFutura: new Set<string>(),
    coletiva: new Set<string>(),
    menorPreco: new Map<string, number>(),
  };
  const [foraDaFaixa, produtosOrdenados, flagsRapidas, { data: categoriasDosCandidatos }] = semCep
    ? [new Set<string>(), [] as typeof produtos, semFlags, { data: [] as { id: string; categoria_id: string | null }[] }]
    : await Promise.all([
        idsForaDaFaixaCep(idsCandidatos, cepComprador),
        ordenarPorProximidade(produtos, cepComprador),
        buscarFlagsRapidas(supabase, produtosParaFlagsRapidas),
        idsCandidatos.length
          ? supabase.from("produtos").select("id, categoria_id").in("id", idsCandidatos)
          : Promise.resolve({ data: [] as { id: string; categoria_id: string | null }[] }),
      ]);

  // Com CEP, os mais próximos do comprador vêm primeiro.
  // Trilhos sortidos: lojas intercaladas para uma loja que subiu um lote não
  // tomar o trilho inteiro (pedido da dona, 18/09).
  const porLoja = (p: { loja_id: string }) => p.loja_id;
  const produtosComImagem = semCep
    ? []
    : sortirPorLoja(esconderForaDaFaixa(produtosOrdenados, foraDaFaixa), porLoja).slice(0, 12);
  const produtosDoTermo = semCep
    ? []
    : sortirPorLoja(esconderForaDaFaixa(produtosDoTermoBase, foraDaFaixa), porLoja).slice(0, 12);
  const produtosComDesconto = semCep
    ? []
    : sortirPorLoja(esconderForaDaFaixa(produtosComDescontoBase, foraDaFaixa), (p) => p.loja_id ?? "");
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
  const produtosSupermercado = semCep
    ? []
    : sortirPorLoja(esconderForaDaFaixa(produtosSupermercadoBase, foraDaFaixa), porLoja);

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

  // Com CEP, só entra loja que tem produto visível para ele: a seção dizia
  // "indústrias locais" e listava loja de outro estado e loja de teste sem
  // produto (crítica impeccable 19/09). Sem CEP, mostra todas.
  const lojasComProdutoVisivel = new Set(
    [
      ...produtosComImagem,
      ...produtosComDesconto,
      ...produtosSupermercado,
      ...itensMercadoFuturo,
      ...galeriasMarcadas.flatMap((g) => g.produtos),
    ].map((p) => (p as { loja_id?: string }).loja_id),
  );
  const lojasNaCobertura = lojas.filter(
    (l) => !!l.id && !!l.nome && (semCep || lojasComProdutoVisivel.has(l.id)),
  ) as Loja[];
  const lojaPorId = new Map(lojas.map((l) => [l.id, l]));

  const { vendaFutura, coletiva, menorPreco } = flagsRapidas;

  // Cronômetro de ofertas só com validade real (decisão da dona em 11/09).
  const validadeOferta = validadeMaisProxima(produtosComDesconto);

  // Categorias com produto visível para este CEP: o carrossel mostrava a
  // lista inteira, inclusive categoria sem nada que chegue ao comprador.
  // Sem CEP a home não lista produto, então o carrossel mostra todas.
  const idsVisiveis = [
    ...new Set([
      ...produtosComImagem.map((p) => p.id),
      ...produtosComDesconto.map((p) => p.id),
      ...produtosSupermercado.map((p) => p.id),
      ...galeriasMarcadas.flatMap((g) => g.produtos.map((p) => p.id)),
      ...itensMercadoFuturo.map((i) => i.produto_id),
      ...produtosDoTermo.map((p) => p.id),
    ]),
  ];
  const visiveis = new Set(idsVisiveis);
  const idsCategoriaVisivel = new Set(
    (categoriasDosCandidatos ?? []).filter((p) => visiveis.has(p.id)).map((p) => p.categoria_id),
  );
  const categoriasComProduto = semCep
    ? (categorias ?? [])
    : (categorias ?? []).filter((c) => idsCategoriaVisivel.has(c.id));

  const slidesHero = parseBannersHero(config?.banners_hero);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <VitrineHeader />

      {/* Fora do <main>: a animação `.anim-entra` usa transform e viraria o
          containing block do card `fixed` do mobile, tirando-o da viewport. */}
      {pedirCep && <PortaoCep />}

      <main className="anim-entra flex-1">
        <h1 className="sr-only">Indústria 24h: compre direto de quem fabrica, com entrega no seu CEP</h1>
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
            slides={
              slidesHero.length
                ? slidesHero
                : [{ src: "/banners/banner-principal.png", srcMobile: "/banners/banner-3-mobile.jpg", alt: "Indústria 24h — compre direto de quem fabrica" }]
            }
          />
          <HeroDialBadge />
        </div>

        {/* Cronômetro de ofertas: escondido no celular a pedido da dona
            (19/09) — lá a primeira dobra é do banner e das categorias. */}
        {validadeOferta && (
          <div className="hidden sm:block">
            <DealsCountdown validade={validadeOferta} />
          </div>
        )}

        {/* No celular as categorias sobem para logo abaixo do banner; no
            desktop as portas continuam vindo primeiro (order na coluna). */}
        <div className="flex flex-col">
        {/* Uma porta por mecanismo de economia (PRODUCT.md, Positioning). */}
        <div className="order-2 sm:order-1">
          <PortasEconomia />
        </div>

        {/* Categorias — carrossel colorido, logo abaixo do hero (mockup 29/07) */}
        <section className="order-1 max-w-[1280px] mx-auto w-full px-4 sm:order-2 sm:px-6 mt-4 sm:mt-6">
          <TituloSecao>Categorias</TituloSecao>
          {categoriasError ? (
            <ErrorState
              title="Não foi possível carregar as categorias"
              detail="Recarregue a página em alguns instantes."
            />
          ) : (
            <CategoriaCarousel categorias={categoriasComProduto} />
          )}
        </section>
        </div>


        {/* Primeira fileira de produtos: desconto por volume, destino da porta
            "Desconto por volume" da PortasEconomia. */}
        {produtosComDesconto.length > 0 && (
          <section
            id="ofertas"
            className="mx-auto mt-6 max-w-[1280px] px-4 sm:mt-10 sm:px-6 scroll-mt-24"
          >
            <TituloSecao>Desconto por volume</TituloSecao>
            <TrilhoProdutos
              variante="desconto"
              className="group"
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


        {produtosDoTermo.length > 0 && ultimoTermo && (
          <section id="para-voce" className="max-w-[1280px] mx-auto px-4 sm:px-6 mt-6 sm:mt-10 scroll-mt-24">
            <TituloSecao>Porque você buscou “{ultimoTermo}”</TituloSecao>
            <TrilhoProdutos
              variante="produto"
              className="group"
              itens={produtosDoTermo.map((produto) => ({
                produto: { ...produto, img: produto.imagemUrl },
                lojaCidade: lojaPorId.get(produto.loja_id)?.cidade,
                lojaEstado: lojaPorId.get(produto.loja_id)?.estado,
                lojaNome: lojaPorId.get(produto.loja_id)?.nome,
                temVendaFutura: vendaFutura.has(produto.id),
                menorPreco: menorPreco.get(produto.id),
                temCompraColetiva: coletiva.has(produto.id),
              }))}
            />
          </section>
        )}

        {/* Produtos recentes — antes das lojas: produto converte, loja navega */}
        {!semCep && (
        <section id="produtos" className="max-w-[1280px] mx-auto px-4 sm:px-6 mt-6 sm:mt-10 scroll-mt-24">
          <TituloSecao>Produtos recentes</TituloSecao>
          {produtosError ? (
            <ErrorState
              title="Não foi possível carregar os produtos"
              detail="Recarregue a página em alguns instantes."
            />
          ) : imagensError ? (
            <ErrorState
              title="Não foi possível carregar as imagens dos produtos"
              detail="Recarregue a página em alguns instantes."
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
                menorPreco: menorPreco.get(produto.id),
                temCompraColetiva: coletiva.has(produto.id),
              }))}
            />
          ) : (
            <p className="text-sm text-muted">
              Nenhum produto chega no CEP{" "}
              <span className="num">{enderecoComprador?.cep}</span> ainda. Troque o CEP no topo da página ou{" "}
              <a href="#lojas" className="font-semibold text-lm-azul underline underline-offset-2">
                veja as indústrias da plataforma
              </a>
              .
            </p>
          )}
        </section>
        )}

        {/* Supermercado & Hortifruti — categoria real, produtos reais */}
        {produtosSupermercado.length > 0 && (
          <section id="supermercado" className="max-w-[1280px] mx-auto px-4 sm:px-6 mt-6 sm:mt-10 scroll-mt-24">
            <TituloSecao>Supermercado &amp; Hortifruti</TituloSecao>
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
                menorPreco: menorPreco.get(produto.id),
                temCompraColetiva: coletiva.has(produto.id),
              }))}
            />
          ),
        )}

        {/* Venda Futura num bloco só (crítica 19/09): explicação curta, datas
            com os produtos sortidos por loja e FAQ. O trilho separado que
            repetia os mesmos itens saiu. */}
        <div id="mercado-futuro" className="scroll-mt-24">
          <MercadoFuturoIntro>
            <div id="mercado-futuro-datas" className="scroll-mt-24">
              <MercadoFuturo itens={sortirPorLoja(itensMercadoFuturo, porLoja)} />
            </div>
          </MercadoFuturoIntro>
        </div>

        {/* Lojas */}
        <section id="lojas" className="max-w-[1280px] mx-auto px-4 sm:px-6 mt-6 sm:mt-10 mb-8 sm:mb-12 scroll-mt-24">
          <TituloSecao>
            {semCep ? "Indústrias da plataforma" : "Indústrias que entregam no seu CEP"}
          </TituloSecao>
          {lojasError ? (
            <ErrorState
              title="Não foi possível carregar as lojas"
              detail="Recarregue a página em alguns instantes."
            />
          ) : lojasNaCobertura.length > 0 ? (
            <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 lg:grid-cols-4">
              {lojasNaCobertura.map((loja) => (
                <div key={loja.id} className="w-[72vw] max-w-[280px] shrink-0 snap-start sm:w-auto sm:max-w-none">
                  <LojaCard loja={loja} />
                </div>
              ))}
            </div>
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
