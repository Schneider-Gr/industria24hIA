import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { ErrorState } from "@/components/ErrorState";
import { PageHeader, EmptyState } from "@/components/admin/ui";
import { formatBRL } from "@/components/seller/format";
import { alternarCupom } from "./actions";
import { NovoCupomForm } from "./NovoCupomForm";

export const dynamic = "force-dynamic";

const ALVO_LABEL: Record<string, string> = {
  produto: "Produto",
  categoria: "Categoria",
  loja: "Loja",
  tudo: "Tudo",
};

export default async function CuponsPage() {
  if (!isSupabaseConfigured) {
    return (
      <ErrorState
        title="Supabase não configurado"
        detail="Defina as variáveis do Supabase em web/.env.local."
      />
    );
  }

  const supabase = await createClient();
  const [{ data: cupons, error: e1 }, { data: regras, error: e2 }, { data: usos, error: e3 }] =
    await Promise.all([
      supabase.from("cupons").select("*").order("criado_em", { ascending: false }),
      supabase.from("cupom_regras").select("*"),
      supabase.from("cupom_usos").select("cupom_id"),
    ]);

  if (e1 || e2 || e3) {
    return <ErrorState title="Falha ao carregar cupons" detail={(e1 ?? e2 ?? e3)?.message} />;
  }

  const regrasPorCupom = new Map<string, typeof regras>();
  for (const r of regras ?? []) {
    const arr = regrasPorCupom.get(r.cupom_id) ?? [];
    arr.push(r);
    regrasPorCupom.set(r.cupom_id, arr as never[]);
  }
  const usosPorCupom = new Map<string, number>();
  for (const u of usos ?? []) {
    usosPorCupom.set(u.cupom_id, (usosPorCupom.get(u.cupom_id) ?? 0) + 1);
  }

  return (
    <div>
      <PageHeader
        title="Cupons de desconto"
        subtitle="Cupom de plataforma — regras por produto/categoria/loja/tudo, custeado pela margem da plataforma no checkout"
        count={(cupons ?? []).length}
      />

      <NovoCupomForm />

      {(cupons ?? []).length === 0 ? (
        <EmptyState>Nenhum cupom cadastrado ainda.</EmptyState>
      ) : (
        <div className="space-y-3">
          {(cupons ?? []).map((c) => (
            <div key={c.id} className="rounded border border-line bg-surface p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-mono text-base font-semibold">{c.codigo}</p>
                  <p className="text-xs text-muted">
                    {new Date(c.validade_inicio).toLocaleString("pt-BR")} até{" "}
                    {new Date(c.validade_fim).toLocaleString("pt-BR")}
                  </p>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span>
                    {c.usos}
                    {c.limite_global ? ` / ${c.limite_global}` : ""} usos
                    {usosPorCupom.get(c.id) ? ` (${usosPorCupom.get(c.id)} pedido(s))` : ""}
                  </span>
                  {c.valor_minimo_pedido != null && <span>mín. {formatBRL(c.valor_minimo_pedido)}</span>}
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-semibold ${
                      c.ativo ? "bg-ok/10 text-ok" : "bg-line/40 text-muted"
                    }`}
                  >
                    {c.ativo ? "ativo" : "desativado"}
                  </span>
                  <form action={alternarCupom}>
                    <input type="hidden" name="id" value={c.id} />
                    <input type="hidden" name="ativo" value={String(c.ativo)} />
                    <button type="submit" className="text-sm font-semibold text-lm-azul hover:underline">
                      {c.ativo ? "Desativar" : "Ativar"}
                    </button>
                  </form>
                </div>
              </div>
              <ul className="mt-2 space-y-0.5 text-sm text-muted">
                {(regrasPorCupom.get(c.id) ?? []).map((r) => (
                  <li key={r.id}>
                    {ALVO_LABEL[r.alvo]}
                    {r.alvo_id ? ` (${r.alvo_id.slice(0, 8)}…)` : ""}:{" "}
                    {r.tipo === "percentual" ? `${r.valor}%` : formatBRL(r.valor) + "/un"}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
