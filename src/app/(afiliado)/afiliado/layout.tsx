import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getUser, ehAfiliado, ehParceiroLogistico } from "@/lib/auth";
import { registrarAcessoNegado } from "@/lib/auditoria-acesso";
import { ehOnboarding, afiliadoOuParceiro } from "@/lib/gate-rotas";
import { AfiliadoShell } from "@/components/afiliado/AfiliadoShell";
import { PortaoTermos } from "@/components/termos/PortaoTermos";
import { termosPendentes, TERMOS_AFILIADO } from "@/components/termos/gate";

export default async function AfiliadoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Onboarding: /afiliado/solicitar é o funil de captação, linkado de páginas
  // públicas — quem ainda não tem afiliação precisa alcançá-lo. As demais
  // rotas exigem o papel.
  const pathname = (await headers()).get("x-pathname") ?? "";
  // Deslogado num funil de onboarding: volta pra ele após o login, não pra
  // /afiliado (que rebateria em sem_acesso).
  const destinoLogin = ehOnboarding(pathname) ? pathname : "/afiliado";

  const user = await getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(destinoLogin)}`);

  if (!ehOnboarding(pathname)) {
    // /afiliado/logistica é compartilhada com o parceiro logístico (linkada da
    // sidebar dele). As demais rotas de /afiliado exigem ser afiliado.
    const permitido =
      (await ehAfiliado()) ||
      (afiliadoOuParceiro(pathname) && (await ehParceiroLogistico()));
    if (!permitido) {
      await registrarAcessoNegado({ rota: pathname || "/afiliado", papelEsperado: "afiliado" });
      redirect("/login?next=/afiliado&erro=sem_acesso_afiliado");
    }
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
