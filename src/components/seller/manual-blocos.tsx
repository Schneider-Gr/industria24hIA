import { type Bloco } from "@/components/seller/manual-seller";

// Renderização dos blocos do Manual do Seller. Compartilhado entre a página
// única da Central (todos os tópicos abertos) e a rota por tópico.

export function RenderBloco({ bloco }: { bloco: Bloco }) {
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
