import Image from "next/image";

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
      "Só empresas com CNPJ e Inscrição Estadual ativa. É restrito a empresas — no checkout você aceita os Termos do Mercado Futuro antes de confirmar a reserva.",
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

export function MercadoFuturoIntro() {
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
        <div className="relative mx-auto grid max-w-[1280px] gap-8 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:gap-10 lg:py-20">
          <div>
            <h2 className="font-display max-w-[560px] text-3xl font-extrabold leading-[1.08] tracking-tight sm:text-4xl lg:text-[44px]">
              Compre hoje, receba na data certa, pague o{" "}
              <span className="text-[#FFD84D]">preço de hoje</span>
            </h2>
            <p className="mt-4 max-w-[500px] text-[15px] leading-relaxed text-white/85">
              A Venda Futura trava o preço da sua compra no momento da
              reserva — sua produção, seu volume, sua data de entrega, sem
              depender do valor do mercado quando o pedido chegar.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a
                href="#mercado-futuro-datas"
                className="inline-flex items-center gap-2 rounded-full bg-vf-vermelho px-7 py-3.5 text-[15px] font-bold text-white shadow-[0_8px_24px_-8px_rgba(220,38,38,.55)] transition-transform hover:-translate-y-0.5"
              >
                Ver datas disponíveis
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden>
                  <path d="M5 12h14M13 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-[13px] text-white/75">
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

          <div className="relative mx-auto w-full max-w-[340px] rounded-2xl bg-white p-5 text-ink shadow-[0_30px_60px_-20px_rgba(0,0,0,.45)]">
            <span className="absolute -right-3 -top-3.5 flex items-center gap-1.5 rounded-xl bg-ink px-3.5 py-2 text-[11px] font-bold text-white shadow-lg">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden>
                <rect x="3" y="5" width="18" height="16" rx="2" />
                <path d="M8 3v4M16 3v4M3 11h18" />
              </svg>
              Exemplo ilustrativo
            </span>
            <div className="mb-4 h-40 overflow-hidden rounded-xl bg-vf-roxo/8">
              <Image
                src="/venda-futura-hero.jpeg"
                alt="Reserve sua produção com preço garantido"
                width={340}
                height={160}
                className="h-full w-full object-cover"
              />
            </div>
            <span className="inline-block rounded-full bg-vf-vermelho px-3 py-1 text-[11px] font-extrabold text-white">
              % de desconto reservando hoje
            </span>
            <p className="num mt-3 text-[13px] text-muted line-through">Preço à vista, no dia da entrega</p>
            <p className="font-display num text-[26px] font-extrabold text-ok">Preço da reserva</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full bg-vf-roxo/10 px-2.5 py-1 text-[11px] font-semibold text-vf-roxo">
                estoque reservado por data
              </span>
              <span className="rounded-full bg-vf-roxo/10 px-2.5 py-1 text-[11px] font-semibold text-vf-roxo">
                quantidade mínima por lote
              </span>
            </div>
            <a
              href="#mercado-futuro-datas"
              className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-full bg-vf-vermelho px-4 py-3 text-sm font-bold text-white transition-colors hover:opacity-90"
            >
              Ver datas reais
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden>
                <path d="M5 12h14M13 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
          </div>
        </div>
      </section>

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
