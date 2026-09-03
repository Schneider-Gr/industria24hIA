import { createClient } from "@/lib/supabase/server";
import { getMinhaLoja } from "@/lib/auth";
import { PageTitle, SemLoja } from "@/components/seller/states";
import { EmptyState } from "@/components/admin/ui";
import { formatBRL } from "@/components/seller/format";
import { alternarCupomLoja } from "./actions";
import { NovoCupomLojaForm } from "./NovoCupomLojaForm";

export const dynamic = "force-dynamic";

// Cupom de loja (0157): custeado pela margem do próprio produto. A RLS
// (cupons_seller_manage / cupom_regras_seller_manage / cupom_usos_seller_read)
// já limita tudo à própria loja — as queries abaixo não precisam de filtro
// extra, mas mantêm o eq(loja_id) como defesa em profundidade.
export default async function SellerCuponsPage() {
  const loja = await getMinhaLoja();
  if (!loja) return <SemLoja />;

  const supabase = await createClient();
  const [{ data: cupons }, { data: regras }, { data: produtos }] = await Promise.all([
    supabase.from("cupons").select("*").eq("loja_id", loja.id).order("criado_em", { ascending: false }),
    supabase.from("cupom_regras").select("*"),
    supabase.from("produtos").select("id, nome").eq("loja_id", loja.id).order("nome"),
  ]);

  const regrasPorCupom = new Map<string, NonNullable<typeof regras>>();
  for (const r of regras ?? []) {
    const arr = regrasPorCupom.get(r.cupom_id) ?? [];
    arr.push(r);
    regrasPorCupom.set(r.cupom_id, arr);
  }
  const nomeProduto = new Map((produtos ?? []).map((p) => [p.id, p.nome]));

  return (
    <div>
      <PageTitle
        title="Cupons da loja"
        subtitle="Desconto por produto ou para a loja inteira, custeado pela sua margem"
      />

      <NovoCupomLojaForm produtos={produtos ?? []} />

      {(cupons ?? []).length === 0 ? (
        <EmptyState>Nenhum cupom criado ainda.</EmptyState>
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
                  </span>
                  {c.valor_minimo_pedido != null && (
                    <span>mín. {formatBRL(c.valor_minimo_pedido)}</span>
                  )}
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-semibold ${
                      c.ativo ? "bg-ok/10 text-ok" : "bg-line/40 text-muted"
                    }`}
                  >
                    {c.ativo ? "ativo" : "desativado"}
                  </span>
                  <form action={alternarCupomLoja}>
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
                    {r.alvo === "loja"
                      ? "Toda a loja"
                      : (nomeProduto.get(r.alvo_id ?? "") ?? "Produto")}
                    : {r.tipo === "percentual" ? `${r.valor}%` : formatBRL(r.valor) + "/un"}
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
