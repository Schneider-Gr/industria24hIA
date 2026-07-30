import Link from "next/link";

// Página de "não encontrado" da aplicação. Sem este arquivo o App Router cai no
// fallback default do Next, que na Vercel sai com HTTP 200 (soft-404) mesmo
// quando `notFound()` roda — verificado em produção nas rotas /termos/[slug],
// /produto/[id], /loja/[id] e /categoria/[id]. Soft-404 faz buscador indexar
// URL inválida como boa e monitor de uptime não acusar rota quebrada.
export default function NotFound() {
  return (
    <main className="mx-auto flex max-w-xl flex-col items-center px-6 py-20 text-center">
      <p className="font-display text-5xl font-extrabold text-aco-600">404</p>
      <h1 className="font-display mt-4 text-2xl font-bold text-ink">
        Página não encontrada
      </h1>
      <p className="mt-3 text-sm text-muted">
        O endereço não existe ou o item saiu do ar. Verifique o link ou volte para a
        vitrine.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          href="/"
          className="rounded bg-sinal px-5 py-2 text-sm font-semibold text-white hover:bg-sinal-escuro"
        >
          Ir para a vitrine
        </Link>
        <Link
          href="/busca"
          className="rounded border border-borda px-5 py-2 text-sm font-semibold text-ink-2 hover:bg-aco-100"
        >
          Buscar produtos
        </Link>
      </div>
    </main>
  );
}
