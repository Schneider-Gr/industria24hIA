import { CepBar } from "@/components/vitrine/CepBar";

/**
 * Card logo acima do banner principal pedindo a localização. Complementa a
 * faixa do topo (`PortaoCep`): fica no caminho de quem entra, antes do
 * carrossel, sem sobrepor conteúdo. Aparece sempre que falta o CEP, mesmo com
 * sessão aberta (o portão do topo continua só para visitante).
 *
 * ponytail: sem componente client próprio — o CepBar já é o client component
 * que abre o modal e trata a geolocalização; aqui é só o invólucro visual.
 */
export function CardLocalizacao() {
  return (
    <section className="mx-auto mb-4 max-w-[1280px] px-4 pt-4 sm:px-6">
      <div className="flex flex-col gap-3 rounded-md border border-line bg-surface px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <p className="text-sm font-semibold text-ink">Informe seu CEP para ver o que está perto</p>
          <p className="mt-0.5 text-xs text-muted">
            Com o CEP, os produtos mais próximos de você aparecem primeiro, com prazo e frete
            certos. Nada some do catálogo.
          </p>
        </div>
        <div className="shrink-0 rounded-sm bg-lm-marinho px-4 py-1.5">
          <CepBar />
        </div>
      </div>
    </section>
  );
}
