import { getUser, getMinhaLoja } from "@/lib/auth";
import { PageTitle, PrecisaLogin } from "@/components/seller/states";
import { LojaForm } from "@/components/seller/LojaForm";

export const dynamic = "force-dynamic";

export default async function MinhaLojaPage() {
  const user = await getUser();
  if (!user) return <PrecisaLogin />;

  const loja = await getMinhaLoja();

  return (
    <div>
      <PageTitle
        title="Minha Loja"
        subtitle={
          loja
            ? "Edite os dados cadastrais e o branding da sua loja."
            : "Você ainda não tem loja. Preencha os dados para criar."
        }
      />
      {loja?.situacao === "EmAnalise" && (
        <p className="mb-4 rounded border border-warn bg-warn/10 p-3 text-sm text-warn">
          Sua loja está em análise. Ela só aparece no marketplace depois que um
          admin aprovar o cadastro.
        </p>
      )}
      <LojaForm loja={loja} />
    </div>
  );
}
