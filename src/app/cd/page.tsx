import type { Metadata } from "next";
import Image from "next/image";
import { VitrineHeader, VitrineFooter } from "@/components/vitrine/ui";
import { CtaWhatsAppLead } from "@/components/CtaWhatsAppLead";

export const metadata: Metadata = {
  title: "Estoque Indústria: armazenagem no Amazonas e no Acre",
  alternates: { canonical: "/cd" },
  description:
    "Programa de armazenagem do Indústria 24h no Amazonas (CD de Manaus) e no Acre (Rio Branco, em implantação): você envia a mercadoria, nós conferimos, guardamos, separamos e expedimos cada pedido. Valores negociados em contrato com a sua loja.",
};

// LP do programa de fulfillment (PRDs 036/039/040). Regra: só prometer o que
// os PRDs descrevem. Custódia (039) ainda está em implantação, por isso a
// página fala em piloto e interesse, nunca em "contrate agora". Tarifas não
// existem (040 define estrutura, não valores): nenhum número de preço aqui.
const WHATSAPP_HREF = `https://wa.me/5592981139950?text=${encodeURIComponent(
  "Olá! Tenho interesse no Estoque Indústria (armazenagem no Amazonas e no Acre).",
)}`;

const CTA = "inline-block rounded-md bg-lm-azul px-7 py-4 font-display text-sm font-bold text-white transition-colors hover:bg-lm-azul-escuro";
const EYEBROW = "font-display text-xs font-bold uppercase tracking-[.16em] text-lm-azul";
const EYEBROW_ESCURO = "font-display text-xs font-bold uppercase tracking-[.16em] text-lm-amarelo";
const H2 = "font-display mt-3 text-2xl font-semibold tracking-[-.015em] text-ink sm:text-[30px]";
const H2_ESCURO = "font-display mt-3 text-2xl font-semibold tracking-[-.015em] text-white sm:text-[30px]";
const SECAO = "mx-auto max-w-[1080px] scroll-mt-16 px-4 py-14 sm:px-6 sm:py-16";

const PASSOS = [
  {
    titulo: "Você avisa o que vai enviar",
    texto: "No painel, você cria um aviso de recebimento com os produtos e as quantidades. A carga ganha um identificador para você acompanhar.",
  },
  {
    titulo: "Nós recebemos e conferimos",
    texto: "Um operador identificado conta cada produto na chegada. O que vale é a quantidade conferida, e qualquer diferença fica registrada com motivo e foto, visível para você.",
  },
  {
    titulo: "A mercadoria ganha um endereço",
    texto: "Cada item é guardado numa posição do galpão (rua, prédio, nível). Só depois de endereçado ele vira saldo disponível para venda.",
  },
  {
    titulo: "O comprador compra na vitrine",
    texto: "O pedido pago reserva o saldo. Dois compradores não levam a mesma unidade.",
  },
  {
    titulo: "Separamos e expedimos",
    texto: "O pedido gera uma ordem de separação com a posição de origem. A expedição dá a baixa no estoque e o pedido passa para Enviado.",
  },
] as const;

const BENEFICIOS = [
  { titulo: "Sem galpão próprio em Manaus", texto: "Sua mercadoria fica perto de quem compra na cidade, sem você alugar espaço ou contratar equipe de expedição." },
  { titulo: "Cada unidade tem rastro", texto: "Entrada, guarda, reserva e saída são lançamentos registrados. O saldo é a soma do que aconteceu, não um número digitado." },
  { titulo: "A mercadoria continua sendo sua", texto: "O Indústria 24h guarda como depositário. Não compra o seu estoque nem mexe no seu preço." },
  { titulo: "Você vê tudo no painel", texto: "Saldo em custódia, reservado, disponível e em conferência, por produto, com o resultado de cada recebimento." },
] as const;

const MUDA = [
  ["Quem separa e embala o pedido", "Você, na sua fábrica", "A operação do CD"],
  ["Quando o estoque vira venda", "Quando você lança o número", "Quando a carga é conferida e endereçada"],
  ["Divergência de quantidade", "Ajuste manual", "Registro com motivo e foto, visível a você"],
  ["Cobrança", "Só a comissão da venda", "Comissão da venda + fatura mensal da armazenagem, separadas"],
] as const;

