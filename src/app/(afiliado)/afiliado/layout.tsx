import { getUser } from "@/lib/auth";
import { PrecisaLogin } from "@/components/seller/states";
import { AfiliadoShell } from "@/components/afiliado/AfiliadoShell";
import { PortaoTermos } from "@/components/termos/PortaoTermos";
import { termosPendentes, TERMOS_AFILIADO } from "@/components/termos/gate";

export default async function AfiliadoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();

  // Opt-in obrigatório: sem aceite, o painel não renderiza.
  const pendentes = await termosPendentes(TERMOS_AFILIADO);
  if (user && pendentes.length > 0) {
    return (
      <PortaoTermos
        documentos={pendentes}
        caminho="/afiliado"
        descricao="Antes de usar o painel do afiliado, confirme que leu e concorda com os termos abaixo."
      />
    );
  }

  return (
    <AfiliadoShell email={user?.email}>
      {!user ? <PrecisaLogin /> : children}
    </AfiliadoShell>
  );
}
