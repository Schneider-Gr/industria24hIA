import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { VideoVendaFutura } from "@/components/vitrine/VideoVendaFutura";
import { VitrineHeader, VitrineFooter } from "@/components/vitrine/ui";

export const metadata: Metadata = {
  title: "Venda Futura",
  description:
    "Reserve hoje a produção da indústria ou do produtor, com preço definido na compra e entrega na data do lote. Exclusivo para empresas com CNPJ e produtores rurais com IE.",
};

// Landing institucional da Venda Futura (Mercado Futuro) para o comprador.
// Regras tiradas dos Termos do Mercado Futuro (migration 0061) e do checkout:
// só CNPJ ou IE de produtor rural, preço definido no ato, reserva do estoque
// do lote, compra firme (sem art. 49 do CDC), frustração de safra = reagendar
// ou devolver. Sem dado dinâmico: o CTA leva à grade real da home
// (#mercado-futuro), que já cuida do CEP e da cobertura.
const PASSOS = [
  { t: "Escolha o lote e a data", d: "Cada produto mostra as datas em que o lote fica disponível, o estoque reservado e a compra mínima." },
  { t: "Reserve pelo preço de hoje", d: "O preço é definido no momento da compra, incluindo o desconto por volume quando o lote tiver." },
  { t: "Confirme com CNPJ ou IE", d: "No checkout você informa o CNPJ (ou a IE de produtor rural) e aceita os Termos do Mercado Futuro." },
  { t: "Receba na data combinada", d: "A reserva separa o estoque do lote para você. A indústria ou o produtor entrega no prazo do anúncio." },
] as const;

const BENEFICIOS = [
  { t: "Preço que não muda", d: "O valor fica definido na compra. A oscilação do mercado até a entrega não chega no seu pedido." },
  { t: "Estoque garantido", d: "A reserva separa a sua quantidade do lote. Você não disputa o produto quando ele chegar." },
  { t: "Direto de quem produz", d: "Você compra da indústria ou do produtor, sem intermediário entre vocês." },
] as const;

const FAQ = [
  {
    p: "Quem pode comprar na Venda Futura?",
    r: "Empresas com CNPJ e produtores rurais com Inscrição Estadual, comprando para a própria atividade (insumo ou revenda). Não vale para pessoa física como consumidor final.",
  },
  {
    p: "O preço pode mudar depois que eu reservo?",
    r: "Não. O preço é o mostrado antes da confirmação, com o desconto por volume do lote quando houver.",
  },
  {
    p: "Posso cancelar a reserva?",
    r: "A compra é firme a partir da confirmação: como é uma compra entre empresas, não existe o direito de arrependimento do consumidor. Um distrato depende de acordo entre você e o vendedor.",
  },
  {
    p: "E se a safra ou a produção falhar?",
    r: "Em caso de força maior ou frustração de safra, o vendedor avisa e vocês reagendam a entrega ou desfazem o negócio com devolução do que foi pago, sem multa.",
  },
  {
    p: "Existe quantidade mínima?",
    r: "Cada lote tem a compra mínima definida pelo vendedor, mostrada no card do produto junto com o estoque disponível.",
  },
] as const;

function Check() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden>
      <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const CTA_CLASSE =
  "inline-flex items-center gap-2 rounded-full bg-vf-vermelho px-7 py-3.5 text-[15px] font-bold text-white shadow-[0_8px_24px_-8px_rgba(220,38,38,.55)] transition-transform hover:-translate-y-0.5";

