import { createClient } from "@/lib/supabase/server";
import { resolverAvisoLoja } from "@/app/(seller)/seller/minha-loja/actions";

// Avisos de curadoria automática (agente LangSmith + regras determinísticas,
// ver src/lib/agentes/curadoria-orquestrador.ts): puramente informativo, não
// bloqueia nenhum save — o seller marca como resolvido depois de ajustar.
export async function AvisosCuradoriaLoja({ lojaId }: { lojaId: string }) {
  const supabase = await createClient();
  const { data: avisos } = await supabase
    .from("loja_avisos_curadoria")
    .select("id, campo, mensagem")
    .eq("loja_id", lojaId)
    .eq("status", "pendente")
    .order("created_at", { ascending: false });

  if (!avisos || avisos.length === 0) return null;

  return (
    <div className="mt-4 rounded border border-aco-600/40 bg-aco-600/5 p-4">
      <p className="mb-2 text-sm font-semibold text-ink">
        {avisos.length === 1 ? "1 pendência no cadastro da loja" : `${avisos.length} pendências no cadastro da loja`}
      </p>
      <ul className="space-y-2">
        {avisos.map((aviso) => (
          <li key={aviso.id} className="flex items-start justify-between gap-3 text-sm">
            <span className="text-ink-2">{aviso.mensagem}</span>
            <form action={resolverAvisoLoja}>
              <input type="hidden" name="id" value={aviso.id} />
              <button type="submit" className="shrink-0 text-xs font-semibold text-aco-600 hover:underline">
                Marcar como resolvido
              </button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
