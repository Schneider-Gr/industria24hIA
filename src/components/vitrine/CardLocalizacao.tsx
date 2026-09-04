import { CepBar } from "@/components/vitrine/CepBar";

/**
 * Card logo abaixo do banner principal pedindo a localização. Complementa a
 * faixa do topo (`PortaoCep`): quem rolou o carrossel sem reparar na faixa
 * ainda encontra o pedido no fluxo natural da página, sem nada sobrepondo o
 * conteúdo. Só aparece quando ainda não há CEP — mesma condição do portão.
 *
 * ponytail: sem componente client próprio — o CepBar já é o client component
 * que abre o modal e trata a geolocalização; aqui é só o invólucro visual.
 */
export function CardLocalizacao() {
  return (
    <section className="mx-auto mt-4 max-w-[1280px] px-4 sm:px-6">
      <div className="flex flex-col gap-3 rounded-md border border-line bg-surface px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <p className="text-sm font-semibold text-ink">Onde você quer receber?</p>
          <p className="mt-0.5 text-xs text-muted">
            Informe sua localização para ver só os produtos que chegam até você, com prazo e
            frete certos.
          </p>
        </div>
        <div className="shrink-0 rounded-sm bg-lm-marinho px-4 py-1.5">
          <CepBar />
        </div>
      </div>
    </section>
  );
}
