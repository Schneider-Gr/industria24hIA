import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getUser, ehAfiliado } from "@/lib/auth";
import { registrarAcessoNegado } from "@/lib/auditoria-acesso";
import { ehOnboarding } from "@/lib/gate-rotas";
import { AfiliadoShell } from "@/components/afiliado/AfiliadoShell";
import { PortaoTermos } from "@/components/termos/PortaoTermos";
import { termosPendentes, TERMOS_AFILIADO } from "@/components/termos/gate";

export default async function AfiliadoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();
  if (!user) redirect("/login?next=/afiliado");

  // Onboarding: /afiliado/solicitar é o funil de captação, linkado de páginas
  // públicas — quem ainda não tem afiliação precisa alcançá-lo. As demais
  // rotas exigem o papel.
  const pathname = (await headers()).get("x-pathname") ?? "";

  if (!ehOnboarding(pathname) && !(await ehAfiliado())) {
    await registrarAcessoNegado({ rota: pathname || "/afiliado", papelEsperado: "afiliado" });
    redirect("/login?next=/afiliado&erro=sem_acesso_afiliado");
  }

  // Opt-in obrigatório: sem aceite, o painel não renderiza.
  const pendentes = await termosPendentes(TERMOS_AFILIADO);
  if (pendentes.length > 0) {
    return (
      <PortaoTermos
        documentos={pendentes}
        caminho="/afiliado"
        descricao="Antes de usar o painel do afiliado, confirme que leu e concorda com os termos abaixo."
      />
    );
  }

  return <AfiliadoShell email={user.email}>{children}</AfiliadoShell>;
}
