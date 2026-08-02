// Banner editorial "assinatura de cestas" (mockup 29/07). Não existe módulo
// de assinatura recorrente no schema/backend — CTA fica desabilitado com
// aviso explícito (CLAUDE.md regra 1: nunca fingir integração que não existe).
export function CestasBanner() {
  return (
    <section className="max-w-[1280px] mx-auto px-4 sm:px-6 mt-10 mb-2">
      <div className="grid overflow-hidden rounded-md border border-line sm:grid-cols-2">
        <div className="flex flex-col justify-center gap-3.5 bg-lm-cinza p-8 sm:p-11">
          <p className="text-xs font-semibold uppercase tracking-[.12em] text-ok">
            Em breve
          </p>
          <h3 className="font-display text-2xl font-extrabold leading-tight text-ink sm:text-[28px]">
            Cestas de Verduras direto no seu endereço
          </h3>
          <p className="max-w-[380px] text-[14.5px] leading-relaxed text-ink-2">
            Monte sua cesta com folhas, legumes e temperos frescos das lojas do
            Supermercado, com renovação automática. Estamos preparando essa
            assinatura — cadastre-se numa loja de hortifruti hoje e avisamos
            assim que abrir.
          </p>
          <div className="mt-1 flex flex-wrap gap-2.5">
            <span className="rounded-full border border-line bg-white px-3.5 py-1.5 text-xs font-bold text-ink-2">
              🥗 Kit Salada
            </span>
            <span className="rounded-full border border-line bg-white px-3.5 py-1.5 text-xs font-bold text-ink-2">
              🌿 Kit Temperos
            </span>
            <span className="rounded-full border border-line bg-white px-3.5 py-1.5 text-xs font-bold text-ink-2">
              🥬 Verduras da estação
            </span>
          </div>
          <button
            type="button"
            disabled
            title="Assinatura de cestas ainda não está disponível"
            className="mt-1.5 w-fit cursor-not-allowed rounded-sm bg-lm-azul/40 px-6 py-3 text-sm font-bold text-white"
          >
            Assinatura em breve
          </button>
        </div>

        <div className="flex min-h-[220px] items-center justify-center bg-ok">
          <svg width="150" height="150" viewBox="0 0 200 200" fill="none" aria-hidden>
            <path
              d="M40 80h120l-10 90a10 10 0 0 1-10 9H60a10 10 0 0 1-10-9z"
              fill="#EAF4E6"
              opacity=".92"
            />
            <path
              d="M60 80c0-30 18-46 40-46s40 16 40 46"
              stroke="#fff"
              strokeWidth="6"
              strokeLinecap="round"
            />
            <path d="M50 100h100M46 130h108" stroke="#166534" strokeWidth="4" opacity=".4" />
            <circle cx="80" cy="60" r="16" fill="#7DBE6A" />
            <circle cx="115" cy="55" r="20" fill="#5CA84C" />
            <circle cx="100" cy="70" r="14" fill="#A8D699" />
          </svg>
        </div>
      </div>
    </section>
  );
}
