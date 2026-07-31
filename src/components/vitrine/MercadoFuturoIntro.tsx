// Conteúdo institucional da seção Mercado Futuro (#mercado-futuro): hero, passos,
// benefícios e dúvidas frequentes sobre a Venda Futura. Layout reproduz o mockup
// aprovado (docs/prototypes/lp-venda-futura.html), adaptado aos tokens reais do
// repo (vf-roxo/vf-vermelho/verde-24h, font-display) e SEM repetir a grade de
// "datas disponíveis" — essa é a MercadoFuturo.tsx real, logo abaixo, com dados
// do Supabase. Copy educativa/institucional, não é dado de produto — mesmo
// padrão de VendaFuturaPassos.tsx (texto estático permitido). Regra restrita a
// B2B (CNPJ/IE) confirmada em docs/business-rules.md.
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
    icone: (
      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
    ),
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
    icone: (
      <path d="M16 3.13a4 4 0 010 7.75M21 21v-2a4 4 0 00-3-3.87M13 21v-2a4 4 0 00-8 0v2M9 11a4 4 0 100-8 4 4 0 000 8z" />
    ),
  },
  {
    titulo: "Compra segura, restrita a B2B",
    texto: "Só empresas com CNPJ e IE reservam — sem concorrência com consumidor final pelo mesmo lote.",
    icone: (
      <path d="M12 22s8-4.5 8-11V5l-8-3-8 3v6c0 6.5 8 11 8 11z" />
    ),
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

export function MercadoFuturoIntro() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-vf-roxo">
        <div className="relative mx-auto max-w-[1280px] px-4 py-12 sm:px-6 sm:py-16">
          <span className="inline-flex items-center rounded-full bg-white/12 px-3 py-1 text-[11px] font-bold uppercase tracking-[.1em] text-white ring-1 ring-white/25">
            Mercado Futuro B2B
          </span>
          <h2 className="font-display mt-4 max-w-[640px] text-2xl font-extrabold leading-tight text-white sm:text-4xl">
            Compre hoje, receba na data certa, pague o preço de hoje
          </h2>
          <p className="mt-3 max-w-[560px] text-[15px] text-white/80">
            A Venda Futura trava o preço da sua compra no momento da reserva —
            sua produção, seu volume, sua data de entrega, sem depender do
            valor do mercado quando o pedido chegar.
          </p>
        </div>
      </section>

      {/* Passos */}
      <section className="border-b border-line bg-surface">
        <div className="mx-auto grid max-w-[1280px] gap-4 px-4 py-8 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
          {PASSOS.map((p) => (
            <div key={p.n} className="rounded-lg border border-line bg-white p-4">
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-[10px] bg-vf-roxo font-display text-sm font-extrabold text-white">
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
            <div key={b.titulo} className="rounded-lg border border-line bg-surface p-4">
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-[10px] bg-vf-vermelho/10">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-vf-vermelho"
                  aria-hidden
                >
                  {b.icone}
                </svg>
              </div>
              <h3 className="mb-1 text-[13.5px] font-bold text-ink">{b.titulo}</h3>
              <p className="text-[12px] leading-snug text-ink-2">{b.texto}</p>
            </div>
          ))}
        </div>

        <details className="group mt-6 rounded-lg border border-line bg-surface">
          <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-[13px] font-bold text-ink">
            Dúvidas frequentes sobre a Venda Futura
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              className="shrink-0 text-vf-roxo transition-transform group-open:rotate-180"
              aria-hidden
            >
              <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </summary>
          <div className="grid gap-4 border-t border-line px-4 py-4 sm:grid-cols-2">
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
