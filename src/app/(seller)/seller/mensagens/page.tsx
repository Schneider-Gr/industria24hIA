import Link from "next/link";
import { getMinhaLoja } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Caixa de entrada do seller: conversas da loja dele, com contador de não lidas.
export default async function SellerMensagensPage() {
  const loja = await getMinhaLoja();
  if (!loja) {
    return (
      <div className="rounded border border-dashed border-line bg-white p-10 text-center text-sm text-muted">
        Crie sua loja para receber mensagens de compradores.
      </div>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: conversas } = await supabase
    .from("conversas")
    .select("id, updated_at, comprador_nome, produtos(nome)")
    .eq("loja_id", loja.id)
    .order("updated_at", { ascending: false });

  const naoLidas = new Map<string, number>();
  if (user && conversas && conversas.length > 0) {
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
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-ink">Mensagens de compradores</h1>
      {!conversas || conversas.length === 0 ? (
        <div className="rounded border border-dashed border-line bg-white p-10 text-center text-sm text-muted">
          Nenhuma conversa ainda. Quando um comprador usar &quot;Falar com o
          vendedor&quot;, ela aparece aqui.
        </div>
      ) : (
        <ul className="divide-y divide-line rounded border border-line bg-white">
          {conversas.map((c) => {
            const pendente = naoLidas.get(c.id) ?? 0;
            return (
              <li key={c.id}>
                <Link
                  href={`/seller/mensagens/${c.id}`}
                  className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-surface"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-ink">
                      {c.comprador_nome ?? "Comprador"}
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
    </div>
  );
}
