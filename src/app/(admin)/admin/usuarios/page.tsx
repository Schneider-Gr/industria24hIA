import { createClient } from "@/lib/supabase/server";
import { ErrorState } from "@/components/ErrorState";
import { PageHeader, Table, StatusBadge, EmptyState, fmtDate } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

export default async function AdminUsuariosPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_list_users");

  if (error) {
    return (
      <ErrorState
        title="Não foi possível carregar os usuários"
        detail={error.message}
      />
    );
  }

  const usuarios = data ?? [];

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
        <Table headers={["E-mail", "Criado em", "Último login", "Papel", "Loja"]}>
          {usuarios.map((u: {
            id: string;
            email: string;
            criado_em: string;
            ultimo_login: string | null;
            eh_admin: boolean;
            loja_nome: string | null;
          }) => (
            <tr key={u.id}>
              <td>{u.email}</td>
              <td>{fmtDate(u.criado_em)}</td>
              <td>{u.ultimo_login ? fmtDate(u.ultimo_login) : "—"}</td>
              <td>
                <StatusBadge status={u.eh_admin ? "Admin" : "Usuário"} />
              </td>
              <td>{u.loja_nome ?? "—"}</td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}
