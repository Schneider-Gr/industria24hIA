
// Conteúdo institucional da seção Mercado Futuro (#mercado-futuro): hero,
// passos, benefícios, FAQ e CTA final sobre a Venda Futura. Reproduz fielmente
// o mockup aprovado (docs/prototypes/lp-venda-futura.html) — gradiente roxo,
// pills/botões rounded-full, card de produto no hero — usando os tokens reais
// do repo (vf-roxo/vf-roxo-claro/vf-vermelho/verde-24h). Fonte: mantém
// font-display (Archivo), a identidade tipográfica real do projeto
// (DESIGN.md "Aço & Sinal") — o mockup usava Sora, mas introduzir uma segunda
// família só para esta seção quebraria a consistência do resto do site.
// Não duplica a grade real de "datas disponíveis" (MercadoFuturo.tsx, dados
// do Supabase) — o card de produto no hero é ilustrativo e marcado como tal.
const FAQ = [
  {
    pergunta: "Quem pode comprar na Venda Futura?",
    resposta:
      "Empresas com CNPJ ou produtor rural com Inscrição Estadual, conforme os Termos do Mercado Futuro (item 2.1), aceitos no checkout antes de confirmar a reserva.",
  },
  {
    pergunta: "O preço pode mudar depois que eu reservo?",
    resposta:
      "Não. O valor mostrado no momento da reserva é o valor que você paga na data de entrega combinada, independente de como o mercado se move nesse período.",
  },
  {
    pergunta: "E se eu quiser cancelar a reserva?",
    resposta:
      "As condições de cancelamento estão nos Termos do Mercado Futuro, aceitos no checkout — confira antes de confirmar o pedido.",
  },
  {
    pergunta: "Como sei que o produto vai chegar na data certa?",
    resposta:
      "A data de disponibilidade é definida pela própria indústria ou produtor no cadastro do lote, com o estoque reservado exibido em tempo real na vitrine abaixo.",
  },
  {
    pergunta: "Existe quantidade mínima de compra?",
    resposta:
      "Sim, cada lote tem uma quantidade mínima definida pelo vendedor, exibida no card do produto junto com o estoque disponível.",
  },
] as const;

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden>
      <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

import Link from "next/link";
import { VideoVendaFutura } from "@/components/vitrine/VideoVendaFutura";

export function MercadoFuturoIntro({ children }: { children?: React.ReactNode }) {
  return (
    <div>
      {/* Hero */}
      <section
        className="relative overflow-hidden text-white"
        style={{
          background:
            "linear-gradient(180deg, #2b1257 0%, var(--color-vf-roxo) 62%, var(--color-vf-roxo-claro) 100%)",
        }}
      >
        {/* Vídeo manda na composição (pedido da dona, 24/09): coluna maior
            para ele, título e subtítulo fora, botões e garantias à esquerda. */}
        <div className="relative mx-auto grid max-w-[1280px] gap-6 px-4 py-10 sm:px-6 sm:py-12 lg:grid-cols-[.8fr_1.2fr] lg:items-center lg:gap-10">
          <div>
            <h2 className="sr-only">Venda Futura na Indústria 24h</h2>
            <div className="flex flex-wrap gap-3">
              <a
                href="#mercado-futuro-datas"
                className="inline-flex items-center gap-2 rounded-full bg-vf-vermelho px-7 py-3.5 text-[15px] font-bold text-white shadow-[0_8px_24px_-8px_rgba(220,38,38,.55)] transition-transform hover:-translate-y-0.5"
              >
                Ver datas disponíveis
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden>
                  <path d="M5 12h14M13 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>
              <Link
                href="/venda-futura"
                className="inline-flex items-center gap-2 rounded-full border border-white/40 px-6 py-3.5 text-[15px] font-bold text-white transition-colors hover:bg-white/10"
              >
                Como funciona
              </Link>
            </div>
            <div className="mt-6 flex flex-col gap-2 text-[13px] text-white/75">
              <span className="flex items-center gap-1.5">
                <span className="text-ok"><CheckIcon /></span>
                Preço travado no ato da reserva
              </span>
              <span className="flex items-center gap-1.5">
                <span className="text-ok"><CheckIcon /></span>
                Compra direto da indústria/produtor
              </span>
              <span className="flex items-center gap-1.5">
                <span className="text-ok"><CheckIcon /></span>
                Exclusivo para empresas (CNPJ)
              </span>
            </div>
          </div>

          {/* Vídeo começa sozinho e mudo; botão liga o som. */}
          <VideoVendaFutura className="shadow-[0_20px_50px_-24px_rgba(0,0,0,.6)]" />
        </div>
      </section>

      {children}

      {/* Passos e benefícios saíram (18/09): repetiam o hero acima e a
          faixa de passos que já existia na home. Fica só o FAQ. */}
      <div className="mx-auto max-w-[1280px] px-4 pt-8 sm:px-6">
        <details className="group rounded-2xl border border-line bg-surface">
          <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 text-[13px] font-bold text-ink">
            Dúvidas frequentes sobre a Venda Futura
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className="shrink-0 text-vf-roxo transition-transform group-open:rotate-180" aria-hidden>
              <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </summary>
          <div className="grid gap-4 border-t border-line px-5 py-4 sm:grid-cols-2">
            {FAQ.map((f) => (
              <div key={f.pergunta}>
                <h4 className="mb-1 text-[12.5px] font-bold text-ink">{f.pergunta}</h4>
                <p className="text-[12px] leading-snug text-ink-2">{f.resposta}</p>
              </div>
            ))}
          </div>
        </details>
      </div>

    </div>
  );
}
