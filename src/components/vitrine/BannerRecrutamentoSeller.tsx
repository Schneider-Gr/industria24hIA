import Link from "next/link";

// Banner institucional de recrutamento de vendedores — copy fornecida pelo
// dono nesta sessão (número de produtores/satisfação/margem são claim de
// marketing, não dado consultado ao vivo; mesmo tratamento já dado à copy
// estática de VendaFuturaPassos/CestasBanner).
const BENEFICIOS = [
  {
    titulo: "Mais margem",
    texto: "Venda direta sem intermediários",
    icone: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M9 9h.01M15 15h.01M15 9 9 15" strokeLinecap="round" />
      </>
    ),
  },
  {
    titulo: "Gestão simples",
    texto: "Painel intuitivo e completo",
    icone: (
      <>
        <rect x="3" y="4" width="18" height="14" rx="2" />
        <path d="M7 20h10M9 18v2M15 18v2" strokeLinecap="round" />
        <path d="M7 14l3-3 2.5 2.5L17 9" strokeLinecap="round" strokeLinejoin="round" />
      </>
    ),
  },
  {
    titulo: "Alcance nacional",
    texto: "Venda para todo o Brasil",
    icone: (
      <>
        <path d="M12 21s-7-5.1-7-11a7 7 0 0 1 14 0c0 5.9-7 11-7 11z" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="12" cy="10" r="2.4" />
      </>
    ),
  },
] as const;

const STATS = [
  { valor: "+5.000", rotulo: "Produtores cadastrados" },
  { valor: "98%", rotulo: "Satisfação" },
  { valor: "+40%", rotulo: "Margem extra" },
] as const;

export function BannerRecrutamentoSeller() {
  return (
    <section className="mx-auto mt-10 max-w-[1280px] px-4 sm:px-6">
      <div className="overflow-hidden rounded-lg bg-lm-marinho">
        <div className="grid grid-cols-1 gap-8 p-8 sm:p-12 lg:grid-cols-[1.3fr_1fr]">
          <div>
            <h2 className="font-display text-[28px] font-extrabold leading-[1.08] text-white sm:text-[36px]">
              Venda direto para
              <br />
              <span className="text-lm-amarelo">o Brasil inteiro</span>
            </h2>
            <p className="mt-3 max-w-[440px] text-[14.5px] leading-relaxed text-white/75">
              Cadastre sua produção e alcance milhares de compradores. Quanto
              maior o volume, maior seu desconto.
            </p>

            <div className="mt-7 grid grid-cols-1 gap-5 sm:grid-cols-3">
              {BENEFICIOS.map((b) => (
                <div key={b.titulo} className="flex items-start gap-2.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-white/10">
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-lm-amarelo" aria-hidden>
                      {b.icone}
                    </svg>
                  </div>
                  <div>
                    <p className="text-[13px] font-bold text-white">{b.titulo}</p>
                    <p className="text-[11.5px] leading-snug text-white/65">{b.texto}</p>
                  </div>
                </div>
              ))}
            </div>

            <Link
              href="/vender"
              className="mt-8 inline-flex items-center gap-2 rounded-sm bg-lm-azul px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-lm-azul-escuro"
            >
              Cadastrar minha indústria
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden>
                <path d="M5 12h14M13 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-4 self-center border-t border-white/10 pt-7 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
            {STATS.map((s) => (
              <div key={s.rotulo}>
                <p className="font-display num text-[26px] font-extrabold text-lm-amarelo sm:text-[30px]">
                  {s.valor}
                </p>
                <p className="mt-1 text-[11.5px] leading-snug text-white/65">{s.rotulo}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
