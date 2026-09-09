import { CepBar } from "@/components/vitrine/CepBar";

/**
 * Aviso de que o CEP do comprador removeu produtos da listagem.
 *
 * A decisão de 08/09/2026 é esconder o que não chega ao comprador, e não
 * rotular item a item. Esconder em silêncio, porém, faz o catálogo parecer
 * menor do que é — pior ainda quando a localização foi obtida
 * automaticamente e o comprador nem digitou o CEP. Este aviso fecha essa
 * lacuna: diz quantos produtos ficaram de fora e deixa o CEP à mão para
 * trocar, sem devolver o item escondido à vitrine.
 */
export function AvisoForaDaFaixa({
  quantidade,
  cidade,
  uf,
}: {
  quantidade: number;
  cidade?: string | null;
  uf?: string | null;
}) {
  if (quantidade <= 0) return null;

  const onde = cidade && uf ? `${cidade}, ${uf}` : "seu endereço";
  const plural = quantidade > 1;

  return (
    <section className="mx-auto mb-4 max-w-[1280px] px-4 pt-4 sm:px-6" aria-live="polite">
      <div className="flex flex-col gap-3 rounded-md border border-line bg-surface px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="text-sm text-ink">
          Mostrando o que chega em <span className="font-semibold">{onde}</span>.{" "}
          <span className="text-muted">
            {plural
              ? `${quantidade} produtos não estão disponíveis para esse CEP e ficaram fora da lista.`
              : "1 produto não está disponível para esse CEP e ficou fora da lista."}
          </span>
        </p>
        <div className="shrink-0 rounded-sm bg-lm-marinho px-4 py-1.5">
          <CepBar />
        </div>
      </div>
    </section>
  );
}
