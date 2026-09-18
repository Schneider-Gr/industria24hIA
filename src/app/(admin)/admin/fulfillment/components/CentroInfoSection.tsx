"use client";

interface CentroInfoSectionProps {
  centro: {
    id: string;
    nome: string;
    localizacao: string | null;
    cep?: string | number | null;
  };
  totalPosicoes: number;
  saldoTotal: number;
}

export function CentroInfoSection({
  centro,
  totalPosicoes,
  saldoTotal
}: CentroInfoSectionProps) {
  return (
    <div className="grid grid-cols-4 gap-4">
      <div className="bg-white dark:bg-card-dark rounded p-4 border border-separator dark:border-separator-dark">
        <p className="text-xs text-muted uppercase tracking-wide font-semibold">Centro</p>
        <p className="text-lg font-semibold text-ink dark:text-ink-2 mt-1">{centro.nome}</p>
      </div>

      <div className="bg-white dark:bg-card-dark rounded p-4 border border-separator dark:border-separator-dark">
        <p className="text-xs text-muted uppercase tracking-wide font-semibold">Endereço</p>
        <p className="text-sm text-ink dark:text-ink-2 mt-1">{centro.localizacao}</p>
      </div>

      <div className="bg-white dark:bg-card-dark rounded p-4 border border-separator dark:border-separator-dark">
        <p className="text-xs text-muted uppercase tracking-wide font-semibold">Posições</p>
        <p className="text-lg font-semibold text-ink dark:text-ink-2 mt-1">{totalPosicoes}</p>
      </div>

      <div className="bg-white dark:bg-card-dark rounded p-4 border border-separator dark:border-separator-dark">
        <p className="text-xs text-muted uppercase tracking-wide font-semibold">Saldo Total</p>
        <p className="text-lg font-semibold text-ink dark:text-ink-2 mt-1">{saldoTotal.toLocaleString("pt-BR")}</p>
      </div>
    </div>
  );
}
