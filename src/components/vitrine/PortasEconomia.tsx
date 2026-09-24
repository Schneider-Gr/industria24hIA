import Link from "next/link";

// Navegação por mecanismo de economia (PRODUCT.md, Positioning): as cinco
// formas de pagar menos ganham porta própria logo abaixo do banner. Compra
// coletiva não tinha nenhuma entrada no corpo da home.
const PORTAS = [
  {
    href: "/#ofertas",
    titulo: "Desconto por volume",
    texto: "Quanto mais leva, menor o preço",
    icone: <path d="M4 20h4v-4H4zM10 20h4v-8h-4zM16 20h4V8h-4z" />,
  },
  {
    href: "/venda-futura",
    titulo: "Venda futura",
    texto: "Reserve hoje, pague menos",
    icone: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M3 10h18M8 3v4M16 3v4" />
      </>
    ),
  },
  {
    href: "/coletivas",
    titulo: "Compra coletiva",
    texto: "Junte-se e compre em volume",
    icone: (
      <>
        <circle cx="9" cy="8" r="3" />
        <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
        <path d="M16 5.3a3 3 0 0 1 0 5.4M18 14.4c1.8.8 3 2.6 3 4.6" />
      </>
    ),
  },
  {
    // A seção de lojas saiu da home (23/09); a porta leva aos produtos, que
    // é onde o comprador chega à indústria pelo card.
    href: "/#produtos",
    titulo: "Direto da fábrica",
    texto: "Sem intermediário",
    icone: (
      <>
        <path d="M3 21V10l5 3V10l5 3V6l8 4v11z" />
        <path d="M3 21h18" />
      </>
    ),
  },
  {
    href: "/#produtos",
    titulo: "Entrega 24h",
    texto: "Em Manaus, pelo seu CEP",
    icone: (
      <>
        <rect x="1" y="6" width="15" height="12" rx="2" />
        <path d="M16 10h4l3 3v5h-7z" />
        <circle cx="6" cy="19" r="1.6" />
        <circle cx="18" cy="19" r="1.6" />
      </>
    ),
  },
] as const;

export function PortasEconomia() {
  return (
    <nav aria-label="Formas de economizar" className="border-b border-line bg-surface">
      <ul className="mx-auto grid max-w-[1280px] grid-cols-2 gap-2 px-4 py-3 sm:grid-cols-3 sm:px-6 lg:grid-cols-5 lg:gap-0 lg:divide-x lg:divide-line lg:py-4">
        {PORTAS.map((p) => (
          <li key={p.titulo} className="min-w-0 last:col-span-2 sm:last:col-span-1">
            <Link
              href={p.href}
              className="group flex h-full items-center gap-2.5 rounded-lg border border-line px-3 py-2 transition-colors hover:border-lm-azul lg:rounded-none lg:border-0 lg:px-5 lg:py-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lm-azul"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="shrink-0 text-lm-azul"
                aria-hidden
              >
                {p.icone}
              </svg>
              <span className="leading-tight">
                <span className="block text-[13px] font-bold text-ink group-hover:text-lm-azul">
                  {p.titulo}
                </span>
                <span className="hidden whitespace-nowrap text-[11.5px] text-ink-2 lg:block">{p.texto}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
