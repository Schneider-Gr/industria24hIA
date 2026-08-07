import { LogoIndustria24h } from "@/components/vitrine/ui";
import { FormEntregador } from "@/components/entregador/FormEntregador";

export const dynamic = "force-dynamic";

// Confirmação de entrega pública (migration 0112) — para transportador
// terceiro sem conta na plataforma (frete avulso). Sem login: o número do
// pedido + código do comprador são o único credencial. Página deliberadamente
// mínima e mobile-first — pensada para ser aberta no celular na porta do
// cliente, não como painel de gestão (isso continua em /parceiro e
// /afiliado/logistica, para quem tem conta).
export default function EntregadorPage() {
  return (
    <div className="flex min-h-screen flex-col items-center bg-[#FAFAF9] px-4 py-10">
      <LogoIndustria24h className="h-8" />
      <div className="mt-8 w-full max-w-sm">
        <h1 className="mb-1 text-center font-display text-xl font-bold text-ink">
          Confirmar entrega
        </h1>
        <p className="mb-6 text-center text-sm text-muted">
          Informe o número do pedido e o código que o comprador te passou.
        </p>
        <FormEntregador />
      </div>
    </div>
  );
}
