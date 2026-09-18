"use client";

import { Table, EmptyState } from "@/components/admin/ui";

interface SaldoCentro {
  produto_id: string;
  quantidade: number;
}

interface SaldoEndereco {
  produto_id: string;
  quantidade: number;
}

export function DivergenciaSection({
  saldoCentro,
  saldosEndereco,
  divergencia
}: {
  saldoCentro: SaldoCentro[];
  saldosEndereco: SaldoEndereco[];
  divergencia: number;
}) {
  const saldoEnderecoMap = new Map(
    saldosEndereco.map((s) => [s.produto_id, s.quantidade])
  );

  if (saldoCentro.length === 0) {
    return <EmptyState>Nenhum saldo no centro. A divergência é zero.</EmptyState>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white dark:bg-card-dark rounded p-4 border border-separator dark:border-separator-dark">
          <p className="text-xs text-muted uppercase tracking-wide font-semibold">
            Saldo do Centro
          </p>
          <p className="text-lg font-semibold text-ink dark:text-ink-2 mt-1">
            {saldoCentro.reduce((sum, s) => sum + s.quantidade, 0).toLocaleString("pt-BR")}
          </p>
        </div>

        <div className="bg-white dark:bg-card-dark rounded p-4 border border-separator dark:border-separator-dark">
          <p className="text-xs text-muted uppercase tracking-wide font-semibold">
            Soma de Posições
          </p>
          <p className="text-lg font-semibold text-ink dark:text-ink-2 mt-1">
            {saldosEndereco.reduce((sum, s) => sum + s.quantidade, 0).toLocaleString("pt-BR")}
          </p>
        </div>

        <div className="bg-white dark:bg-card-dark rounded p-4 border border-separator dark:border-separator-dark">
          <p className="text-xs text-muted uppercase tracking-wide font-semibold">
            Divergência
          </p>
          <p className={`text-lg font-semibold mt-1 ${
            divergencia === 0
              ? "text-ok dark:text-ok-light"
              : "text-error dark:text-error-light"
          }`}>
            {divergencia.toLocaleString("pt-BR")}
          </p>
        </div>
      </div>

      <div>
        <h4 className="text-sm font-semibold text-ink dark:text-ink-2 mb-3">
          Divergência por Produto
        </h4>
        <Table headers={["Produto ID", "Saldo Centro", "Saldo Posições", "Divergência"]}>
          {saldoCentro.map((s) => {
            const saldoPos = saldoEnderecoMap.get(s.produto_id) ?? 0;
            const div = s.quantidade - saldoPos;
            return (
              <tr
                key={s.produto_id}
                className={`text-ink dark:text-ink-2 ${
                  div !== 0 ? "bg-alert-bg dark:bg-alert-bg-dark" : ""
                }`}
              >
                <td className="px-4 py-3 font-mono text-xs">{s.produto_id.slice(0, 8)}…</td>
                <td className="px-4 py-3 text-right">{s.quantidade}</td>
                <td className="px-4 py-3 text-right">{saldoPos}</td>
                <td className={`px-4 py-3 text-right font-semibold ${
                  div === 0 ? "" : "text-error dark:text-error-light"
                }`}>
                  {div}
                </td>
              </tr>
            );
          })}
        </Table>
      </div>

      <div className="bg-note-bg dark:bg-note-bg-dark rounded p-4 border border-note dark:border-note-dark">
        <p className="text-sm text-note dark:text-note-light font-semibold mb-2">
          ℹ Sobre a divergência
        </p>
        <p className="text-xs text-muted">
          A divergência é <strong>esperada e temporária</strong> até a separação (US04 do PRD 039) existir.
          Quando uma venda sai do CD, o saldo do centro decresce, mas a posição de origem não é informada
          (a separação manual ainda não existe), então o saldo por posição não cai.
        </p>
      </div>
    </div>
  );
}