const TARIFAS = [
  { titulo: "Entrada", texto: "Receber, conferir e guardar. Cobrada sobre a quantidade conferida, nunca a declarada. Avaria na chegada não é cobrada." },
  { titulo: "Armazenagem", texto: "Cobrada por posição ocupada no galpão, por mês. Sem mínimo mensal: posição vazia não gera cobrança." },
  { titulo: "Saída", texto: "Separar e expedir, cobrada por item expedido." },
] as const;

const REQUISITOS = [
  "Loja ativa no Indústria 24h, com os produtos já cadastrados",
  "Contrato de armazenagem assinado antes da primeira carga: sem contrato, o CD não recebe mercadoria",
  "Aviso de recebimento criado no painel antes de despachar",
  "Envio até o CD Indústria, na Rua Marapatá, 40, em Manaus (AM)",
] as const;

const DUVIDAS = [
  {
    p: "Quanto custa?",
    r: "Os valores são negociados em contrato com a sua loja, em três partes: entrada, armazenagem (por posição ocupada por mês) e saída. Não há mínimo mensal. Você conhece o preço antes de despachar a primeira caixa. Ainda não existe tabela pública.",
  },
  {
    p: "A armazenagem sai do meu repasse?",
    r: "Não. A armazenagem vem em fatura própria, mensal por loja, separada do repasse das vendas. Você acompanha a prévia do mês antes do fechamento, e cada item da fatura aponta para a movimentação que o gerou.",
  },
  {
    p: "E se chegar menos do que eu enviei?",
    r: "A conferência registra a diferença com motivo e foto, e ela aparece destacada no seu painel. Quantidade em disputa não é cobrada até a divergência ser resolvida.",
  },
  {
    p: "Quem responde por avaria ou extravio da mercadoria guardada?",
    r: "Você. A mercadoria continua sendo sua e o valor dela é declarado por você no envio. O programa não inclui seguro da mercadoria: se precisar dessa cobertura, contrate com a sua seguradora.",
  },
  {
    p: "E se chegar um produto que não estava no aviso?",
    r: "Ele é conferido à parte e só vira saldo depois que você confirmar.",
  },
  {
    p: "Posso manter parte do estoque na minha fábrica?",
    r: "Pode. O saldo do CD e o seu próprio aparecem separados no painel, nunca somados em silêncio. Se um pedido tiver itens das duas origens, cada uma tem a sua ordem de separação.",
  },
  {
    p: "O que acontece se um pedido for cancelado depois de separado?",
    r: "A mercadoria volta para a posição de origem com o registro do motivo. Devoluções de comprador também entram como nova entrada no estoque.",
  },
  {
    p: "Vocês trabalham com perecíveis e controle de validade?",
    r: "Ainda não. Nesta primeira fase a guarda segue a ordem de chegada, sem controle de lote e validade. Fale com a gente antes de enviar produto com prazo curto.",
  },
] as const;

// Navegação por âncoras logo abaixo do hero: a página é longa e quem chega do
// anúncio quer pular direto para "onde fica" ou "quanto custa".
const ANCORAS = [
  ["#como-funciona", "Como funciona"],
  ["#onde-guardamos", "Onde guardamos"],
  ["#tarifas", "Contrato"],
  ["#requisitos", "Requisitos"],
  ["#duvidas", "Dúvidas"],
] as const;

// Acre sem endereço confirmado: só cidade/estado e status. Não inventar
// endereço, capacidade nem data de abertura.
const UNIDADES = [
  {
    uf: "AM",
    cidade: "Manaus",
    status: "Piloto",
    endereco: "Rua Marapatá, 40 · CEP 69088-067",
    texto: "Primeira unidade do programa. É para cá que vão as cargas das lojas piloto.",
  },
  {
    uf: "AC",
    cidade: "Rio Branco",
    status: "Em implantação",
    endereco: null,
    texto: "Unidade em implantação. Endereço e data de início serão informados às lojas interessadas.",
  },
] as const;

const NORTE = [
  "Mercadoria já guardada na região, perto do comprador de Manaus e de Rio Branco",
  "Menos viagens da fábrica para atender cada pedido pequeno",
  "Uma operação para receber, guardar e despachar, em vez de montar a sua",
] as const;

