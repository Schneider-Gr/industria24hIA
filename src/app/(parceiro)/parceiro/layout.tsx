import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getUser, ehParceiroLogistico } from "@/lib/auth";
import { registrarAcessoNegado } from "@/lib/auditoria-acesso";
import { ehOnboarding } from "@/lib/gate-rotas";
import { ParceiroShell } from "@/components/parceiro/ParceiroShell";

export default async function ParceiroLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Onboarding: quem ainda não é parceiro precisa alcançar o formulário de
  // cadastro, que vive sob este route group. As demais rotas exigem o papel.
  const pathname = (await headers()).get("x-pathname") ?? "";
  const destinoLogin = ehOnboarding(pathname) ? pathname : "/parceiro";

  const user = await getUser();
  // Sem sessão: login preservando o destino (o proxy já barra na borda; isto
  // é defesa em profundidade).
  if (!user) redirect(`/login?next=${encodeURIComponent(destinoLogin)}`);

  if (!ehOnboarding(pathname) && !(await ehParceiroLogistico())) {
    await registrarAcessoNegado({ rota: pathname || "/parceiro", papelEsperado: "parceiro" });
    redirect("/login?next=/parceiro&erro=sem_acesso_parceiro");
  }

  return <ParceiroShell email={user.email}>{children}</ParceiroShell>;
}
