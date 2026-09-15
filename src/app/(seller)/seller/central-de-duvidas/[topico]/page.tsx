import Link from "next/link";
import { notFound } from "next/navigation";
import { PageTitle } from "@/components/seller/states";
import { MANUAL_SELLER } from "@/components/seller/manual-seller";
import { RenderBloco } from "@/components/seller/manual-blocos";

// Um tópico do manual em rota própria, para o link que o botão de ajuda manda
// e para o seller mandar a um funcionário. A página única continua existindo
// com as âncoras que foram para produção no PR #600 — nada de redirect, as
// duas formas levam ao mesmo conteúdo.

export function generateStaticParams() {
  return MANUAL_SELLER.map((t) => ({ topico: t.id }));
}

export default async function TopicoPage({ params }: { params: Promise<{ topico: string }> }) {
  const { topico: slug } = await params;
  const indice = MANUAL_SELLER.findIndex((t) => t.id === slug);
  if (indice < 0) notFound();
  const topico = MANUAL_SELLER[indice];
  const anterior = MANUAL_SELLER[indice - 1];
  const proximo = MANUAL_SELLER[indice + 1];

  return (
    <div>
      <PageTitle title={topico.titulo} subtitle={`Manual do Seller · tópico ${topico.numero}`} />

      <div className="space-y-3">
        {topico.blocos.map((b, i) => (
          <RenderBloco key={i} bloco={b} />
        ))}
      </div>

      {/* Ler o manual é uma sequência, não uma busca a cada tópico: quem
          terminou "Cadastrar produto" quase sempre quer "Desconto
          progressivo" a seguir. */}
      <nav
        aria-label="Navegação entre tópicos"
        className="mt-10 flex flex-col gap-3 border-t border-line pt-6 sm:flex-row sm:items-stretch sm:justify-between"
      >
        {anterior ? (
          <Link
            href={`/seller/central-de-duvidas/${anterior.id}`}
            className="group flex-1 rounded-lg border border-line px-4 py-3 hover:border-lm-azul sm:max-w-[48%]"
          >
            <span className="block text-xs text-muted">← Anterior</span>
            <span className="mt-0.5 block text-sm font-medium text-ink group-hover:text-lm-azul">
              {anterior.titulo}
            </span>
          </Link>
        ) : (
          <span className="flex-1 sm:max-w-[48%]" />
        )}
        {proximo ? (
          <Link
            href={`/seller/central-de-duvidas/${proximo.id}`}
            className="group flex-1 rounded-lg border border-line px-4 py-3 text-right hover:border-lm-azul sm:max-w-[48%]"
          >
            <span className="block text-xs text-muted">Próximo →</span>
            <span className="mt-0.5 block text-sm font-medium text-ink group-hover:text-lm-azul">
              {proximo.titulo}
            </span>
          </Link>
        ) : (
          <span className="flex-1 sm:max-w-[48%]" />
        )}
      </nav>

      <Link
        href="/seller/central-de-duvidas"
        className="mt-6 inline-block text-sm text-lm-azul underline-offset-2 hover:underline"
      >
        ← Todos os tópicos
      </Link>
    </div>
  );
}
