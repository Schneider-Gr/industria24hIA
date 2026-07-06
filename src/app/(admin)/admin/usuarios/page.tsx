import { PageHeader, EmptyState } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

// Usuários vivem no auth do Supabase (e num futuro `perfis`/`users` público).
// Não há tabela pública de perfis nem acesso ao auth via chave anônima —
// então nada a listar sem service_role (proibido). Empty state honesto.
// TODO: tabela de perfis/users + policy is_admin para admin listar usuários.
export default function UsuariosPage() {
  return (
    <div>
      <PageHeader title="Usuários" subtitle="Gestão de usuários da plataforma" />
      <EmptyState>
        A listagem de usuários depende de uma tabela pública de perfis
        (<code>perfis</code>/<code>users</code>) e da policy is_admin. O auth do
        Supabase não é acessível pela chave anônima, e o projeto proíbe
        service_role no cliente — por isso não há dados aqui ainda.
      </EmptyState>
    </div>
  );
}
