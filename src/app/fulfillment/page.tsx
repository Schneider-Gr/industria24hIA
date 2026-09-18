import type { Metadata } from "next";
import Image from "next/image";
import { VitrineHeader, VitrineFooter } from "@/components/vitrine/ui";
import { CtaWhatsAppLead } from "@/components/CtaWhatsAppLead";

export const metadata: Metadata = {
  title: "Estoque Indústria: sua mercadoria guardada no CD de Manaus — Indústria 24h",
  description:
    "Programa de armazenagem do Indústria 24h: você envia a mercadoria ao CD em Manaus, nós conferimos, guardamos, separamos e expedimos cada pedido. Valores negociados em contrato com a sua loja.",
};

// LP do programa de fulfillment (PRDs 036/039/040). Regra: só prometer o que
// os PRDs descrevem. Custódia (039) ainda está em implantação, por isso a
// página fala em piloto e interesse, nunca em "contrate agora". Tarifas não
// existem (040 define estrutura, não valores): nenhum número de preço aqui.
const WHATSAPP_HREF = `https://wa.me/5592981139950?text=${encodeURIComponent(
  "Olá! Tenho interesse no Estoque Indústria (armazenagem no CD de Manaus).",
)}`;

const CTA = "inline-block rounded-md bg-lm-azul px-7 py-4 font-display text-sm font-bold text-white transition-colors hover:bg-lm-azul-escuro";
const EYEBROW = "font-display text-xs font-bold uppercase tracking-[.16em] text-lm-azul";
const EYEBROW_ESCURO = "font-display text-xs font-bold uppercase tracking-[.16em] text-lm-amarelo";
const H2 = "font-display mt-3 text-2xl font-semibold tracking-[-.015em] text-ink sm:text-[30px]";
const H2_ESCURO = "font-display mt-3 text-2xl font-semibold tracking-[-.015em] text-white sm:text-[30px]";
const SECAO = "mx-auto max-w-[1080px] px-4 py-14 sm:px-6 sm:py-16";

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

export default function FulfillmentPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <VitrineHeader />

      <main className="flex-1">
        {/* Hero */}
        <section className="bg-lm-marinho">
          <div className="mx-auto grid max-w-[1080px] grid-cols-1 items-center gap-10 px-4 py-14 sm:px-6 sm:py-20 md:grid-cols-[1.1fr_.9fr] md:gap-14">
            <div>
              <p className={EYEBROW_ESCURO}>Estoque Indústria · CD de Manaus</p>
              <h1 className="font-display mt-4 max-w-[20ch] text-[32px] font-bold leading-[1.1] tracking-[-.02em] text-white sm:text-[46px]">
                Você fabrica. A gente guarda, separa e despacha.
              </h1>
              <p className="mt-5 max-w-[52ch] text-base leading-relaxed text-white/80 sm:text-lg">
                Envie sua mercadoria ao CD do Indústria 24h em Manaus. Conferimos na chegada, guardamos em posição
                endereçada e expedimos cada pedido pago na vitrine. Você acompanha cada unidade pelo painel.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <CtaWhatsAppLead href={WHATSAPP_HREF} className={CTA}>
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
              src="/fulfillment/operador-cd-manaus.jpg"
              alt="Operador do Indústria 24h no centro de distribuição, com prateleiras de caixas ao fundo"
              width={1408}
              height={768}
              priority
              sizes="(min-width: 768px) 460px, 100vw"
              className="w-full rounded-xl object-cover"
            />
          </div>
        </section>

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
              <CtaWhatsAppLead href={WHATSAPP_HREF} className={CTA}>
                Pedir uma proposta de contrato
              </CtaWhatsAppLead>
            </div>
          </div>
        </section>

        {/* Requisitos */}
        <section className="border-b border-line">
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
              src="/venda/galpao-estoque.jpg"
              alt="Galpão com paletes e caixas prontos para expedição"
              width={1200}
              height={642}
              sizes="(min-width: 768px) 500px, 100vw"
              className="w-full rounded-xl"
            />
          </div>
        </section>

        {/* FAQ */}
        <section className="mx-auto max-w-[760px] px-4 py-14 sm:px-6 sm:py-16">
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
              <CtaWhatsAppLead href={WHATSAPP_HREF} className={CTA}>
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
