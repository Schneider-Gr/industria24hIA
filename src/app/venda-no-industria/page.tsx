import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { VitrineHeader, VitrineFooter } from "@/components/vitrine/ui";
import { SimuladorMargem } from "@/components/vitrine/SimuladorMargem";
import { CtaWhatsAppLead } from "@/components/CtaWhatsAppLead";

export const metadata: Metadata = {
  title: "Venda direto da indústria para o seu consumidor — Indústria 24h",
  description:
    "Cadastre sua indústria na Indústria 24h: venda direta sem intermediário, taxa de 5% só sobre o que vender, pagamento retido até a entrega, venda futura, desconto progressivo e compra coletiva.",
};

// Landing de conversão para o CTA do BannerRecrutamentoSeller, do botão
// "Vender no 24h" do header e do subdomínio vender.industria24.com.br
// (rewrite de host no next.config.ts). Issue #542.
//
// O conteúdo vem do material comercial já validado em campo pelo Key Account
// (pitch de captação, playbook de objeções, manual do seller) — a conta do
// atravessador, o split e as objeções são os mesmos que o vendedor usa na
// ligação, não texto novo de marketing.
//
// CLAUDE.md regra 1: só entra o que já existe em produção. Fulfillment e
// centro de distribuição aparecem como opcionais e sem percentual porque as
// taxas de logística e armazenagem seguem marcadas como "a confirmar" no
// próprio playbook.
// Atendimento humano do Key Account (Manaus). Fica fixo no rodapé da tela
// durante toda a rolagem: o CTA do bot qualifica e vira lead, este é a saída
// direta para quem prefere falar com uma pessoa.
const WHATSAPP_NUMERO = "5592981139950";
const WHATSAPP_MENSAGEM = "Olá! Tenho uma indústria e quero vender na Indústria 24h.";
const WHATSAPP_HREF = `https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(WHATSAPP_MENSAGEM)}`;

const CTA_CLASSES =
  "inline-block cursor-pointer rounded-sm bg-lm-amarelo px-8 py-4 font-display text-sm font-bold uppercase tracking-[.04em] text-lm-marinho transition-[filter] hover:brightness-95";

const CTA_SECUNDARIO_CLASSES =
  "font-display inline-block rounded-sm border-[1.5px] border-white/45 px-7 py-4 text-sm font-bold uppercase tracking-[.04em] text-white transition-colors hover:bg-white/10";

const EYEBROW_CLARO = "font-display text-xs font-bold uppercase tracking-[.16em] text-sinal";
const EYEBROW_ESCURO = "font-display text-xs font-bold uppercase tracking-[.16em] text-lm-amarelo";
const H2_CLARO = "font-display mt-3 text-2xl font-extrabold tracking-[-.02em] text-ink sm:text-[30px]";
const H2_ESCURO = "font-display mt-3 text-2xl font-extrabold tracking-[-.02em] text-white sm:text-[30px]";

const FATOS_HERO = [
  "Sem mensalidade",
  "5% só na venda concluída",
  "Repasse via PIX",
  "Da Amazônia para todo o Brasil",
] as const;

const ETAPAS = [
  {
    n: "01",
    titulo: "Você cadastra a fábrica e publica os produtos",
    texto:
      "Ficha, foto, unidade de venda e estoque. Categorias de alimentos, construção, ferramentas, insumos e mais — atacado e varejo na mesma vitrine.",
  },
  {
    n: "02",
    titulo: "Você define a regra de preço de cada item",
    texto:
      "Preço cheio, faixas progressivas por quantidade, lote de venda futura, desconto para um cliente específico ou cupom de primeira compra. Cada produto pode ter a sua própria regra.",
  },
  {
    n: "03",
    titulo: "O comprador informa o CEP e fecha o pedido",
    texto:
      "Ele vê prazo e frete antes de comprar, calculados a partir do seu estoque mais próximo. O pagamento sai da conta dele e fica retido na plataforma.",
  },
  {
    n: "04",
    titulo: "Você separa e envia",
    texto:
      "Com a sua transportadora, com a sua tabela de frete, com parceiros locais ou por Uber Direct e 99 nas entregas dentro da cidade.",
  },
  {
    n: "05",
    titulo: "O comprador informa o código de confirmação e o repasse é liberado",
    texto:
      "O valor cai via PIX. Se houve afiliado na venda, o split acontece no mesmo momento — a comissão sai do pedido, nunca do seu caixa.",
  },
] as const;

