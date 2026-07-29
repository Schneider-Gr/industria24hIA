import Link from "next/link";

// Tarja explicativa do mecanismo de Venda Futura (mockup industria24h-redesign.html):
// hoje o conceito só existia como link no header, sem explicar o funcionamento.
// Copy é educativa/institucional (não é dado de produto), permitida como texto estático.
const PASSOS = [
  {
    titulo: "1. Reserve na Venda Futura",
    texto: "Garanta o lote pelo preço de hoje, antes da produção ficar pronta.",
  },
  {
    titulo: "2. Preço travado",
    texto: "O valor combinado não muda, mesmo se o mercado subir até a entrega.",
  },
  {
    titulo: "3. Receba na data certa",
    texto: "Entrega programada assim que o produto fica disponível.",
  },
] as const;

export function VendaFuturaPassos() {
  return (
    <Link
      href="/#mercado-futuro"
      className="block border-b border-line bg-surface transition-colors hover:bg-purple-soft/40"
    >
      <div className="mx-auto grid max-w-[1280px] gap-5 px-4 py-5 sm:grid-cols-3 sm:px-6">
        {PASSOS.map((p) => (
          <div key={p.titulo} className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-purple-soft">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-purple-royal" aria-hidden>
                <rect x="3" y="5" width="18" height="16" rx="2" />
                <path d="M3 10h18" />
                <path d="M7.5 15.5l3-3 2.2 2.2 3.8-3.8" />
              </svg>
            </div>
            <div>
              <h4 className="text-[13px] font-bold text-ink">{p.titulo}</h4>
              <p className="text-[11.5px] leading-snug text-ink-2">{p.texto}</p>
            </div>
          </div>
        ))}
      </div>
    </Link>
  );
}
