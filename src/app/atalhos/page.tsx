import Link from "next/link";
import { VitrineHeader, VitrineFooter } from "@/components/vitrine/ui";

const GRUPOS = [
  {
    titulo: "Auth",
    links: [
      { href: "/login", label: "Login" },
      { href: "/cadastro", label: "Cadastro" },
      { href: "/definir-senha", label: "Definir senha" },
    ],
  },
  {
    titulo: "Seller",
    links: [
      { href: "/seller", label: "Painel do vendedor" },
      { href: "/seja-fornecedor", label: "Cadastrar minha indústria" },
    ],
  },
  {
    titulo: "Afiliado / Parceiro",
    links: [
      { href: "/vender-como-afiliado", label: "Venda como afiliado" },
      { href: "/afiliado/solicitar", label: "Afiliado logística" },
      { href: "/seja-parceiro", label: "Seja parceiro" },
      { href: "/parceiro/cadastro", label: "Parceiro — cadastro" },
    ],
  },
];

export default function AtalhosPage() {
  return (
    <>
      <VitrineHeader />
      <main className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="font-display text-2xl font-bold text-ink">Atalhos</h1>
        <p className="mt-1 text-sm text-ink-2">
          Links rápidos para as principais áreas da plataforma.
        </p>
        {GRUPOS.map((grupo) => (
          <section key={grupo.titulo} className="mt-8">
            <h2 className="text-xs font-semibold uppercase tracking-[.12em] text-ink-2">
              {grupo.titulo}
            </h2>
            <ul className="mt-3 space-y-2">
              {grupo.links.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="block rounded-lg border border-line bg-surface px-4 py-2.5 text-sm text-ink transition-colors hover:border-lm-azul"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </main>
      <VitrineFooter />
    </>
  );
}
