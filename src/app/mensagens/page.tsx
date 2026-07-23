import Link from "next/link";
import { redirect } from "next/navigation";
import { VitrineHeader, VitrineFooter } from "@/components/vitrine/ui";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Caixa de entrada do comprador: conversas ordenadas pela última mensagem.
export default async function MensagensPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/mensagens");

  const { data: conversas } = await supabase
    .from("conversas")
    .select("id, updated_at, lojas(nome), produtos(nome)")
    .eq("comprador_id", user.id)
    .order("updated_at", { ascending: false });

  const naoLidas = new Map<string, number>();
  if (conversas && conversas.length > 0) {
    const { data: pendentes } = await supabase
      .from("mensagens")
      .select("conversa_id")
      .in("conversa_id", conversas.map((c) => c.id))
      .neq("autor_id", user.id)
      .is("lida_em", null);
    for (const m of pendentes ?? []) {
      naoLidas.set(m.conversa_id, (naoLidas.get(m.conversa_id) ?? 0) + 1);
    }
  }

  return (
    <div className="min-h-screen bg-surface">
      <VitrineHeader />
      <main className="mx-auto max-w-[720px] px-4 py-8 sm:px-6">
        <h1 className="mb-4 text-xl font-semibold text-ink">Minhas mensagens</h1>
        {!conversas || conversas.length === 0 ? (
          <div className="rounded border border-dashed border-line bg-white p-10 text-center text-sm text-muted">
            Nenhuma conversa ainda. Use o botão &quot;Falar com o vendedor&quot; na página de
            um produto ou loja.
          </div>
        ) : (
          <ul className="divide-y divide-line rounded border border-line bg-white">
            {conversas.map((c) => {
              const pendente = naoLidas.get(c.id) ?? 0;
              return (
                <li key={c.id}>
                  <Link
                    href={`/mensagens/${c.id}`}
                    className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-surface"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-ink">
                        {c.lojas?.nome ?? "Loja"}
                      </span>
                      <span className="block truncate text-xs text-muted">
                        {c.produtos?.nome ?? "Dúvida geral"} ·{" "}
                        {new Date(c.updated_at).toLocaleDateString("pt-BR")}
                      </span>
                    </span>
                    {pendente > 0 && (
                      <span className="shrink-0 rounded-full bg-aco-600 px-2 py-0.5 text-xs font-semibold text-white">
                        {pendente}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </main>
      <VitrineFooter />
    </div>
  );
}
