import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { ErrorState } from "@/components/ErrorState";

// Fatia vertical de prova: lê a tabela `acessos` do Supabase de verdade.
// Sem mock. Sem env configurado -> ErrorState. Com RLS deny-by-default e anon,
// a query legítima retorna vazio (empty state) até existir policy — comportamento
// esperado e honesto, não um bug.
export const dynamic = "force-dynamic";

type Acesso = {
  id: string;
  data_horario: string | null;
  geral: string | null;
  pagina: string | null;
  created_at: string;
};

export default async function AcessosPage() {
  if (!isSupabaseConfigured) {
    return (
      <main className="p-8">
        <ErrorState
          title="Supabase não configurado"
          detail="Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY em web/.env.local (ver .env.example). A fundação não usa dados mockados."
        />
      </main>
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("acessos")
    .select("id, data_horario, geral, pagina, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return (
      <main className="p-8">
        <ErrorState title="Falha ao ler acessos" detail={error.message} />
      </main>
    );
  }

  const acessos = (data ?? []) as Acesso[];

  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="font-display text-2xl font-bold text-ink">Acessos</h1>
      <p className="mt-1 text-sm text-ink-2">
        Fatia vertical da fundação — leitura real de <code>public.acessos</code>.
      </p>

      {acessos.length === 0 ? (
        <p className="mt-8 rounded border border-line bg-surface p-6 text-ink-2 dark:border-line dark:bg-surface">
          Nenhum acesso visível. Com RLS deny-by-default e chave anônima, isto é
          esperado até uma policy de leitura ser definida (ver migration 0001).
        </p>
      ) : (
        <ul className="mt-6 divide-y divide-line dark:divide-line">
          {acessos.map((a) => (
            <li key={a.id} className="py-3">
              <span className="font-mono text-sm text-ink">{a.pagina ?? "—"}</span>
              <span className="ml-3 text-sm text-ink-2">
                {a.data_horario ?? a.created_at}
              </span>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
