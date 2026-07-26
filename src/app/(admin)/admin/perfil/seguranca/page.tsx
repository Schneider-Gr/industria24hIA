import { PageHeader } from "@/components/admin/ui";
import { listarFatoresTotp } from "./actions";
import { PainelTotp } from "@/components/admin/PainelTotp";

export const dynamic = "force-dynamic";

// 2FA opcional (Fase 7): ativar não é obrigatório pra usar o painel — evita
// travar alguém fora do admin se o enroll falhar. Enforcement obrigatório
// fica pra decisão futura separada.
export default async function SegurancaPage() {
  const fatores = await listarFatoresTotp();
  const fatorVerificado = fatores.find((f) => f.status === "verified") ?? null;

  return (
    <div className="max-w-lg">
      <PageHeader title="Segurança" subtitle="Autenticação em duas etapas (opcional)" />
      <PainelTotp
        fatorAtivo={fatorVerificado ? { id: fatorVerificado.id } : null}
      />
    </div>
  );
}
