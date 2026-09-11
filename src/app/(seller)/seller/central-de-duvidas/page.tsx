import Link from "next/link";
import { PageTitle } from "@/components/seller/states";
import { MANUAL_SELLER, type Bloco } from "@/components/seller/manual-seller";

// Central de Dúvidas = Manual do Seller em tópicos. Os vídeos continuam em
// /seller/tutoriais. ponytail: sem busca própria; tudo renderizado aberto, o
// Ctrl+F do navegador cobre. Busca em JS se o manual crescer muito.

function RenderBloco({ bloco }: { bloco: Bloco }) {
  switch (bloco.tipo) {
    case "p":
      return <p className="text-sm leading-relaxed text-ink">{bloco.texto}</p>;
    case "subtitulo":
      return <h3 className="pt-2 font-semibold text-ink">{bloco.texto}</h3>;
    case "passos":
      return (
        <ol className="list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-ink">
          {bloco.itens.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ol>
      );
    case "lista":
      return (
        <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-ink">
          {bloco.itens.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      );
    case "campos":
      return (
        <dl className="divide-y divide-line rounded border border-line text-sm">
          {bloco.itens.map(([campo, desc]) => (
            <div key={campo} className="grid gap-1 p-3 sm:grid-cols-[14rem_1fr] sm:gap-4">
              <dt className="font-medium text-ink">{campo}</dt>
              <dd className="text-muted">{desc}</dd>
            </div>
          ))}
        </dl>
      );
    case "tabela":
      return (
        <div>
          <div className="overflow-x-auto rounded border border-line">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface text-ink">
                <tr>
                  {bloco.cabecalho.map((c) => (
                    <th key={c} className="px-3 py-2 font-medium">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line text-muted">
                {bloco.linhas.map((linha) => (
                  <tr key={linha.join("|")}>
                    {linha.map((cel, i) => (
                      <td key={i} className="px-3 py-2">
                        {cel}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {bloco.nota && <p className="mt-2 text-xs text-muted">{bloco.nota}</p>}
        </div>
      );
    case "aviso":
      return (
        <div className="rounded border-l-4 border-sinal bg-surface p-3 text-sm">
          <p className="font-semibold text-ink">{bloco.titulo}</p>
          <p className="mt-1 text-muted">{bloco.texto}</p>
        </div>
      );
  }
}

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
