"use client";

import { Table, EmptyState } from "@/components/admin/ui";

interface Posicao {
  id: string;
  endereco: string;
  bloqueado: boolean;
}

interface SaldoEndereco {
  endereco_id: string;
  quantidade: number;
}

export function PosicoesSaldoSection({
  posicoes,
  saldosEndereco
}: {
  posicoes: Posicao[];
  saldosEndereco: SaldoEndereco[];
}) {
  if (posicoes.length === 0) {
    return (
      <EmptyState>
        Nenhuma posição cadastrada. Cadastre posições em lote antes de registrar entrada.
      </EmptyState>
    );
  }

  const saldoMap = new Map(
    saldosEndereco.map((s) => [s.endereco_id, s.quantidade])
  );

  return (
    <Table headers={["Endereço", "Saldo", "Status"]}>
      {posicoes.map((pos) => (
        <tr key={pos.id} className="text-ink dark:text-ink-2">
          <td className="px-4 py-3">{pos.endereco}</td>
          <td className="px-4 py-3 text-right font-semibold">
            {(saldoMap.get(pos.id) ?? 0).toLocaleString("pt-BR")}
          </td>
          <td className="px-4 py-3">
            {pos.bloqueado && (
              <span className="text-xs bg-error-bg dark:bg-error-bg-dark text-error dark:text-error-light rounded px-2 py-1">
                Bloqueada
              </span>
            )}
            {!pos.bloqueado && (
              <span className="text-xs bg-ok-bg dark:bg-ok-bg-dark text-ok dark:text-ok-light rounded px-2 py-1">
                Ativa
              </span>
            )}
          </td>
        </tr>
      ))}
    </Table>
  );
}
