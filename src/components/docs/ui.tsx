import Link from "next/link";

// Blocos de documentação reusados pela /integracoes (usuário final) e pelas
// páginas /desenvolvedores (referência técnica). Tokens Aço & Sinal.

export function Bloco({ children }: { children: React.ReactNode }) {
  return (
    <pre className="overflow-x-auto rounded-sm border border-aco-100 bg-aco-900 p-4 text-sm text-white/90">
      <code>{children}</code>
    </pre>
  );
}

export function Passo({ n, titulo, children }: { n: number; titulo: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-4">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sinal font-archivo text-sm font-bold text-white">
        {n}
      </span>
      <div className="flex-1 space-y-3">
        <h3 className="font-archivo text-lg font-bold text-aco-900">{titulo}</h3>
        {children}
      </div>
    </li>
  );
}

export function Cod({ children }: { children: React.ReactNode }) {
  return <code className="rounded bg-aco-100 px-1">{children}</code>;
}

export function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="mb-4 font-archivo text-2xl font-extrabold text-aco-900">{titulo}</h2>
      <div className="space-y-4 text-aco-800">{children}</div>
    </section>
  );
}

export function Tabela({ cabecalho, linhas }: { cabecalho: string[]; linhas: React.ReactNode[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b-2 border-aco-900">
            {cabecalho.map((c) => (
              <th key={c} className="py-2 pr-4 font-archivo font-bold text-aco-900">{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {linhas.map((linha, i) => (
            <tr key={i} className="border-b border-aco-100 align-top">
              {linha.map((celula, j) => (
                <td key={j} className="py-2 pr-4 text-aco-800">{celula}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Navegação entre as páginas da seção de desenvolvedor.
const PAGINAS = [
  { href: "/desenvolvedores", titulo: "Visão geral" },
  { href: "/desenvolvedores/autenticacao", titulo: "Autenticação" },
  { href: "/desenvolvedores/referencia", titulo: "Referência das ferramentas" },
  { href: "/desenvolvedores/rastreamento", titulo: "Rastreio em tempo real" },
];

export function NavDocs({ atual }: { atual: string }) {
  return (
    <nav className="mb-10 flex flex-wrap gap-2 border-b border-aco-100 pb-4">
      {PAGINAS.map((p) => (
        <Link
          key={p.href}
          href={p.href}
          className={
            p.href === atual
              ? "rounded-sm bg-aco-900 px-3 py-1 text-sm font-bold text-white"
              : "rounded-sm border border-aco-100 px-3 py-1 text-sm text-aco-800 hover:border-aco-900"
          }
        >
          {p.titulo}
        </Link>
      ))}
    </nav>
  );
}