const MOTORES = [
  {
    tag: "Venda futura",
    titulo: "Venda o lote antes de produzir",
    texto:
      "Você anuncia a produção em andamento, informa a quantidade, trava o preço e escolhe a data de entrega. O comprador reserva e paga pelo valor combinado.",
    itens: [
      "Produção puxada por demanda já confirmada",
      "Menos risco de estoque parado",
      "Capital de giro antes do lote fechar",
    ],
  },
  {
    tag: "Compra coletiva",
    titulo: "Junte compradores pequenos até fechar o lote",
    texto:
      "Você define quantidade mínima, prazo e preço do lote. Empresas diferentes somam seus pedidos até bater a meta — e ninguém é cobrado antes de ela ser atingida.",
    itens: ["Vende lote inteiro sem depender de um só comprador", "Abre a porta para o pequeno varejo"],
  },
  {
    tag: "Preço progressivo",
    titulo: "Quanto maior o pedido, menor o preço unitário",
    texto:
      "Faixas de preço definidas por você. O valor por unidade cai sozinho conforme o comprador aumenta a quantidade — sem negociar caso a caso.",
    itens: ["Aumenta o volume médio de cada pedido", "Regra igual para todos, sem desgaste comercial"],
  },
  {
    tag: "Desconto por cliente",
    titulo: "Condição especial sem mexer na tabela",
    texto:
      "Crie um desconto exclusivo para um comprador importante, um cupom de primeira compra ou uma oferta com validade para girar um item parado.",
    itens: ["Você escolhe cliente, produto, valor e período", "A base inteira não vê aquele preço"],
  },
  {
    tag: "Afiliados",
    titulo: "Representantes sem folha de pagamento",
    texto:
      "Afiliados, representantes, motoristas e estabelecimentos parceiros divulgam seus produtos por um link próprio. Você escolhe quais produtos entram e a comissão de cada um.",
    itens: ["Você aprova cada afiliação", "Comissão paga automaticamente pelo split", "Sem venda, sem comissão"],
  },
  {
    tag: "Múltiplos estoques",
    titulo: "O mesmo produto saindo do estoque mais perto",
    texto:
      "Cadastre estoques em locais diferentes e atenda cada comprador a partir do ponto mais próximo dele. Centros de distribuição parceiros são opcionais e cotados à parte.",
    itens: ["Frete menor e entrega mais rápida", "Comece pela fábrica e avance conforme vender"],
  },
] as const;

const ALCANCE = [
  { texto: "Frete visível ", forte: "antes", resto: " de o comprador concluir o pedido" },
  { texto: "Sua transportadora, sua tabela de frete ou ", forte: "parceiros locais", resto: "" },
  { texto: "Entrega no mesmo dia dentro da cidade com ", forte: "Uber Direct e 99", resto: "" },
  { texto: "Centros de distribuição parceiros ", forte: "sem investir em galpão novo", resto: "" },
] as const;

const DINHEIRO = [
  {
    n: "Antes do envio",
    titulo: "Valor retido",
    texto: "O comprador paga e a plataforma segura o valor. Você produz e separa sabendo que o dinheiro já entrou.",
  },
  {
    n: "Na entrega",
    titulo: "Código de confirmação",
    texto: "O comprador informa o código no recebimento. É esse aceite que destrava o repasse.",
  },
  {
    n: "No repasse",
    titulo: "Split automático",
    texto:
      "Fábrica, afiliado e plataforma recebem cada um a sua parte no mesmo pedido, sem acerto manual depois.",
  },
  {
    n: "Na nota",
    titulo: "Faturamento é seu",
    texto: "A nota fiscal continua sendo emitida pela sua empresa. A marca que aparece no pedido é a sua.",
  },
] as const;

