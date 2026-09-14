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
  const topico = MANUAL_SELLER.find((t) => t.id === slug);
  if (!topico) notFound();

  return (
    <div>
      <PageTitle title={topico.titulo} subtitle={`Manual do Seller · tópico ${topico.numero}`} />

      <div className="space-y-3">
        {topico.blocos.map((b, i) => (
          <RenderBloco key={i} bloco={b} />
        ))}
      </div>

      <Link
        href="/seller/central-de-duvidas"
        className="mt-8 inline-block text-sm text-aco-600 underline-offset-2 hover:underline"
      >
        ← Todos os tópicos
      </Link>
    </div>
  );
}
