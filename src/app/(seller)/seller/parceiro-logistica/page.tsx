import { getUser, getMinhaLoja } from "@/lib/auth";
import { PageTitle, PrecisaLogin, SemLoja, VazioBox } from "@/components/seller/states";

export const dynamic = "force-dynamic";

// Seção "Parceiro logística" do Bubble (/version-test/seller), mapeada em
// 2026-07-14: pedidos de parceria com afiliados logísticos + lista de
// parceiros vinculados à loja (colunas observadas: Representante, Produto,
// Porcentagem, Status, Ações).
//
// ponytail: sem tabela Supabase com schema de campos confirmado para essa
// relação — docs/database.md só confirma os NOMES dos Data Types no Bubble
// (Relacao_Afiliado_Loja, Representantes), não os campos. Regra do projeto
// (CLAUDE.md #2) proíbe inventar schema; consultar real só entra quando o
// schema de campos for confirmado com o usuário ou documentado.
export default async function ParceiroLogisticaPage() {
  const user = await getUser();
  if (!user) return <PrecisaLogin />;

  const loja = await getMinhaLoja();
  if (!loja) return <SemLoja />;

  return (
    <div>
      <PageTitle
        title="Parceiro logística"
        subtitle="Pedidos de parceria e parceiros logísticos vinculados à sua loja."
      />
      <VazioBox>
        Integração pendente: o schema de campos de parceria logística
        (Relacao_Afiliado_Loja / Representantes) ainda não foi confirmado em
        docs/database.md. Assim que os campos forem validados, esta tela
        passa a consultar dados reais — sem mock.
      </VazioBox>
    </div>
  );
}