const PRECO = [
  {
    valor: "R$ 0",
    titulo: "Para cadastrar e abrir a loja",
    texto: "Cadastro da indústria, publicação de produtos e vitrine no ar sem custo.",
  },
  {
    valor: "R$ 0",
    titulo: "De mensalidade",
    texto: "Loja parada não gera cobrança. Não existe plano, fidelidade ou taxa fixa mensal.",
  },
  {
    valor: "5%",
    titulo: "Por venda concluída",
    texto:
      "Cobrado apenas no pedido entregue e confirmado. A comissão de afiliado, quando houver, é a que você mesmo definiu.",
  },
] as const;

const DUVIDAS = [
  {
    pergunta: "Eu já vendo pelo distribuidor. Isso não vai criar conflito?",
    resposta:
      "Você decide quais produtos entram na plataforma, o preço de cada um e para quem oferece condição especial. Muitas indústrias começam com uma linha específica, um item de giro rápido ou um lote de venda futura — sem tocar na tabela do canal atual.",
  },
  {
    pergunta: "Quem emite a nota fiscal do pedido?",
    resposta:
      "A sua empresa. O faturamento continua sendo da sua indústria; a plataforma opera a vitrine, o pagamento e o repasse.",
  },
  {
    pergunta: "E se o comprador não pagar?",
    resposta:
      "Ele paga antes do envio e o valor fica retido na plataforma. O repasse só é liberado depois que ele informa o código de confirmação da entrega. Disputa aberta pelo comprador: 7 dias para abrir, 24h para você responder no painel.",
  },
  {
    pergunta: "Preciso ter estoque em outro estado para vender para lá?",
    resposta:
      "Não. Comece enviando da própria fábrica. Se o volume justificar, você cadastra estoques em outros locais ou usa centros de distribuição parceiros para ficar mais perto do comprador.",
  },
  {
    pergunta: "Quanto custa manter afiliados e representantes?",
    resposta:
      "Nada enquanto não houver venda. A comissão é um percentual definido por você, produto a produto, e sai do próprio pedido no split — nunca do seu caixa.",
  },
  {
    pergunta: "E se eu não conseguir vender o lote inteiro para um só comprador?",
    resposta:
      "Use a compra coletiva: vários compradores somam pedidos até atingir a quantidade mínima que você definiu. Enquanto a meta não fecha, ninguém é cobrado.",
  },
  {
    pergunta: "Não tenho ninguém para mexer nisso.",
    resposta:
      "O cadastro é assistido: subimos seus produtos e treinamos uma pessoa da sua equipe. Depois é receber o pedido no painel e separar a mercadoria.",
  },
] as const;

