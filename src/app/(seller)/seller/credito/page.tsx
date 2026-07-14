import { getUser, getMinhaLoja } from "@/lib/auth";
import { PageTitle, PrecisaLogin, SemLoja, VazioBox } from "@/components/seller/states";

export const dynamic = "force-dynamic";

// Seção "Crédito" do Bubble (/version-test/seller), mapeada em 2026-07-14:
// solicitações de crédito da empresa (aprovadas/pendentes) + lista geral.
//
// ponytail: docs/database.md confirma os NOMES dos Data Types do módulo de
// crédito (solicitacao_de_credito, empresa_solicitacao_credito,
// socio_empresa_solicitacao_credito), mas não os campos, e é dado
// financeiro sensível. Regra do projeto (CLAUDE.md #2) exige parar e
// perguntar em vez de inventar schema, especialmente em regra financeira.
export default async function CreditoPage() {
  const user = await getUser();
  if (!user) return <PrecisaLogin />;

  const loja = await getMinhaLoja();
  if (!loja) return <SemLoja />;

  return (
    <div>
      <PageTitle
        title="Crédito"
        subtitle="Solicitações de crédito da sua empresa."
      />
      <VazioBox>
        Integração pendente: o schema de campos do módulo de crédito
        (solicitacao_de_credito / empresa_solicitacao_credito) ainda não foi
        confirmado em docs/database.md. É dado financeiro sensível — a
        consulta real só entra após validação dos campos com o usuário.
      </VazioBox>
    </div>
  );
}
