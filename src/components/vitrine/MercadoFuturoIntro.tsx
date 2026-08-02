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
const PASSOS = [
  {
    n: "1",
    titulo: "Escolha a data",
    texto: "Veja as datas de disponibilidade da produção e o estoque reservado para cada uma.",
  },
  {
    n: "2",
    titulo: "Reserve com preço travado",
    texto: "O valor da reserva vale para a data escolhida — não muda até a entrega, mesmo com o mercado oscilando.",
  },
  {
    n: "3",
    titulo: "Aceite os termos B2B",
    texto: "Reserva restrita a empresas com CNPJ e Inscrição Estadual — aceite no checkout, com registro do pedido.",
  },
  {
    n: "4",
    titulo: "Receba na data certa",
    texto: "A indústria produz para a demanda já vendida e você recebe no dia combinado, sem falta de estoque.",
  },
] as const;

const BENEFICIOS = [
  {
    titulo: "Preço travado na reserva",
    texto: "O valor não sobe entre a reserva e a entrega — feche o custo do insumo com meses de antecedência.",
    icone: <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />,
  },
  {
    titulo: "Planejamento de estoque",
    texto: "Saiba exatamente quando o produto chega e programe produção, revenda ou obra sem sustos de última hora.",
    icone: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M8 3v4M16 3v4M3 11h18" />
      </>
    ),
  },
  {
    titulo: "Desconto por comprar adiantado",
    texto: "Quem reserva com antecedência costuma pagar menos que o preço à vista no dia da entrega.",
    icone: (
      <>
        <path d="M20 12V8a2 2 0 00-2-2h-3l-2-3-2 3H8a2 2 0 00-2 2v4" />
        <path d="M4 12h16l-1.5 8.5a2 2 0 01-2 1.5H7.5a2 2 0 01-2-1.5L4 12z" />
      </>
    ),
  },
  {
    titulo: "Direto do fabricante",
    texto: "Sem atravessador: a reserva vai direto para a loja que produz, com o mesmo repasse de 5% do marketplace.",
    icone: <path d="M16 3.13a4 4 0 010 7.75M21 21v-2a4 4 0 00-3-3.87M13 21v-2a4 4 0 00-8 0v2M9 11a4 4 0 100-8 4 4 0 000 8z" />,
  },
  {
    titulo: "Compra segura, restrita a B2B",
    texto: "Só empresas com CNPJ e IE reservam — sem concorrência com consumidor final pelo mesmo lote.",
    icone: <path d="M12 22s8-4.5 8-11V5l-8-3-8 3v6c0 6.5 8 11 8 11z" />,
  },
  {
    titulo: "Estoque visível por data",
    texto: "Cada data mostra quanto ainda está disponível para reserva, antes que acabe.",
    icone: (
      <>
        <path d="M3 3v18h18" />
        <path d="M7 15l4-4 3 3 5-6" />
      </>
    ),
  },
] as const;

const FAQ = [
  {
    pergunta: "Quem pode comprar na Venda Futura?",
    resposta:
      "Só empresas com CNPJ e Inscrição Estadual ativa. É um recurso B2B — no checkout você aceita os Termos do Mercado Futuro antes de confirmar a reserva.",
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
            <span className="inline-flex items-center gap-2 rounded-full bg-white/12 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[.1em] ring-1 ring-white/25">
              Mercado Futuro B2B
            </span>
            <h2 className="font-display mt-5 max-w-[560px] text-3xl font-extrabold leading-[1.08] tracking-tight sm:text-4xl lg:text-[44px]">
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
            <div className="mb-4 flex h-40 items-center justify-center rounded-xl bg-vf-roxo/8">
              <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-vf-roxo/40" aria-hidden>
                <rect x="3" y="7" width="18" height="14" rx="2" />
                <path d="M3 11h18M8 3v6M16 3v6" />
              </svg>
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

      {/* Passos */}
      <section className="border-b border-line bg-surface">
        <div className="mx-auto grid max-w-[1280px] gap-4 px-4 py-8 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
          {PASSOS.map((p) => (
            <div key={p.n} className="rounded-2xl border border-line bg-white p-5">
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-vf-roxo font-display text-sm font-extrabold text-white">
                {p.n}
              </div>
              <h3 className="mb-1 text-[13.5px] font-bold text-ink">{p.titulo}</h3>
              <p className="text-[12px] leading-snug text-ink-2">{p.texto}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Benefícios */}
      <div className="mx-auto max-w-[1280px] px-4 pt-8 sm:px-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {BENEFICIOS.map((b) => (
            <div key={b.titulo} className="rounded-2xl border border-line bg-surface p-5">
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-vf-vermelho/10">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-vf-vermelho" aria-hidden>
                  {b.icone}
                </svg>
              </div>
              <h3 className="mb-1 text-[13.5px] font-bold text-ink">{b.titulo}</h3>
              <p className="text-[12px] leading-snug text-ink-2">{b.texto}</p>
            </div>
          ))}
        </div>

        <details className="group mt-6 rounded-2xl border border-line bg-surface">
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

      {/* CTA final */}
      <div className="mx-auto max-w-[1280px] px-4 pb-2 pt-10 sm:px-6">
        <div
          className="rounded-3xl px-6 py-12 text-center text-white sm:px-10 sm:py-16"
          style={{
            background: "linear-gradient(135deg, var(--color-vf-roxo) 0%, #2b1257 100%)",
          }}
        >
          <h3 className="font-display text-2xl font-extrabold sm:text-3xl">
            Trave o preço da sua próxima compra hoje
          </h3>
          <p className="mx-auto mt-3 max-w-[480px] text-[15px] text-white/80">
            Escolha a data, reserve o lote e receba direto da indústria — sem
            depender do preço do dia da entrega.
          </p>
          <a
            href="#mercado-futuro-datas"
            className="mt-7 inline-flex items-center gap-2 rounded-full bg-vf-vermelho px-8 py-3.5 text-[15px] font-bold text-white shadow-[0_8px_24px_-8px_rgba(220,38,38,.55)] transition-transform hover:-translate-y-0.5"
          >
            Ver datas disponíveis
          </a>
        </div>
      </div>
    </div>
  );
}