export default function VendaNoIndustriaPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <VitrineHeader />

      <main className="flex-1">
        {/* Hero */}
        <section className="bg-lm-marinho">
          <div className="mx-auto grid max-w-[1080px] grid-cols-1 items-end gap-10 px-4 pt-14 sm:px-6 sm:pt-20 md:grid-cols-[1.15fr_.85fr] md:gap-14">
            <div className="pb-14 sm:pb-16">
              <p className={EYEBROW_ESCURO}>Para indústrias, fábricas e produtores</p>
              <h1 className="font-display mt-4 max-w-[20ch] text-[32px] font-extrabold leading-[1.08] tracking-[-.02em] text-white sm:text-[48px]">
                A margem que fica no meio do caminho{" "}
                <span className="bg-gradient-to-b from-lm-amarelo to-lm-amarelo bg-[length:100%_.13em] bg-[position:0_96%] bg-no-repeat decoration-clone">
                  é sua
                </span>
                .
              </h1>
              <p className="mt-5 max-w-[52ch] text-base leading-relaxed text-white/80 sm:text-lg">
                Você fabrica. O distribuidor revende. Na Indústria 24h sua produção vai direto da fábrica ao comprador —
                com a nota fiscal da sua empresa, o preço definido por você e o pagamento retido até a entrega ser
                confirmada.
              </p>
              <div className="mt-8 flex flex-wrap gap-3.5">
                <CtaWhatsAppLead href={WHATSAPP_HREF} className={CTA_CLASSES}>
                  Falar com um consultor
                </CtaWhatsAppLead>
                <Link href="/vender" className={CTA_SECUNDARIO_CLASSES}>
                  Cadastrar minha indústria
                </Link>
              </div>
              <ul className="mt-8 flex flex-wrap gap-x-7 gap-y-2.5 border-t border-white/15 pt-6 text-[13.5px] text-white/75">
                {FATOS_HERO.map((fato) => (
                  <li key={fato} className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 flex-none rounded-full bg-lm-amarelo" aria-hidden />
                    {fato}
                  </li>
                ))}
              </ul>
            </div>

            <div className="relative hidden self-end md:block">
              <Image
                src="/venda/fabrica-hero.jpg"
                alt=""
                width={614}
                height={760}
                priority
                className="ml-auto w-full max-w-[420px] rounded-t-sm"
              />
              <div
                className="pointer-events-none absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-b from-transparent to-lm-marinho"
                aria-hidden
              />
            </div>
          </div>
        </section>

        {/* Simulador da conta do atravessador */}
        <section className="bg-[#0b1c2a]" id="conta">
          <div className="mx-auto max-w-[1080px] px-4 py-14 sm:px-6 sm:py-16">
            <p className={EYEBROW_ESCURO}>A conta</p>
            <h2 className={H2_ESCURO}>Quanto da sua caixa está indo para o intermediário?</h2>
            <p className="mt-3.5 max-w-[60ch] text-[16.5px] leading-relaxed text-white/75">
              Mexa nos três números da sua operação. A simulação divide a diferença ao meio: você vende direto por menos
              do que o lojista paga hoje e ainda leva mais por caixa do que a fábrica leva agora.
            </p>
            <div className="mt-9">
              <SimuladorMargem />
            </div>
          </div>
        </section>

        {/* Etapas */}
        <section className="mx-auto max-w-[1080px] px-4 py-14 sm:px-6 sm:py-16" id="funciona">
          <p className={EYEBROW_CLARO}>Da inscrição ao PIX</p>
          <h2 className={H2_CLARO}>Cinco etapas. Nenhuma delas depende de um atravessador.</h2>
          <p className="mt-3.5 max-w-[62ch] text-[16.5px] leading-relaxed text-ink-2">
            O cadastro é gratuito e a loja fica no ar com o nome da sua indústria. Depois disso, a operação é a mesma
            para todo pedido:
          </p>

          <ol className="relative mt-10">
            <div className="absolute bottom-3 left-[19px] top-3 w-px bg-line" aria-hidden />
            {ETAPAS.map((e) => (
              <li key={e.n} className="relative pb-8 pl-[62px] last:pb-0">
                <span className="font-display absolute left-0 top-0 grid h-[39px] w-[39px] place-items-center rounded-full border border-line bg-white text-[13px] font-bold text-lm-azul">
                  {e.n}
                </span>
                <h3 className="font-display text-[17px] font-bold leading-tight text-ink">{e.titulo}</h3>
                <p className="mt-1.5 max-w-[58ch] text-[14.5px] leading-relaxed text-ink-2">{e.texto}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Motores de venda */}
        <section className="border-t border-line bg-lm-cinza" id="motores">
          <div className="mx-auto max-w-[1080px] px-4 py-14 sm:px-6 sm:py-16">
            <p className={EYEBROW_CLARO}>Formas de vender</p>
            <h2 className={H2_CLARO}>Seis maneiras de fechar um pedido que a sua fábrica não tem hoje.</h2>
            <p className="mt-3.5 max-w-[62ch] text-[16.5px] leading-relaxed text-ink-2">
              Cada uma resolve um travamento diferente: o cliente que não fecha o lote, a produção que ainda não saiu, a
              região onde você não tem representante.
            </p>

            <div className="mt-9 grid grid-cols-1 gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
              {MOTORES.map((m) => (
                <article key={m.tag} className="flex flex-col gap-2.5 bg-white p-7">
                  <span className="font-display text-[11px] font-bold uppercase tracking-[.14em] text-lm-azul">
                    {m.tag}
                  </span>
                  <h3 className="font-display text-[17px] font-bold leading-tight text-ink">{m.titulo}</h3>
                  <p className="text-[14.5px] leading-relaxed text-ink-2">{m.texto}</p>
                  <ul className="mt-1 list-disc pl-[18px] text-[13.5px] leading-relaxed text-ink-2">
                    {m.itens.map((i) => (
                      <li key={i} className="mt-1">
                        {i}
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Alcance por CEP */}
        <section className="border-y border-line bg-white">
          <div className="mx-auto grid max-w-[1080px] grid-cols-1 items-center gap-9 px-4 py-14 sm:px-6 sm:py-16 md:grid-cols-2 md:gap-14">
            <Image
              src="/venda/galpao-estoque.jpg"
              alt="Galpão da Indústria 24h com paletes e caixas prontos para expedição"
              width={1200}
              height={642}
              className="w-full rounded-sm"
            />
            <div>
              <p className={EYEBROW_CLARO}>Alcance</p>
              <h2 className={H2_CLARO}>O CEP do comprador é o que define o seu alcance — não o seu galpão.</h2>
              <p className="mt-3.5 text-[16.5px] leading-relaxed text-ink-2">
                Quando o cliente informa o CEP, a plataforma mostra os produtos disponíveis para aquela localização, com
                prazo e frete já calculados. Menos distância significa frete mais competitivo e mais pedidos fechados.
              </p>
              <ul className="mt-6 grid grid-cols-1 gap-3.5">
              {ALCANCE.map((a) => (
                <li key={a.forte} className="flex gap-3 text-[15px] leading-relaxed text-ink-2">
                  <span className="mt-0.5 grid h-[21px] w-[21px] flex-none place-items-center rounded-full bg-verde-24h">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <polyline points="4,13 9,18 20,6" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                  </span>
                  <span>
                    {a.texto}
                    <b className="text-ink">{a.forte}</b>
                    {a.resto}
                  </span>
                </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Risco do dinheiro */}
        <section className="mx-auto max-w-[1080px] px-4 py-14 sm:px-6 sm:py-16">
          <p className={EYEBROW_CLARO}>Risco do dinheiro</p>
          <h2 className={H2_CLARO}>Você não envia mercadoria torcendo para receber.</h2>
          <p className="mt-3.5 max-w-[62ch] text-[16.5px] leading-relaxed text-ink-2">
            O pagamento é vinculado ao pedido do começo ao fim. Nenhuma etapa depende de confiança entre desconhecidos.
          </p>
          <div className="mt-9 grid grid-cols-1 gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
            {DINHEIRO.map((d) => (
              <div key={d.n} className="bg-white p-6">
                <span className="font-display text-[11px] font-bold uppercase tracking-[.14em] text-lm-azul">
                  {d.n}
                </span>
                <h3 className="font-display mt-3 text-[16px] font-bold text-ink">{d.titulo}</h3>
                <p className="mt-2 text-[13.5px] leading-relaxed text-ink-2">{d.texto}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Preço */}
        <section className="bg-lm-marinho" id="custo">
          <div className="mx-auto max-w-[1080px] px-4 py-14 sm:px-6 sm:py-16">
            <p className={EYEBROW_ESCURO}>Quanto custa</p>
            <h2 className={H2_ESCURO}>Você só paga quando vende.</h2>
            <div className="mt-9 grid grid-cols-1 gap-px border border-white/15 bg-white/15 md:grid-cols-3">
              {PRECO.map((p) => (
                <div key={p.titulo} className="bg-lm-marinho p-7">
                  <p className="font-display text-[clamp(2.6rem,6vw,3.4rem)] font-extrabold leading-none tabular-nums text-lm-amarelo">
                    {p.valor}
                  </p>
                  <h3 className="font-display mt-3.5 text-[17px] font-bold text-white">{p.titulo}</h3>
                  <p className="mt-2 text-[14px] leading-relaxed text-white/75">{p.texto}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Dúvidas */}
        <section className="mx-auto max-w-[760px] px-4 py-14 sm:px-6 sm:py-16">
          <p className={EYEBROW_CLARO}>Antes de decidir</p>
          <h2 className={H2_CLARO}>As perguntas que toda fábrica faz.</h2>
          <div className="mt-7 border-t border-line">
            {DUVIDAS.map((d, i) => (
              <details key={d.pergunta} open={i === 0} className="group border-b border-line">
                <summary className="font-display flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-[16.5px] font-bold text-lm-marinho [&::-webkit-details-marker]:hidden">
                  {d.pergunta}
                  <span
                    className="mt-[-4px] h-2.5 w-2.5 flex-none rotate-45 border-b-2 border-r-2 border-sinal transition-transform group-open:mt-[2px] group-open:rotate-[225deg]"
                    aria-hidden
                  />
                </summary>
                <p className="max-w-[66ch] pb-6 text-[14.5px] leading-relaxed text-ink-2">{d.resposta}</p>
              </details>
            ))}
          </div>
        </section>

        {/* CTA final */}
        <section className="bg-lm-marinho">
          <div className="mx-auto max-w-[760px] px-4 py-14 text-center sm:px-6 sm:py-16">
            <p className={EYEBROW_ESCURO}>Comece hoje</p>
            <h2 className={H2_ESCURO}>Sua próxima produção pode já estar vendida.</h2>
            <p className="mx-auto mt-3.5 max-w-[52ch] text-[15px] leading-relaxed text-white/80">
              Fale com um consultor no WhatsApp: ele tira as dúvidas na hora e faz o cadastro junto com você. Leva
              cerca de 30 minutos e seus primeiros produtos já saem publicados.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3.5">
              <CtaWhatsAppLead href={WHATSAPP_HREF} className={CTA_CLASSES}>
                Falar com um consultor
              </CtaWhatsAppLead>
              <Link href="/vender" className={CTA_SECUNDARIO_CLASSES}>
                Prefiro me cadastrar sozinho
              </Link>
            </div>
            <p className="mt-5 text-[12.5px] text-white/60">
              Cadastro gratuito, sem mensalidade e sem fidelidade. A plataforma só ganha quando você vende.
            </p>
          </div>
        </section>
      </main>

      <CtaWhatsAppLead
        href={WHATSAPP_HREF}
        ariaLabel="Falar no WhatsApp com um consultor"
        className="font-display fixed bottom-[8.5rem] right-3 z-50 md:bottom-40 md:right-4 flex items-center gap-2.5 rounded-full bg-[#25D366] p-4 text-sm font-bold text-white shadow-lg transition-[filter] hover:brightness-95 sm:px-5 sm:py-3.5"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 flex-none" aria-hidden>
          <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.61-.92-2.21-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.06 2.87 1.21 3.07.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.69.63.71.22 1.36.19 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35zM12.05 21.8h-.01a9.8 9.8 0 0 1-4.99-1.37l-.36-.21-3.71.97.99-3.62-.23-.37a9.78 9.78 0 0 1-1.5-5.23c0-5.4 4.4-9.8 9.81-9.8 2.62 0 5.08 1.02 6.93 2.88a9.74 9.74 0 0 1 2.87 6.93c0 5.4-4.4 9.8-9.8 9.8zM20.4 3.6A11.72 11.72 0 0 0 12.05 0C5.6 0 .35 5.25.35 11.7c0 2.06.54 4.08 1.57 5.85L.25 24l6.6-1.73a11.68 11.68 0 0 0 5.2 1.24h.01c6.45 0 11.7-5.25 11.7-11.7 0-3.13-1.22-6.07-3.43-8.29z" />
        </svg>
        <span className="hidden sm:inline">WhatsApp</span>
      </CtaWhatsAppLead>

      <VitrineFooter />
    </div>
  );
}
