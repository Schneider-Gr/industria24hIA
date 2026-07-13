import { getUser, getMinhaLoja } from "@/lib/auth";
import { PageTitle, PrecisaLogin } from "@/components/seller/states";
import { LojaForm } from "@/components/seller/LojaForm";
import { ChavePixForm } from "@/components/seller/ChavePixForm";

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
      <LojaForm loja={loja} />
      {loja && <ChavePixForm loja={loja} />}
    </div>
  );
}