export default function VendaFuturaPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <VitrineHeader />

      <main className="flex-1">
        {/* Hero: mesmo gradiente da seção #mercado-futuro da home */}
        <section
          className="text-white"
          style={{
            background:
              "linear-gradient(180deg, #2b1257 0%, var(--color-vf-roxo) 62%, var(--color-vf-roxo-claro) 100%)",
          }}
        >
          <div className="mx-auto grid max-w-[1180px] gap-10 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[.8fr_1.2fr] lg:items-center">
          <div>
            <p className="font-display text-sm font-bold uppercase tracking-wide text-white/70">Venda Futura</p>
            <h1 className="font-display mt-3 max-w-[640px] text-3xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl">
              Reserve hoje, receba na data do lote, pague o{" "}
              <span className="text-[#FFD84D]">preço de hoje</span>
            </h1>
            <p className="mt-4 max-w-[560px] text-lg text-white/85">
              Garanta a produção da indústria ou do produtor antes de ela
              chegar ao estoque, com preço definido na compra e a sua
              quantidade separada do lote.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-4">
              <Link href="/#mercado-futuro" className={CTA_CLASSE}>
                Ver datas disponíveis
              </Link>
              <Link href="/termos/termos-mercado-futuro" className="text-sm font-semibold text-white/85 underline underline-offset-4 hover:text-white">
                Ler os Termos do Mercado Futuro
              </Link>
            </div>
            <ul className="mt-8 flex flex-col gap-2 text-sm text-white/80">
              {["Preço definido na reserva", "Direto da indústria ou do produtor", "Exclusivo para CNPJ e produtor rural"].map((t) => (
                <li key={t} className="flex items-center gap-1.5">
                  <span className="text-ok"><Check /></span>
                  {t}
                </li>
              ))}
            </ul>
          </div>

            {/* Vídeo institucional: começa sozinho e mudo; o botão liga o som. */}
            <div className="lg:justify-self-end lg:w-full">
              <VideoVendaFutura className="shadow-[0_24px_60px_-24px_rgba(0,0,0,.6)]" />
              <p className="mt-2 text-center text-[12px] text-white/60">
                O som liga sozinho no seu primeiro toque na página.
              </p>
            </div>
          </div>
        </section>

        {/* Foto de abertura: a operação real no centro de distribuição */}
        <section className="mx-auto max-w-[1180px] px-4 pt-10 sm:px-6">
          <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl sm:aspect-[21/9]">
            <Image
              src="/venda-futura-lp.jpg"
              alt="Comprador conferindo a vitrine da Indústria 24h dentro do centro de distribuição"
              fill
              sizes="(max-width: 1180px) 100vw, 1180px"
              className="object-cover"
              priority
            />
          </div>
        </section>

        {/* Como funciona */}
        <section className="mx-auto max-w-[880px] px-4 py-14 sm:px-6">
          <p className="font-display text-sm font-bold uppercase tracking-wide text-vf-roxo">Como funciona</p>
          <h2 className="font-display mt-2 text-2xl font-extrabold text-ink sm:text-3xl">Quatro passos da reserva à entrega</h2>
          <ol className="mt-8 grid gap-5 sm:grid-cols-2">
            {PASSOS.map((p, i) => (
              <li key={p.t} className="rounded-r-2xl border-l-4 border-vf-roxo bg-surface p-5">
                <span className="font-display text-2xl font-extrabold text-vf-roxo">{i + 1}</span>
                <h3 className="font-display mt-2 text-base font-bold text-ink">{p.t}</h3>
                <p className="mt-1.5 text-sm text-ink-2">{p.d}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Por que reservar */}
        <section className="bg-surface">
          <div className="mx-auto max-w-[880px] px-4 py-14 sm:px-6">
            <p className="font-display text-sm font-bold uppercase tracking-wide text-vf-roxo">Por que reservar</p>
            <h2 className="font-display mt-2 text-2xl font-extrabold text-ink sm:text-3xl">Planeje a compra sem depender do mercado</h2>
            <div className="mt-8 grid gap-5 sm:grid-cols-3">
              {BENEFICIOS.map((b) => (
                <div key={b.t} className="rounded-2xl border border-line bg-white p-5">
                  <h3 className="font-display text-base font-bold text-ink">{b.t}</h3>
                  <p className="mt-1.5 text-sm text-ink-2">{b.d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="mx-auto max-w-[880px] px-4 py-14 sm:px-6">
          <p className="font-display text-sm font-bold uppercase tracking-wide text-vf-roxo">Dúvidas frequentes</p>
          <h2 className="font-display mt-2 text-2xl font-extrabold text-ink sm:text-3xl">Antes de reservar</h2>
          <div className="mt-8 space-y-6">
            {FAQ.map((f) => (
              <div key={f.p} className="border-b border-line pb-6 last:border-0 last:pb-0">
                <h3 className="font-display text-base font-bold text-ink">{f.p}</h3>
                <p className="mt-1.5 text-sm text-ink-2">{f.r}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA final */}
        <section className="bg-vf-roxo">
          <div className="mx-auto max-w-[880px] px-4 py-16 text-center sm:px-6">
            <h2 className="font-display text-2xl font-extrabold text-white sm:text-3xl">Veja o que já pode ser reservado</h2>
            <p className="mt-3 text-white/85">Informe seu CEP para ver os lotes que entregam na sua região.</p>
            <Link href="/#mercado-futuro" className={`${CTA_CLASSE} mt-6`}>
              Ver datas disponíveis
            </Link>
          </div>
        </section>
      </main>

      <VitrineFooter />
    </div>
  );
}
