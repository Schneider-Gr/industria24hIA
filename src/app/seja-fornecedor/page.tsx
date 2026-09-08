import type { Metadata } from "next";
import Link from "next/link";
import { VitrineHeader, VitrineFooter } from "@/components/vitrine/ui";
import { CtaFalarComConsultor } from "@/components/vitrine/CtaFalarComConsultor";

export const metadata: Metadata = {
  title: "Venda direto para o Brasil inteiro — Indústria 24h",
  description:
    "Cadastre sua indústria na Indústria 24h: venda direta sem atravessador, taxa de 5% só sobre o que vender, pagamento retido até a entrega, venda futura, desconto progressivo e compra coletiva.",
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
// CLAUDE.md regra 1: só entra o que já existe em produção. Fulfillment
// aparece como opcional e sem percentual porque as taxas de logística e
// armazenagem seguem marcadas como "a confirmar" no próprio playbook.
const CTA_CLASSES =
  "inline-block cursor-pointer rounded-sm bg-lm-amarelo px-8 py-4 font-display text-sm font-bold uppercase tracking-[.04em] text-lm-marinho transition-[filter] hover:brightness-95";

const ALAVANCAS = [
  {
    titulo: "Desconto progressivo",
    texto:
      "Você configura as faixas de preço por quantidade uma vez. O comprador vê o degrau na tela e sobe o pedido sozinho, sem negociação caso a caso.",
  },
  {
    titulo: "Venda futura",
    texto:
      "Anuncie a produção antes de ela ficar pronta, com preço combinado e data de disponibilidade. O comprador reserva, você usa o pedido como capital de giro, e o site tira a oferta do ar quando a data vence.",
  },
  {
    titulo: "Compra coletiva",
    texto:
      "Compradores pequenos se juntam para bater a meta de volume do seu lote. Todos pagam o melhor preço quando a coletiva fecha, e ninguém é cobrado antes disso.",
  },
  {
    titulo: "Cupom da loja",
    texto:
      "Crie cupons da sua própria loja para destravar um cliente parado, fechar uma primeira compra ou girar um lote com data. O custeio é seu, então o desconto é a sua decisão.",
  },
] as const;

const FAIXAS_DESCONTO = [
  { qtd: "1 a 999", preco: "R$ 5,00", margem: "R$ 1,80" },
  { qtd: "a partir de 1.000", preco: "R$ 4,70", margem: "R$ 1,50" },
  { qtd: "a partir de 5.000", preco: "R$ 4,40", margem: "R$ 1,20" },
  { qtd: "a partir de 10.000", preco: "R$ 4,10", margem: "R$ 0,90" },
] as const;

const LOGISTICA = [
  {
    titulo: "Frete calculado na hora",
    texto: "O comprador vê o valor da entrega por distância antes de fechar o pedido, sem você cotar nada manualmente.",
  },
  {
    titulo: "Sua tabela de frete vence a global",
    texto:
      "Se você já tem transportadora, cadastra a tabela dela faixa a faixa e ela sobrescreve a tabela padrão na sua loja.",
  },
  {
    titulo: "Última milha por aplicativo",
    texto: "Uber Direct e 99 integrados para a entrega rápida na cidade, acionados a partir do pedido.",
  },
  {
    titulo: "Centro de distribuição opcional",
    texto:
      "Posicione estoque perto do comprador usando a rede de CDs, sem investir em galpão. Pay-per-use, cotado à parte, e você só usa se quiser.",
  },
] as const;

const ETAPAS = [
  { n: "Etapa 1", titulo: "Cadastro", texto: "CNPJ, dados da empresa e conta para receber. Gratuito e sem mensalidade." },
  {
    n: "Etapa 2",
    titulo: "Produtos no ar",
    texto: "Foto, preço, quantidade mínima, estoque e onde o produto se encontra. Sua loja entra na vitrine.",
  },
  {
    n: "Etapa 3",
    titulo: "Primeira venda",
    texto: "O pedido chega no painel, você separa e entrega, lança o código e recebe o PIX.",
  },
  {
    n: "Etapa 4",
    titulo: "Escala",
    texto: "Liga afiliados, desconto progressivo e venda futura sobre o que já está vendendo.",
  },
] as const;

const DUVIDAS = [
  {
    pergunta: "Quanto vou pagar?",
    resposta:
      "Zero de mensalidade. A plataforma fica com 5% sobre o que você vender. Se quiser que a gente cuide da armazenagem e da entrega, existem as taxas de fulfillment, passadas por escrito antes da contratação, e isso é opcional.",
  },
  {
    pergunta: "E se o cliente não pagar?",
    resposta:
      "Não tem esse risco. O pagamento entra antes e fica retido. Ele só cai na sua conta quando o comprador te passa o código de entrega. Você nunca manda mercadoria sem o dinheiro estar preso na plataforma.",
  },
  {
    pergunta: "Não tenho ninguém para mexer nisso.",
    resposta:
      "O cadastro é assistido: subimos seus produtos e treinamos uma pessoa da sua equipe. Depois é receber o pedido no painel e separar a mercadoria.",
  },
  {
    pergunta: "Eu vendo pouco pela internet.",
    resposta:
      "Aqui não é só um site. Existe uma rede de afiliados que vende seus produtos por comissão, e a venda futura, que te deixa vender a produção antes de fazer.",
  },
  {
    pergunta: "Tenho medo de encalhar estoque no depósito de vocês.",
    resposta:
      "O fulfillment é opcional. Comece com o estoque na sua própria fábrica e só a loja no ar. Se um produto girar bem, aí sim aproximamos ele de um centro de distribuição.",
  },
  {
    pergunta: "A nota fiscal continua sendo a minha?",
    resposta:
      "Sim. O faturamento sai com a nota fiscal da sua empresa. A plataforma é o canal de venda, não a vendedora do seu produto.",
  },
] as const;

export default function SejaFornecedorPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <VitrineHeader />

      <main className="flex-1">
        {/* Hero */}
        <section className="bg-lm-marinho">
          <div className="mx-auto max-w-[1080px] px-4 py-16 sm:px-6 sm:py-20">
            <p className="font-display text-xs font-bold uppercase tracking-[.16em] text-lm-amarelo">
              Para indústrias e produtores
            </p>
            <h1 className="font-display mt-4 max-w-[16ch] text-[34px] font-extrabold leading-[1.08] tracking-[-.02em] text-white sm:text-[52px]">
              Venda direto para o Brasil inteiro
            </h1>
            <p className="mt-5 max-w-[62ch] text-base leading-relaxed text-white/80 sm:text-lg">
              Sua produção sai da sua fábrica para o comprador com a nota fiscal da sua empresa. Sem atravessador e sem
              mensalidade: você paga 5% só sobre o que vender.
            </p>
            <div className="mt-8 flex flex-wrap gap-3.5">
              <CtaFalarComConsultor className={CTA_CLASSES}>Falar com um consultor</CtaFalarComConsultor>
              <Link
                href="/vender"
                className="font-display inline-block rounded-sm border-[1.5px] border-white/45 px-7 py-4 text-sm font-bold uppercase tracking-[.04em] text-white transition-colors hover:bg-white/10"
              >
                Cadastrar minha indústria
              </Link>
            </div>
            <ul className="mt-8 flex flex-wrap gap-x-7 gap-y-2.5 border-t border-white/15 pt-6 text-[13.5px] text-white/75">
              {["Cadastro gratuito", "Taxa de 5% por venda", "Pagamento retido até a entrega"].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <span className="flex h-4 w-4 flex-none items-center justify-center rounded-full bg-verde-24h">
                    <svg width="9" height="9" viewBox="0 0 12 12" fill="none" aria-hidden>
                      <path d="M2.5 6.4 4.8 8.7 9.5 4" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* A conta do atravessador */}
        <section className="mx-auto max-w-[1080px] px-4 py-14 sm:px-6 sm:py-16">
          <p className="font-display text-xs font-bold uppercase tracking-[.16em] text-sinal">A conta</p>
          <h2 className="font-display mt-3 text-2xl font-extrabold tracking-[-.02em] text-ink sm:text-[30px]">
            Quem produz não é quem fica com a margem
          </h2>
          <p className="mt-3.5 max-w-[62ch] text-[16.5px] leading-relaxed text-ink-2">
            O distribuidor compra barato no interior e revende caro na capital. Essa diferença está embutida no preço que
            o comprador paga, e é ela que trava o seu volume.
          </p>

          <div className="mt-9 grid grid-cols-1 items-stretch md:grid-cols-[1fr_64px_1fr]">
            <div className="border border-[#cbd4dd] bg-white p-6">
              <p className="font-display text-xs font-bold uppercase tracking-[.12em] text-sinal">Pelo distribuidor</p>
              <p className="font-display mt-2.5 text-[44px] font-extrabold leading-none tracking-[-.03em] tabular-nums text-sinal">
                R$ 100
              </p>
              <dl className="mt-4 border-t border-line pt-3.5 text-[13.5px] text-ink-2">
                {[
                  ["Preço da caixa na sua fábrica", "R$ 80"],
                  ["Margem de revenda embutida", "R$ 20"],
                  ["O comprador paga", "R$ 100"],
                ].map(([rotulo, valor]) => (
                  <div key={rotulo} className="flex justify-between gap-4 py-1.5">
                    <dt>{rotulo}</dt>
                    <dd className="whitespace-nowrap font-semibold tabular-nums text-ink">{valor}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div
              className="flex items-center justify-center bg-lm-marinho py-2 font-display text-xl font-extrabold text-lm-amarelo md:py-0"
              aria-hidden
            >
              <span className="rotate-90 md:rotate-0">→</span>
            </div>

            <div className="border border-[#cbd4dd] bg-white p-6 md:border-l-0">
              <p className="font-display text-xs font-bold uppercase tracking-[.12em] text-verde-24h">
                Direto na Indústria 24h
              </p>
              <p className="font-display mt-2.5 text-[44px] font-extrabold leading-none tracking-[-.03em] tabular-nums text-verde-24h">
                R$ 88
              </p>
              <dl className="mt-4 border-t border-line pt-3.5 text-[13.5px] text-ink-2">
                {[
                  ["Preço da caixa na sua fábrica", "R$ 80"],
                  ["Taxa da plataforma (5%)", "R$ 4"],
                  ["Frete até o comprador", "R$ 4"],
                ].map(([rotulo, valor]) => (
                  <div key={rotulo} className="flex justify-between gap-4 py-1.5">
                    <dt>{rotulo}</dt>
                    <dd className="whitespace-nowrap font-semibold tabular-nums text-ink">{valor}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>

          <p className="mt-5 text-[15px] leading-relaxed text-ink-2">
            <b className="text-ink">R$ 12 de economia por caixa</b> para o comprador, sem tirar um centavo do seu preço:
            o que sumiu da conta foi a revenda. <span className="text-muted">Valores ilustrativos; o frete varia por distância e modal.</span>
          </p>
        </section>

        {/* Pagamento protegido + split */}
        <section className="bg-lm-marinho">
          <div className="mx-auto max-w-[1080px] px-4 py-14 sm:px-6 sm:py-16">
            <p className="font-display text-xs font-bold uppercase tracking-[.16em] text-lm-amarelo">
              Pagamento protegido
            </p>
            <h2 className="font-display mt-3 max-w-[24ch] text-2xl font-extrabold tracking-[-.02em] text-white sm:text-[30px]">
              Você nunca despacha mercadoria sem o dinheiro estar preso na plataforma
            </h2>
            <p className="mt-3.5 max-w-[62ch] text-[16.5px] leading-relaxed text-white/80">
              O comprador paga pelo site, por PIX ou parcelado, e o valor fica retido. Você recebe o pedido no painel,
              separa e entrega. Na entrega, o comprador te passa o código que recebeu por WhatsApp; você lança o código e
              o PIX cai na hora.
            </p>

            <div className="mt-8 overflow-x-auto">
              <table className="w-full border-collapse text-[15px]">
                <caption className="font-display pb-3.5 text-left text-xs font-bold uppercase tracking-[.16em] text-lm-amarelo">
                  Numa venda de R$ 1.000
                </caption>
                <thead>
                  <tr>
                    {["Quem recebe", "Valor", "Quando"].map((th) => (
                      <th
                        key={th}
                        className="font-display border-b border-white/20 pb-3 pr-4 text-left text-[11.5px] font-bold uppercase tracking-[.1em] text-white/60"
                      >
                        {th}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="tabular-nums">
                  <tr>
                    <td className="border-b border-white/10 py-4 pr-4 font-semibold text-white">Você, o fornecedor</td>
                    <td className="font-display border-b border-white/10 py-4 pr-4 text-[19px] font-extrabold text-lm-amarelo">
                      R$ 950
                    </td>
                    <td className="border-b border-white/10 py-4 pr-4 text-white/80">
                      Assim que você lança o código de entrega
                    </td>
                  </tr>
                  <tr>
                    <td className="border-b border-white/10 py-4 pr-4 font-semibold text-white">Plataforma</td>
                    <td className="border-b border-white/10 py-4 pr-4 text-white/80">R$ 50</td>
                    <td className="border-b border-white/10 py-4 pr-4 text-white/80">
                      Retido no mesmo momento da venda
                    </td>
                  </tr>
                  <tr>
                    <td className="border-b border-white/10 py-4 pr-4 font-semibold text-white">Afiliado de vendas</td>
                    <td className="border-b border-white/10 py-4 pr-4 text-white/80">
                      Só se houver, no percentual que você definiu
                    </td>
                    <td className="border-b border-white/10 py-4 pr-4 text-white/80">Junto com o seu repasse</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-[12.5px] text-white/60">
              Disputa aberta pelo comprador: 7 dias para abrir, 24h para você responder no painel.
            </p>
          </div>
        </section>

        {/* Alavancas */}
        <section className="border-t border-line bg-lm-cinza">
          <div className="mx-auto max-w-[1080px] px-4 py-14 sm:px-6 sm:py-16">
            <p className="font-display text-xs font-bold uppercase tracking-[.16em] text-sinal">Ferramentas de venda</p>
            <h2 className="font-display mt-3 text-2xl font-extrabold tracking-[-.02em] text-ink sm:text-[30px]">
              Quatro alavancas de faturamento, no seu controle
            </h2>

            <div className="mt-9 grid grid-cols-1 gap-5 md:grid-cols-2">
              {ALAVANCAS.map((a) => (
                <div key={a.titulo} className="border border-line border-t-[3px] border-t-lm-azul bg-white p-6">
                  <h3 className="font-display text-lg font-bold text-ink">{a.titulo}</h3>
                  <p className="mt-2.5 text-sm leading-relaxed text-ink-2">{a.texto}</p>

                  {a.titulo === "Desconto progressivo" && (
                    <>
                      <table className="mt-4 w-full border-collapse text-[13.5px] tabular-nums">
                        <thead>
                          <tr>
                            <th className="font-display border-b border-line pb-2 text-left text-[10.5px] font-bold uppercase tracking-[.09em] text-muted">
                              Quantidade
                            </th>
                            <th className="font-display border-b border-line pb-2 text-right text-[10.5px] font-bold uppercase tracking-[.09em] text-muted">
                              Preço/un.
                            </th>
                            <th className="font-display border-b border-line pb-2 text-right text-[10.5px] font-bold uppercase tracking-[.09em] text-muted">
                              Sua margem/un.
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {FAIXAS_DESCONTO.map((f, i) => (
                            <tr key={f.qtd} className={i === FAIXAS_DESCONTO.length - 1 ? "font-semibold text-ink" : "text-ink-2"}>
                              <td className={i === FAIXAS_DESCONTO.length - 1 ? "py-2" : "border-b border-line py-2"}>{f.qtd}</td>
                              <td className={i === FAIXAS_DESCONTO.length - 1 ? "py-2 text-right" : "border-b border-line py-2 text-right"}>
                                {f.preco}
                              </td>
                              <td className={i === FAIXAS_DESCONTO.length - 1 ? "py-2 text-right" : "border-b border-line py-2 text-right"}>
                                {f.margem}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <p className="mt-2.5 text-xs text-muted">
                        Exemplo ilustrativo em milheiro de tijolo. Você define cada faixa e a validade.
                      </p>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Afiliados */}
        <section className="mx-auto max-w-[1080px] px-4 py-14 sm:px-6 sm:py-16">
          <p className="font-display text-xs font-bold uppercase tracking-[.16em] text-sinal">Time de vendas</p>
          <h2 className="font-display mt-3 text-2xl font-extrabold tracking-[-.02em] text-ink sm:text-[30px]">
            Representantes sem folha de pagamento
          </h2>
          <p className="mt-3.5 max-w-[62ch] text-[16.5px] leading-relaxed text-ink-2">
            Motoristas, balconistas e lojinhas se cadastram como afiliados e vendem os seus produtos pelo link deles.
            Você define a comissão por produto e ela sai automaticamente do split. Se o afiliado não vender, você não
            paga nada.
          </p>
          <div className="mt-7 grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-x-10">
            <div>
              <h3 className="font-display text-base font-bold text-ink">Comissão definida por você</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-2">
                Percentual por produto, ligado ou desligado a qualquer momento no painel.
              </p>
            </div>
            <div>
              <h3 className="font-display text-base font-bold text-ink">Pagamento só na entrega confirmada</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-2">
                A comissão do afiliado é liberada no mesmo PIX do seu repasse, quando o código de entrega é lançado.
              </p>
            </div>
          </div>
        </section>

        {/* Logística */}
        <section className="bg-lm-marinho">
          <div className="mx-auto max-w-[1080px] px-4 py-14 sm:px-6 sm:py-16">
            <p className="font-display text-xs font-bold uppercase tracking-[.16em] text-lm-amarelo">Logística</p>
            <h2 className="font-display mt-3 text-2xl font-extrabold tracking-[-.02em] text-white sm:text-[30px]">
              Entrega resolvida, do km ao centro de distribuição
            </h2>
            <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-x-10">
              {LOGISTICA.map((l) => (
                <div key={l.titulo}>
                  <h3 className="font-display text-base font-bold text-white">{l.titulo}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-white/75">{l.texto}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Etapas */}
        <section className="border-t border-line bg-lm-cinza">
          <div className="mx-auto max-w-[1080px] px-4 py-14 sm:px-6 sm:py-16">
            <p className="font-display text-xs font-bold uppercase tracking-[.16em] text-sinal">
              Do cadastro à primeira venda
            </p>
            <h2 className="font-display mt-3 text-2xl font-extrabold tracking-[-.02em] text-ink sm:text-[30px]">
              Quatro etapas, e a primeira leva 30 minutos
            </h2>
            <ol className="mt-9 grid grid-cols-1 gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
              {ETAPAS.map((e) => (
                <li key={e.n} className="bg-white p-6">
                  <p className="font-display text-[13px] font-extrabold uppercase tracking-[.08em] text-lm-azul">{e.n}</p>
                  <h3 className="font-display mt-2.5 text-[17px] font-bold text-ink">{e.titulo}</h3>
                  <p className="mt-2 text-[13.5px] leading-relaxed text-ink-2">{e.texto}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Dúvidas */}
        <section className="mx-auto max-w-[760px] px-4 py-14 sm:px-6 sm:py-16">
          <p className="font-display text-xs font-bold uppercase tracking-[.16em] text-sinal">
            Perguntas que todo fornecedor faz
          </p>
          <h2 className="font-display mt-3 text-2xl font-extrabold tracking-[-.02em] text-ink sm:text-[30px]">
            As dúvidas antes de cadastrar
          </h2>
          <div className="mt-7 border-t border-line">
            {DUVIDAS.map((d) => (
              <div key={d.pergunta} className="grid grid-cols-1 gap-3 border-b border-line py-5 md:grid-cols-[.85fr_1.15fr] md:gap-8">
                <h3 className="font-display text-[16.5px] font-bold text-lm-marinho">{d.pergunta}</h3>
                <p className="text-[14.5px] leading-relaxed text-ink-2">{d.resposta}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA final */}
        <section className="bg-lm-marinho">
          <div className="mx-auto max-w-[760px] px-4 py-14 text-center sm:px-6 sm:py-16">
            <h2 className="font-display text-2xl font-extrabold tracking-[-.02em] text-white sm:text-[30px]">
              Coloque sua produção no ar
            </h2>
            <p className="mx-auto mt-3.5 max-w-[52ch] text-[15px] leading-relaxed text-white/80">
              Fale com um consultor pelo atendimento: ele tira as dúvidas na hora e faz o cadastro junto com você. Leva
              cerca de 30 minutos e seus primeiros produtos já saem publicados.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3.5">
              <CtaFalarComConsultor className={CTA_CLASSES}>Falar com um consultor</CtaFalarComConsultor>
              <Link
                href="/vender"
                className="font-display inline-block rounded-sm border-[1.5px] border-white/45 px-7 py-4 text-sm font-bold uppercase tracking-[.04em] text-white transition-colors hover:bg-white/10"
              >
                Prefiro me cadastrar sozinho
              </Link>
            </div>
            <p className="mt-5 text-[12.5px] text-white/60">
              Cadastro gratuito, sem mensalidade e sem fidelidade. A plataforma só ganha quando você vende.
            </p>
          </div>
        </section>
      </main>

      <VitrineFooter />
    </div>
  );
}
