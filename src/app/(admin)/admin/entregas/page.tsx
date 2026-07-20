import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { ErrorState } from "@/components/ErrorState";
import { PageHeader, Table, EmptyState, fmtBRL } from "@/components/admin/ui";
import { atualizarEntrega } from "./actions";

export const dynamic = "force-dynamic";

const STATUS = ["Pendente", "Enviado", "Entregue"] as const;
const selCls =
  "rounded border border-line bg-surface px-2 py-1 text-sm outline-none focus:border-aco-600 dark:border-line dark:bg-surface";

export default async function EntregasPage() {
  if (!isSupabaseConfigured) {
    return (
      <ErrorState
        title="Supabase não configurado"
        detail="Defina as variáveis do Supabase em web/.env.local."
      />
    );
  }

  const supabase = await createClient();
  // Itens + estado de fulfillment. A tabela `entregas` é a fonte de verdade;
  // quando não há linha de entrega ainda, deriva-se da flag legada `entregue`.
  const [{ data: itens, error: e1 }, { data: entregas, error: e2 }] = await Promise.all([
    supabase
      .from("linha_itens")
      .select("id, produto_nome, quantidade, valor, entregue, pedido_id")
      .order("id", { ascending: false })
      .limit(300),
    supabase.from("entregas").select("linha_item_id, status, rastreio"),
  ]);

  if (e1 || e2) {
    return <ErrorState title="Falha ao carregar entregas" detail={(e1 ?? e2)?.message} />;
  }

  const porItem = new Map((entregas ?? []).map((e) => [e.linha_item_id, e]));
  const linhas = itens ?? [];

  return (
    <div>
      <PageHeader
        title="Entregas"
        subtitle="Estado de fulfillment por item"
        count={linhas.length}
      />

      {linhas.length === 0 ? (
        <EmptyState>Nenhum item de pedido encontrado.</EmptyState>
      ) : (
        <Table headers={["Item", "Qtd", "Valor", "Pedido", "Status", "Rastreio", ""]}>
          {linhas.map((it) => {
            const e = porItem.get(it.id);
            const statusAtual = e?.status ?? (it.entregue ? "Entregue" : "Pendente");
            return (
              <tr key={it.id} className="text-ink dark:text-ink-2">
                <td className="px-4 py-[9px]">{it.produto_nome ?? "—"}</td>
                <td className="px-4 py-[9px] text-right num">{it.quantidade}</td>
                <td className="px-4 py-[9px] text-right num font-semibold">{fmtBRL(it.valor)}</td>
                <td className="px-4 py-[9px] text-xs text-muted">{it.pedido_id}</td>
                <td colSpan={3} className="px-4 py-[9px]">
                  <form action={atualizarEntrega} className="flex items-center gap-2">
                    <input type="hidden" name="linha_item_id" value={it.id} />
                    <select name="status" defaultValue={statusAtual} className={selCls}>
                      {STATUS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                    <input
                      name="rastreio"
                      defaultValue={e?.rastreio ?? ""}
                      placeholder="Rastreio"
                      className={`${selCls} w-36`}
                    />
                    <button
                      type="submit"
                      className="rounded bg-sinal px-3 py-1 text-sm font-semibold text-white hover:bg-sinal-escuro"
                    >
                      Salvar
                    </button>
                  </form>
                </td>
              </tr>
            );
          })}
        </Table>
      )}
    </div>
  );
}
