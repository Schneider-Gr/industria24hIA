// Ícone por categoria, casado por palavra-chave no nome (não há campo de ícone
// no schema — nunca inventar coluna nova só para isso). Cobre as 9 categorias
// reais cadastradas hoje (Agro, Combustíveis, Eletrodomésticos, Legumes,
// Madeira, Material de Construção, Pet Shop, Supermercado, Verduras) com
// fallback genérico para categoria nova que ainda não tem match.
function normalizar(nome: string): string {
  return nome
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

const REGRAS: { teste: (n: string) => boolean; path: React.ReactNode }[] = [
  {
    teste: (n) => n.includes("agro"),
    path: (
      <>
        <path d="M12 21V9" />
        <path d="M12 9c-3.5 0-6-2.5-6-6 3.5 0 6 2.5 6 6zM12 9c3.5 0 6-2.5 6-6-3.5 0-6 2.5-6 6z" />
      </>
    ),
  },
  {
    teste: (n) => n.includes("combustivel") || n.includes("combustível"),
    path: (
      <>
        <path d="M4 21V6a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v15" />
        <path d="M4 11h8" />
        <path d="M14 8h2l3 3v6a1.5 1.5 0 0 1-1.5 1.5H17" />
        <path d="M17 11.5v3" />
      </>
    ),
  },
  {
    teste: (n) => n.includes("eletrodomestic") || n.includes("eletrônic") || n.includes("eletronic"),
    path: (
      <>
        <rect x="3" y="4" width="18" height="12" rx="2" />
        <path d="M8 20h8M12 16v4" />
      </>
    ),
  },
  {
    teste: (n) => n.includes("legume"),
    path: (
      <>
        <path d="M4 8h16l-1.5 11a2 2 0 0 1-2 1.8H7.5a2 2 0 0 1-2-1.8L4 8z" />
        <path d="M8 8V6a4 4 0 0 1 8 0v2" />
      </>
    ),
  },
  {
    teste: (n) => n.includes("madeira"),
    path: (
      <>
        <rect x="3" y="6" width="18" height="4" rx="1" />
        <rect x="3" y="14" width="18" height="4" rx="1" />
        <path d="M7 10v4M17 10v4" />
      </>
    ),
  },
  {
    teste: (n) => n.includes("construcao") || n.includes("construção") || n.includes("material"),
    path: (
      <>
        <path d="M3 21h18" />
        <path d="M5 21V10l7-6 7 6v11" />
        <path d="M9 21v-6h6v6" />
      </>
    ),
  },
  {
    teste: (n) => n.includes("pet"),
    path: (
      <>
        <circle cx="6.5" cy="9.5" r="1.6" />
        <circle cx="10.5" cy="6.5" r="1.6" />
        <circle cx="15" cy="6.5" r="1.6" />
        <circle cx="18.5" cy="10" r="1.6" />
        <path d="M8 15.5c0-2.5 2-4.5 4.3-4.5s4.3 2 4.3 4.5-1.9 3.5-4.3 3.5-4.3-1-4.3-3.5z" />
      </>
    ),
  },
  {
    teste: (n) => n.includes("supermercado") || n.includes("mercado"),
    path: (
      <>
        <path d="M3 4h2l2.4 12.2A2 2 0 0 0 9.36 18H18a2 2 0 0 0 1.95-1.57L21.5 9H6" />
        <circle cx="10" cy="21" r="1.4" />
        <circle cx="18" cy="21" r="1.4" />
      </>
    ),
  },
  {
    teste: (n) => n.includes("verdura") || n.includes("hortifruti"),
    path: (
      <>
        <path d="M12 3c-4 0-7 3-7 7 0 5 3 8 7 11 4-3 7-6 7-11 0-4-3-7-7-7z" />
        <path d="M12 3v18M8.5 7c1 2 1 4 0 6M15.5 7c-1 2-1 4 0 6" />
      </>
    ),
  },
];

const GENERICO = (
  <>
    <rect x="2.5" y="2.5" width="6" height="6" rx="1" />
    <rect x="11.5" y="2.5" width="6" height="6" rx="1" />
    <rect x="2.5" y="11.5" width="6" height="6" rx="1" />
    <rect x="11.5" y="11.5" width="6" height="6" rx="1" />
  </>
);

export function IconeCategoria({ nome, className }: { nome: string; className?: string }) {
  const n = normalizar(nome);
  const regra = REGRAS.find((r) => r.teste(n));
  const viewBox = regra ? "0 0 24 24" : "0 0 20 20";
  return (
    <svg viewBox={viewBox} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      {regra ? regra.path : GENERICO}
    </svg>
  );
}