export default function CdPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <VitrineHeader />

      <main className="flex-1">
        {/* Hero */}
        <section className="bg-lm-marinho">
          <div className="mx-auto grid max-w-[1080px] grid-cols-1 items-center gap-10 px-4 py-14 sm:px-6 sm:py-20 md:grid-cols-[1.1fr_.9fr] md:gap-14">
            <div>
              <p className={EYEBROW_ESCURO}>Estoque Indústria · Amazonas e Acre</p>
              <h1 className="font-display mt-4 max-w-[20ch] text-[32px] font-bold leading-[1.1] tracking-[-.02em] text-white sm:text-[46px]">
                Você fabrica. A gente guarda, separa e despacha.
              </h1>
              <p className="mt-5 max-w-[52ch] text-base leading-relaxed text-white/80 sm:text-lg">
                Envie sua mercadoria ao CD do Indústria 24h em Manaus. Conferimos na chegada, guardamos em posição
                endereçada e expedimos cada pedido pago na vitrine. Você acompanha cada unidade pelo painel.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <CtaWhatsAppLead href={WHATSAPP_HREF} className={CTA} contentName="whatsapp-cd">
                  Quero participar do piloto
                </CtaWhatsAppLead>
                <a href="#como-funciona" className="font-display text-sm font-bold text-white underline underline-offset-4">
                  Ver como funciona
                </a>
              </div>
              <p className="mt-6 border-t border-white/15 pt-5 text-[13.5px] text-white/70">
                Programa em implantação, com vagas limitadas para lojas piloto. Valores negociados em contrato, sem mínimo mensal.
              </p>
            </div>
            <Image
              src="/cd/operador-cd-manaus.jpg"
              alt="Operador do Indústria 24h no centro de distribuição, com prateleiras de caixas ao fundo"
              width={1400}
              height={764}
              priority
              sizes="(min-width: 768px) 460px, 100vw"
              className="w-full rounded-xl object-cover"
            />
          </div>
        </section>

        <nav aria-label="Seções da página" className="border-b border-line bg-white">
          <ul className="mx-auto flex max-w-[1080px] gap-2 overflow-x-auto px-4 py-3 sm:px-6">
            {ANCORAS.map(([href, rotulo]) => (
              <li key={href} className="flex-none">
                <a href={href} className="font-display block rounded-md bg-lm-cinza px-3.5 py-2 text-[13px] font-semibold text-lm-marinho hover:bg-lm-azul hover:text-white">
                  {rotulo}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {/* Passos */}
        <section className={SECAO} id="como-funciona">
          <p className={EYEBROW}>Como funciona</p>
          <h2 className={H2}>Da sua fábrica ao comprador, em cinco etapas.</h2>
          <ol className="relative mt-10">
            <div className="absolute bottom-3 left-[19px] top-3 w-px bg-line" aria-hidden />
            {PASSOS.map((e, i) => (
              <li key={e.titulo} className="relative pb-8 pl-[62px] last:pb-0">
                <span className="font-display absolute left-0 top-0 grid h-[39px] w-[39px] place-items-center rounded-full border border-line bg-white text-[13px] font-bold text-lm-azul">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="font-display text-[17px] font-semibold leading-tight text-ink">{e.titulo}</h3>
                <p className="mt-1.5 max-w-[58ch] text-[15px] leading-relaxed text-ink-2">{e.texto}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Benefícios */}
        <section className="border-y border-line bg-lm-cinza">
          <div className={SECAO}>
            <p className={EYEBROW}>Por que guardar com a gente</p>
            <h2 className={H2}>Menos operação na fábrica, mais controle sobre o estoque.</h2>
            <div className="mt-9 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {BENEFICIOS.map((b) => (
                <article key={b.titulo} className="rounded-xl bg-white p-6">
                  <h3 className="font-display text-[17px] font-semibold text-ink">{b.titulo}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-ink-2">{b.texto}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Onde guardamos */}
        <section className={SECAO} id="onde-guardamos">
          <div className="grid grid-cols-1 items-center gap-9 md:grid-cols-[1.05fr_.95fr] md:gap-14">
            <div>
              <p className={EYEBROW}>Onde guardamos</p>
              <h2 className={H2}>Estoque no Amazonas e, em breve, no Acre.</h2>
              <p className="mt-3.5 max-w-[56ch] text-[16px] leading-relaxed text-ink-2">
                O programa é pensado para quem vende na região Norte. Você escolhe a unidade mais perto de quem compra
                de você e manda a carga para lá.
              </p>
              <div className="mt-7 grid grid-cols-1 gap-3">
                {UNIDADES.map((u) => (
                  <article key={u.uf} className="rounded-xl border border-line p-5">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="font-display text-[18px] font-semibold text-ink">
                        {u.cidade} <span className="text-muted">· {u.uf}</span>
                      </h3>
                      <span
                        className={`font-display rounded px-2 py-1 text-[11px] font-bold uppercase tracking-wide ${
                          u.endereco ? "bg-lm-azul text-white" : "bg-lm-cinza text-lm-marinho"
                        }`}
                      >
                        {u.status}
                      </span>
                    </div>
                    {u.endereco && <p className="mt-2 text-[14px] font-semibold text-lm-marinho">{u.endereco}</p>}
                    <p className="mt-2 text-[14.5px] leading-relaxed text-ink-2">{u.texto}</p>
                  </article>
                ))}
              </div>
              <h3 className="font-display mt-8 text-[16px] font-semibold text-ink">O que isso resolve para o seller do Norte</h3>
              <ul className="mt-3 grid grid-cols-1 gap-2.5">
                {NORTE.map((n) => (
                  <li key={n} className="flex gap-3 text-[15px] leading-relaxed text-ink-2">
                    <span className="mt-2 h-2 w-2 flex-none rounded-full bg-lm-azul" aria-hidden />
                    {n}
                  </li>
                ))}
              </ul>
              <p className="mt-5 text-[13.5px] text-muted">
                O atendimento é regional. Não fazemos armazenagem em outros estados.
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-4">
                <CtaWhatsAppLead href={WHATSAPP_HREF} className={CTA} contentName="whatsapp-cd">
                  Quero guardar no Norte
                </CtaWhatsAppLead>
                <a href="#duvidas" className="font-display text-sm font-bold text-lm-azul underline underline-offset-4">
                  Ver perguntas frequentes
                </a>
              </div>
            </div>
            <Image
              src="/cd/hortifruti-estoque-regional.jpg"
              alt="Representante do Indústria 24h ao lado de gôndolas de hortifrúti abastecidas"
              width={1400}
              height={933}
              sizes="(min-width: 768px) 460px, 100vw"
              className="w-full rounded-xl object-cover"
            />
          </div>
        </section>

        {/* O que muda */}
        <section className={SECAO}>
          <p className={EYEBROW}>O que muda para você</p>
          <h2 className={H2}>O que sai da sua rotina e o que passa a acontecer no CD.</h2>
          <div className="mt-8 overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-left text-[14.5px]">
              <thead>
                <tr className="border-b border-line text-ink">
                  <th className="py-3 pr-4 font-semibold" />
                  <th className="py-3 pr-4 font-semibold">Vendendo da fábrica</th>
                  <th className="py-3 font-semibold text-lm-azul">Com o Estoque Indústria</th>
                </tr>
              </thead>
              <tbody>
                {MUDA.map(([item, antes, depois]) => (
                  <tr key={item} className="border-b border-line align-top text-ink-2">
                    <th scope="row" className="py-3 pr-4 font-semibold text-ink">{item}</th>
                    <td className="py-3 pr-4">{antes}</td>
                    <td className="py-3">{depois}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Contrato e tarifas */}
        <section className="bg-lm-marinho" id="tarifas">
          <div className={SECAO}>
            <p className={EYEBROW_ESCURO}>Contrato e tarifas</p>
            <h2 className={H2_ESCURO}>Valores negociados em contrato com a sua loja.</h2>
            <p className="mt-3.5 max-w-[62ch] text-[16px] leading-relaxed text-white/75">
              Cada loja tem o seu contrato, com vigência e preço definidos antes da primeira carga. A cobrança se divide
              no que realmente consome recurso:
            </p>
            <div className="mt-9 grid grid-cols-1 gap-px border border-white/15 bg-white/15 md:grid-cols-3">
              {TARIFAS.map((t) => (
                <div key={t.titulo} className="bg-lm-marinho p-7">
                  <h3 className="font-display text-[20px] font-semibold text-lm-amarelo">{t.titulo}</h3>
                  <p className="mt-2 text-[14.5px] leading-relaxed text-white/80">{t.texto}</p>
                </div>
              ))}
            </div>
            <ul className="mt-8 grid grid-cols-1 gap-2.5 text-[14.5px] text-white/80 sm:grid-cols-2">
              <li>Fatura própria, mensal por loja, separada do repasse das vendas.</li>
              <li>Sem mínimo mensal.</li>
              <li>Você declara o valor da mercadoria enviada e segue responsável por ela em caso de avaria ou extravio.</li>
              <li>Prévia do mês visível no painel antes do fechamento.</li>
              <li>Cada item da fatura aponta para a movimentação que o originou.</li>
              <li>Contestação de item com motivo, resolvida como crédito na fatura seguinte.</li>
            </ul>
            <div className="mt-9">
              <CtaWhatsAppLead href={WHATSAPP_HREF} className={CTA} contentName="whatsapp-cd">
                Pedir uma proposta de contrato
              </CtaWhatsAppLead>
            </div>
          </div>
        </section>

        {/* Requisitos */}
        <section className="scroll-mt-16 border-b border-line" id="requisitos">
          <div className="mx-auto grid max-w-[1080px] grid-cols-1 items-center gap-9 px-4 py-14 sm:px-6 sm:py-16 md:grid-cols-2 md:gap-14">
            <div>
              <p className={EYEBROW}>Requisitos</p>
              <h2 className={H2}>O que você precisa para começar.</h2>
              <ul className="mt-6 grid grid-cols-1 gap-3.5">
                {REQUISITOS.map((r) => (
                  <li key={r} className="flex gap-3 text-[15px] leading-relaxed text-ink-2">
                    <span className="mt-2 h-2 w-2 flex-none rounded-full bg-lm-azul" aria-hidden />
                    {r}
                  </li>
                ))}
              </ul>
            </div>
            <Image
              src="/cd/galpao-industria-conferencia.jpg"
              alt="Representante do Indústria 24h dentro de um galpão industrial"
              width={1400}
              height={764}
              sizes="(min-width: 768px) 500px, 100vw"
              className="w-full rounded-xl"
            />
          </div>
        </section>

        {/* FAQ */}
        <section className="mx-auto max-w-[760px] scroll-mt-16 px-4 py-14 sm:px-6 sm:py-16" id="duvidas">
          <p className={EYEBROW}>Perguntas frequentes</p>
          <h2 className={H2}>Antes de mandar a primeira caixa.</h2>
          <div className="mt-7 border-t border-line">
            {DUVIDAS.map((d, i) => (
              <details key={d.p} open={i === 0} className="group border-b border-line">
                <summary className="font-display flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-[16.5px] font-semibold text-lm-marinho [&::-webkit-details-marker]:hidden">
                  {d.p}
                  <span
                    className="mt-[-4px] h-2.5 w-2.5 flex-none rotate-45 border-b-2 border-r-2 border-lm-azul transition-transform group-open:mt-[2px] group-open:rotate-[225deg]"
                    aria-hidden
                  />
                </summary>
                <p className="pb-5 text-[15px] leading-relaxed text-ink-2">{d.r}</p>
              </details>
            ))}
          </div>
        </section>

        {/* CTA final */}
        <section className="bg-lm-cinza">
          <div className="mx-auto max-w-[760px] px-4 py-14 text-center sm:px-6 sm:py-16">
            <h2 className={H2}>Quer ser uma das lojas piloto?</h2>
            <p className="mx-auto mt-3.5 max-w-[52ch] text-[16px] leading-relaxed text-ink-2">
              Conte o que você fabrica e o volume que imagina guardar. Montamos a proposta de contrato com você.
            </p>
            <div className="mt-8">
              <CtaWhatsAppLead href={WHATSAPP_HREF} className={CTA} contentName="whatsapp-cd">
                Falar com a equipe do CD
              </CtaWhatsAppLead>
            </div>
          </div>
        </section>
      </main>

      <VitrineFooter />
    </div>
  );
}
