// Conteúdo institucional da seção Mercado Futuro (#mercado-futuro): benefícios e
// dúvidas frequentes sobre a Venda Futura. Copy educativa/institucional, não é
// dado de produto — mesmo padrão de VendaFuturaPassos.tsx (texto estático permitido).
// Regra restrita a B2B (CNPJ/IE) confirmada em docs/business-rules.md.
const BENEFICIOS = [
  {
    titulo: "Preço travado na reserva",
    texto: "O valor não sobe entre a reserva e a entrega — feche o custo do insumo com meses de antecedência.",
    icone: (
      <>
        <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
      </>
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
    titulo: "Direto do fabricante",
    texto: "Sem atravessador: a reserva vai direto para a loja que produz, com o mesmo repasse de 5% do marketplace.",
    icone: (
      <>
        <path d="M16 3.13a4 4 0 010 7.75M21 21v-2a4 4 0 00-3-3.87M13 21v-2a4 4 0 00-8 0v2M9 11a4 4 0 100-8 4 4 0 000 8z" />
      </>
    ),
  },
  {
    titulo: "Compra restrita a B2B",
    texto: "Só empresas com CNPJ e Inscrição Estadual reservam — sem concorrência com consumidor final pelo mesmo lote.",
    icone: (
      <>
        <path d="M12 22s8-4.5 8-11V5l-8-3-8 3v6c0 6.5 8 11 8 11z" />
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
    <div className="mx-auto max-w-[1280px] px-4 pt-6 sm:px-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
  );
}
