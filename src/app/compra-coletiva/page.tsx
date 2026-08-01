import type { Metadata } from "next";
import Link from "next/link";
import { VitrineHeader, VitrineFooter } from "@/components/vitrine/ui";

export const metadata: Metadata = {
  title: "Compra Coletiva",
  description:
    "Junte-se a outros compradores no mesmo produto e destrave preço de lote sem precisar comprar o volume sozinho. Ninguém paga antes da meta fechar.",
};

// Landing institucional da Compra Coletiva (skill compra-coletiva /
// docs/business-rules.md, MPDD-36). Mecânica real: bater a meta não fecha a
// coletiva (vira "Viável" e segue até o prazo descendo de lote); no
// fechamento todos pagam o melhor lote atingido, rateado ao centavo; ninguém
// é cobrado antes disso. CTA leva para /coletivas (vitrine real, dados do
// Supabase) — esta página é só copy institucional, sem dado dinâmico.
export default function CompraColetivaPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <VitrineHeader />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden bg-aco-900">
          <div className="relative mx-auto max-w-[880px] px-4 py-16 sm:px-6 sm:py-24">
            <p className="font-archivo text-sm font-bold uppercase tracking-wide text-sinal">
              Compra Coletiva
            </p>
            <h1 className="mt-3 font-archivo text-3xl font-extrabold text-white sm:text-5xl">
              Sozinho você não chega no volume. Junto, chega.
            </h1>
            <p className="mt-4 max-w-[560px] text-lg text-white/80">
              Some sua quantidade com a de outros compradores no mesmo produto
              e destrave o preço de lote — sem precisar comprar tudo sozinho e
              sem pagar nada antes da coletiva fechar.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/coletivas"
                className="rounded-sm bg-sinal px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-sinal-escuro"
              >
                Ver coletivas abertas
              </Link>
              <Link
                href="/"
                className="rounded-sm border border-white/30 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
              >
                Ver todos os produtos
              </Link>
            </div>
          </div>
        </section>

        {/* Como funciona */}
        <section className="mx-auto max-w-[880px] px-4 py-14 sm:px-6">
          <p className="font-archivo text-sm font-bold uppercase tracking-wide text-sinal">
            Como funciona
          </p>
          <h2 className="mt-2 font-archivo text-2xl font-extrabold text-aco-900 sm:text-3xl">
            Quatro passos até o preço de lote
          </h2>

          <ol className="mt-8 grid gap-5 sm:grid-cols-2">
            {[
              {
                n: "1",
                t: "Entre numa coletiva",
                d: "Escolha um produto com compra coletiva aberta e informe a quantidade que você quer comprar.",
              },
              {
                n: "2",
                t: "Acompanhe a meta",
                d: "Uma barra de progresso mostra o volume atual contra a meta do próximo lote de desconto — em tempo real.",
              },
              {
                n: "3",
                t: "O preço desce com o volume",
                d: "Quanto mais gente entra, mais a coletiva desce de lote. Bater a meta não fecha: ela continua até o prazo tentando destravar o próximo lote.",
              },
              {
                n: "4",
                t: "Todos pagam o melhor preço atingido",
                d: "No fechamento, todo mundo paga o preço do lote mais barato que a coletiva alcançou — mesmo quem entrou antes da meta subir.",
              },
            ].map((p) => (
              <li key={p.n} className="rounded-sm border-l-4 border-sinal bg-aco-100 p-5">
                <span className="font-archivo text-2xl font-extrabold text-sinal">{p.n}</span>
                <h3 className="mt-2 font-archivo text-base font-bold text-aco-900">{p.t}</h3>
                <p className="mt-1.5 text-sm text-aco-800">{p.d}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Por que participar */}
        <section className="mx-auto max-w-[880px] px-4 py-14 sm:px-6">
          <p className="font-archivo text-sm font-bold uppercase tracking-wide text-sinal">
            Por que participar
          </p>
          <h2 className="mt-2 font-archivo text-2xl font-extrabold text-aco-900 sm:text-3xl">
            Desconto de volume sem precisar comprar volume
          </h2>
          <div className="mt-8 grid gap-5 sm:grid-cols-3">
            {[
              {
                t: "Ninguém paga antes de fechar",
                d: "Enquanto a coletiva está aberta, ninguém é cobrado. A cobrança só acontece depois que a coletiva fecha de fato.",
              },
              {
                t: "Preço só desce, nunca sobe",
                d: "Se o volume final ficar abaixo do que você esperava, você paga o preço do lote atingido — nunca mais do que o combinado ao entrar.",
              },
              {
                t: "Direto de quem fabrica",
                d: "Mesma origem dos produtos do marketplace: sem atravessador, com o mesmo repasse de 5% para a plataforma.",
              },
            ].map((b) => (
              <div key={b.t} className="rounded-sm border border-aco-900 bg-white p-5 shadow-sm">
                <h3 className="font-archivo text-base font-bold text-aco-900">{b.t}</h3>
                <p className="mt-1.5 text-sm text-aco-800">{b.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Pagamento e prazo */}
        <section className="bg-aco-100/60">
          <div className="mx-auto max-w-[880px] px-4 py-14 sm:px-6">
            <p className="font-archivo text-sm font-bold uppercase tracking-wide text-sinal">
              Pagamento
            </p>
            <h2 className="mt-2 font-archivo text-2xl font-extrabold text-aco-900 sm:text-3xl">
              O que acontece quando a coletiva fecha
            </h2>
            <div className="mt-8 grid gap-5 sm:grid-cols-2">
              <div>
                <h3 className="font-archivo text-base font-bold text-aco-900">Cobrança individual</h3>
                <p className="mt-1.5 text-sm text-aco-800">
                  Cada participante recebe seu próprio pedido, no valor
                  proporcional à quantidade que reservou, calculado com o preço
                  do melhor lote alcançado.
                </p>
              </div>
              <div>
                <h3 className="font-archivo text-base font-bold text-aco-900">Prazo para pagar</h3>
                <p className="mt-1.5 text-sm text-aco-800">
                  Depois do fechamento, você tem uma janela de pagamento (padrão
                  48h) para confirmar. Quem paga garante o pedido no preço
                  travado — não há re-rateio para cima. Quem não paga a tempo
                  perde a reserva e ela retorna ao estoque.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="mx-auto max-w-[880px] px-4 py-14 sm:px-6">
          <p className="font-archivo text-sm font-bold uppercase tracking-wide text-sinal">
            Dúvidas frequentes
          </p>
          <h2 className="mt-2 font-archivo text-2xl font-extrabold text-aco-900 sm:text-3xl">
            Antes de entrar numa coletiva
          </h2>
          <div className="mt-8 space-y-6">
            {[
              {
                p: "Bater a meta fecha a coletiva na hora?",
                r: "Não. Ao bater a meta, a coletiva fica \"Viável\" e continua aberta até o prazo, tentando descer para o próximo lote de desconto com mais volume.",
              },
              {
                p: "E se a coletiva não bater a meta mínima até o prazo?",
                r: "Ela expira sem gerar cobrança nenhuma para ninguém — como ninguém é cobrado antes do fechamento, não existe estorno a fazer.",
              },
              {
                p: "Posso entrar em mais de uma coletiva?",
                r: "Sim, cada coletiva é por produto — você participa de quantas quiser, cada uma com sua própria meta e prazo.",
              },
              {
                p: "O frete é dividido entre os participantes?",
                r: "Quando a coletiva tem frete conjunto habilitado pela loja, o frete é rateado por quantidade junto com o preço no fechamento.",
              },
            ].map((f) => (
              <div key={f.p} className="border-b border-line pb-6 last:border-0 last:pb-0">
                <h3 className="font-archivo text-base font-bold text-aco-900">{f.p}</h3>
                <p className="mt-1.5 text-sm text-aco-800">{f.r}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA final */}
        <section className="bg-sinal">
          <div className="mx-auto max-w-[880px] px-4 py-16 text-center sm:px-6">
            <h2 className="font-archivo text-2xl font-extrabold text-white sm:text-3xl">
              Encontre uma coletiva pra entrar agora
            </h2>
            <p className="mt-3 text-white/90">
              Volume junto destrava preço melhor — veja o que está aberto perto de fechar.
            </p>
            <Link
              href="/coletivas"
              className="mt-6 inline-block rounded-sm bg-white px-8 py-3 text-sm font-semibold text-sinal transition-colors hover:bg-aco-100"
            >
              Ver coletivas abertas
            </Link>
          </div>
        </section>
      </main>

      <VitrineFooter />
    </div>
  );
}
