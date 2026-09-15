import Link from "next/link";
import { PageTitle } from "@/components/seller/states";
import { MANUAL_SELLER } from "@/components/seller/manual-seller";
import { RenderBloco } from "@/components/seller/manual-blocos";
import { BuscaManual } from "@/components/seller/BuscaManual";

// Central de Dúvidas = Manual do Seller em tópicos. Os vídeos continuam em
// /seller/tutoriais. ponytail: sem busca própria; tudo renderizado aberto, o
// Ctrl+F do navegador cobre. Busca em JS se o manual crescer muito.

export default function CentralDeDuvidasPage() {
  return (
    <div>
      <PageTitle
        title="Central de Dúvidas"
        subtitle="Manual do Seller: passo a passo do painel, da criação da loja ao repasse"
      />
      <p className="mb-6 text-sm text-muted">
        Prefere vídeo? Veja os{" "}
        <Link href="/seller/tutoriais" className="text-aco-600 underline-offset-2 hover:underline">
          Tutoriais
        </Link>
        .
      </p>

      <BuscaManual />

      <nav id="indice" aria-label="Índice do manual" className="mb-10 scroll-mt-20 rounded border border-line bg-surface p-4">
        <h2 className="mb-3 font-display text-[13px] font-medium uppercase tracking-[0.08em] text-aco-900">
          Índice
        </h2>
        <ol className="grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
          {MANUAL_SELLER.map((t) => (
            <li key={t.id}>
              <a href={`#${t.id}`} className="text-ink hover:text-aco-600 hover:underline">
                <span className="mr-2 tabular-nums text-muted">{t.numero}</span>
                {t.titulo}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="space-y-10">
        {MANUAL_SELLER.map((t) => (
          <section key={t.id} id={t.id} className="scroll-mt-20">
            <h2 className="mb-4 border-b border-line pb-2 font-display text-lg font-semibold text-ink">
              <span className="mr-2 tabular-nums text-muted">{t.numero}</span>
              {t.titulo}
            </h2>
            <div className="space-y-3">
              {t.blocos.map((b, i) => (
                <RenderBloco key={i} bloco={b} />
              ))}
            </div>
            <a href="#indice" className="mt-4 inline-block text-xs text-muted hover:underline">
              ↑ Voltar ao índice
            </a>
          </section>
        ))}
      </div>
    </div>
  );
}
