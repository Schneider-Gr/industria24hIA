/**
 * Ícones de linha do menu mobile. ponytail: SVG inline em vez de uma
 * biblioteca — são doze glifos de 20px, todos com o mesmo traço 1.6 do
 * `IconePin` do CepBar e da TabBarMobile, para o menu não destoar.
 */
type P = { className?: string };

const base = (d: React.ReactNode) =>
  function Icone({ className = "h-[18px] w-[18px]" }: P) {
    return (
      <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden>
        {d}
      </svg>
    );
  };

const t = { stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round" } as const;

export const IconePedidos = base(
  <>
    <path d="M4 6.5 10 3.5l6 3v7l-6 3-6-3v-7Z" {...t} />
    <path d="M4 6.5 10 9.5l6-3M10 9.5v7" {...t} />
  </>,
);
export const IconeMensagens = base(<path d="M3.5 5.5h13v8h-7l-3.5 3v-3h-2.5v-8Z" {...t} />);
export const IconeOfertas = base(
  <>
    <path d="M10.5 3.5 16.5 9.5 10 16 4 10l.5-6 6-.5Z" {...t} />
    <circle cx="8" cy="8" r="1.1" {...t} />
  </>,
);
export const IconeVendaFutura = base(
  <>
    <circle cx="10" cy="10" r="6.5" {...t} />
    <path d="M10 6.5V10l2.5 1.5" {...t} />
  </>,
);
export const IconeColetivas = base(
  <>
    <circle cx="7.5" cy="7.5" r="2.3" {...t} />
    <circle cx="13.5" cy="8.5" r="1.8" {...t} />
    <path d="M3.5 15c.6-2.2 2.1-3.4 4-3.4s3.4 1.2 4 3.4M13 11.8c1.6.1 2.7 1.2 3.2 3" {...t} />
  </>,
);
export const IconeAjuda = base(
  <>
    <circle cx="10" cy="10" r="6.5" {...t} />
    <path d="M8.2 8a1.9 1.9 0 1 1 2.5 1.8c-.5.2-.7.6-.7 1.1v.3" {...t} />
    <circle cx="10" cy="13.6" r=".8" fill="currentColor" stroke="none" />
  </>,
);
export const IconeLoja = base(
  <>
    <path d="M4 8.5V16h12V8.5" {...t} />
    <path d="M3.2 8.5 4.5 4.5h11l1.3 4a2 2 0 0 1-3.5 1.3 2 2 0 0 1-3.3 0 2 2 0 0 1-3.3 0A2 2 0 0 1 3.2 8.5Z" {...t} />
  </>,
);
export const IconeCupom = base(
  <>
    <path d="M3 8V6h14v2a2 2 0 0 0 0 4v2H3v-2a2 2 0 0 0 0-4Z" {...t} />
    <path d="M8 8.5v3" {...t} strokeDasharray="1.5 2" />
  </>,
);
export const IconeComissao = base(
  <>
    <circle cx="10" cy="10" r="6.5" {...t} />
    <path d="M12 7.5H9.2a1.4 1.4 0 0 0 0 2.8h1.6a1.4 1.4 0 0 1 0 2.8H8M10 6v1.5M10 13v1.5" {...t} />
  </>,
);
export const IconeEntrega = base(
  <>
    <path d="M2.5 6.5h8v7h-8v-7ZM10.5 9h3l2 2.2v2.3h-5V9Z" {...t} />
    <circle cx="6" cy="14.5" r="1.4" {...t} />
    <circle cx="13.5" cy="14.5" r="1.4" {...t} />
  </>,
);
export const IconeIntegrar = base(
  <>
    <path d="M7.5 5.5 3.5 10l4 4.5M12.5 5.5l4 4.5-4 4.5" {...t} />
  </>,
);
export const IconeConta = base(
  <>
    <circle cx="10" cy="6.8" r="2.8" {...t} />
    <path d="M4 16c.6-3 2.9-4.6 6-4.6s5.4 1.6 6 4.6" {...t} />
  </>,
);
export const IconeDoc = base(
  <>
    <path d="M5.5 3.5h6L15 7v9.5H5.5v-13Z" {...t} />
    <path d="M11.5 3.5V7H15M8 10.5h4M8 13h4" {...t} />
  </>,
);

export const IconeFavorito = base(
  <path
    d="M10 16.2 4.6 11a3.2 3.2 0 0 1 4.5-4.5l.9.9.9-.9A3.2 3.2 0 0 1 15.4 11L10 16.2Z"
    {...t}
  />,
);
export const IconeAviso = base(
  <>
    <path d="M5.5 8.3a4.5 4.5 0 0 1 9 0c0 3 .9 4.2 1.4 4.7H4.1c.5-.5 1.4-1.7 1.4-4.7Z" {...t} />
    <path d="M8.4 15.4a1.8 1.8 0 0 0 3.2 0" {...t} />
  </>,
);
