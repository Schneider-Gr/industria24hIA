import { createClient } from "@/lib/supabase/server";
import { ErrorState } from "@/components/ErrorState";
import { PageHeader, Table, StatusBadge, EmptyState, fmtDate } from "@/components/admin/ui";
import { isAdmin, isSuperAdmin, hasRole } from "@/lib/auth";
import { SeletorRole } from "@/components/admin/SeletorRole";
import { AcoesUsuario } from "@/components/admin/AcoesUsuario";

export const dynamic = "force-dynamic";

export default async function AdminUsuariosPage() {
  const supabase = await createClient();
  const [{ data, error }, souSuperAdmin, souAdmin, souModerador] = await Promise.all([
    supabase.rpc("admin_list_users"),
    isSuperAdmin(),
    isAdmin(),
    hasRole(["super_admin", "moderador"]),
  ]);

  if (error) {
    return (
      <ErrorState
        title="Não foi possível carregar os usuários"
        detail={error.message}
      />
    );
  }

  const usuarios = data ?? [];
  const mostraAcoes = souSuperAdmin || souModerador || souAdmin;

  return (
    <div>
      <PageHeader
        title="Usuários"
        subtitle="Contas cadastradas na plataforma"
        count={usuarios.length}
      />

      {usuarios.length === 0 ? (
        <EmptyState>
          Nenhum usuário visível — confira se sua conta é admin.
        </EmptyState>
      ) : (
        <Table
          headers={[
            "E-mail",
            "Criado em",
            "Último login",
            "Papel",
            "Loja",
            ...(souSuperAdmin ? ["Role"] : []),
            ...(mostraAcoes ? ["Ações"] : []),
          ]}
        >
          {usuarios.map((u: {
            id: string;
            email: string;
            criado_em: string;
            ultimo_login: string | null;
            eh_admin: boolean;
            role: string | null;
            loja_nome: string | null;
            banned_until: string | null;
          }) => {
            const banido = Boolean(u.banned_until && new Date(u.banned_until) > new Date());
            return (
              <tr key={u.id}>
                <td>{u.email}</td>
                <td>{fmtDate(u.criado_em)}</td>
                <td>{u.ultimo_login ? fmtDate(u.ultimo_login) : "—"}</td>
                <td>
                  <StatusBadge status={banido ? "Banido" : u.eh_admin ? (u.role ?? "Admin") : "Usuário"} />
                </td>
                <td>{u.loja_nome ?? "—"}</td>
                {souSuperAdmin && (
                  <td>
                    <SeletorRole userId={u.id} roleAtual={u.role} />
                  </td>
                )}
                {mostraAcoes && (
                  <td>
                    <AcoesUsuario
                      userId={u.id}
                      email={u.email}
                      banido={banido}
                      podeBanir={souSuperAdmin || souModerador}
                    />
                  </td>
                )}
              </tr>
            );
          })}
        </Table>
      )}
    </div>
  );
}
