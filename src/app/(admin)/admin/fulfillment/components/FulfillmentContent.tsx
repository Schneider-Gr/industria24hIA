"use client";

import { useState } from "react";
import { Table, EmptyState } from "@/components/admin/ui";
import { LojasPilotoSection } from "./LojasPilotoSection";
import { PosicoesSaldoSection } from "./PosicoesSaldoSection";
import { ReservasAbertasSection } from "./ReservasAbertasSection";
import { DivergenciaSection } from "./DivergenciaSection";
import { RegistrarEntradaSection } from "./RegistrarEntradaSection";
import { CentroInfoSection } from "./CentroInfoSection";

interface Centro {
  id: string;
  nome: string;
  localizacao: string | null;
  cep?: string | number | null;
}

interface LojaPiloto {
  loja_id: string;
  centro_id: string;
  criado_em: string;
  criado_por: string | null;
}

interface Posicao {
  id: string;
  centro_id: string;
  codigo: string | null;
  bloqueado: boolean;
}

interface Reserva {
  id: string;
  pedido_id: string;
  produto_id: string;
  quantidade: number;
  status: string;
}

interface SaldoCentro {
  produto_id: string;
  centro_id: string;
  quantidade: number;
}

interface SaldoEndereco {
  endereco_id: string;
  produto_id: string;
  quantidade: number;
}

export function FulfillmentContent({
  centro,
  lojasPiloto,
  posicoes,
  reservas,
  saldoCentro,
  saldosEndereco
}: {
  centro: Centro;
  lojasPiloto: LojaPiloto[];
  posicoes: Posicao[];
  reservas: Reserva[];
  saldoCentro: SaldoCentro[];
  saldosEndereco: SaldoEndereco[];
}) {
  const [activeTab, setActiveTab] = useState<"overview" | "lojas" | "entrada" | "divergencia">("overview");

  const totalPosicoes = posicoes.length;
  const saldoTotalCentro = saldoCentro.reduce((sum, s) => sum + s.quantidade, 0);
  const saldoTotalEndereco = saldosEndereco.reduce((sum, s) => sum + s.quantidade, 0);
  const divergencia = saldoTotalCentro - saldoTotalEndereco;

  return (
    <div className="space-y-8">
      {/* Centro Info */}
      <CentroInfoSection
        centro={centro}
        totalPosicoes={totalPosicoes}
        saldoTotal={saldoTotalCentro}
      />

      {/* Tabs */}
      <div className="border-b border-separator dark:border-separator-dark">
        <div className="flex gap-4 px-4">
          {([
            { key: "overview", label: "Visão Geral" },
            { key: "lojas", label: "Lojas Admitidas" },
            { key: "entrada", label: "Registrar Entrada" },
            { key: "divergencia", label: "Paridade & Divergência" }
          ] as const).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-3 border-b-2 transition-colors ${
                activeTab === tab.key
                  ? "border-ok text-ink dark:text-ink-2 font-semibold"
                  : "border-transparent text-muted hover:text-ink"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="px-4">
        {activeTab === "overview" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4 text-ink dark:text-ink-2">
                Posições do Centro
              </h3>
              <PosicoesSaldoSection posicoes={posicoes} saldosEndereco={saldosEndereco} />
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4 text-ink dark:text-ink-2">
                Reservas Abertas
              </h3>
              <ReservasAbertasSection reservas={reservas} />
            </div>

            <div className="bg-alert-bg dark:bg-alert-bg-dark rounded p-4 border border-alert dark:border-alert-dark">
              <p className="text-sm text-alert dark:text-alert-light font-semibold">
                ℹ Divergência esperada até a US04 (Separação): {divergencia.toLocaleString("pt-BR")} unidades
              </p>
              <p className="text-xs text-muted mt-2">
                Saldo do centro: {saldoTotalCentro.toLocaleString("pt-BR")} | Soma de posições: {saldoTotalEndereco.toLocaleString("pt-BR")}
              </p>
            </div>
          </div>
        )}

        {activeTab === "lojas" && (
          <LojasPilotoSection centroId={centro.id} lojasPiloto={lojasPiloto} />
        )}

        {activeTab === "entrada" && (
          <RegistrarEntradaSection centroId={centro.id} posicoes={posicoes} />
        )}

        {activeTab === "divergencia" && (
          <DivergenciaSection
            saldoCentro={saldoCentro}
            saldosEndereco={saldosEndereco}
            divergencia={divergencia}
          />
        )}
      </div>
    </div>
  );
}
