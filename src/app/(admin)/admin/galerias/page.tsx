import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { ErrorState } from "@/components/ErrorState";
import { PageHeader, Table, StatusBadge, EmptyState } from "@/components/admin/ui";
import { criarGaleria, excluirGaleria } from "./actions";

export const dynamic = "force-dynamic";

const TIPOS = [
  { value: "lancamento", label: "Lançamento" },
  { value: "mais_baratos", label: "Mais baratos" },
  { value: "desconto_progressivo", label: "Desconto progressivo" },
  { value: "custom", label: "Custom (produtos selecionados)" },
] as const;

const inputCls =
  "rounded border border-line bg-surface px-3 py-1.5 text-sm outline-none focus:border-aco-600";
const btnCls =
  "rounded bg-sinal px-3 py-1.5 text-sm font-semibold text-white hover:bg-sinal-escuro";

export default async function GaleriasPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  if (!isSupabaseConfigured) {
    return (
      <ErrorState
        title="Supabase não configurado"
        detail="Defina as variáveis do Supabase em web/.env.local."
      />
    );
  }

  const { erro } = await searchParams;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vitrine_galerias")
    .select("id, titulo, tipo, ordem, ativo")
    .order("ordem");

  if (error) {
    return <ErrorState title="Falha ao carregar galerias" detail={error.message} />;
  }

  const galerias = data ?? [];
  const tipoLabel = (t: string) => TIPOS.find((x) => x.value === t)?.label ?? t;

  return (
    <div>
      <PageHeader
        title="Galerias da vitrine"
        subtitle="Seções da home (lançamento, mais baratos, desconto progressivo, custom)"
        count={galerias.length}
      />

      {erro && (
        <div className="mb-4 rounded-lg border border-erro/30 bg-erro/10 px-4 py-3 text-sm text-erro">
          {erro}
        </div>
      )}

      <form action={criarGaleria} className="mb-8 flex flex-wrap items-end gap-2">
        <div>
          <label className="block text-xs text-muted">Título</label>
          <input name="titulo" required placeholder="Título da galeria" className={inputCls} />
        </div>
        <div>
          <label className="block text-xs text-muted">Tipo</label>
          <select name="tipo" required className={inputCls}>
            {TIPOS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-muted">Ordem</label>
          <input
            name="ordem"
            type="number"
            defaultValue={0}
            className={`${inputCls} w-20`}
          />
        </div>
        <label className="flex items-center gap-1.5 pb-2 text-sm text-ink">
          <input name="ativo" type="checkbox" defaultChecked />
          Ativo
        </label>
        <button type="submit" className={btnCls}>
          Adicionar galeria
        </button>
      </form>

      {galerias.length === 0 ? (
        <EmptyState>Nenhuma galeria cadastrada ainda.</EmptyState>
      ) : (
        <Table headers={["Título", "Tipo", "Ordem", "Status", "Ações"]}>
          {galerias.map((g) => (
            <tr key={g.id} className="text-ink">
              <td className="px-4 py-3">{g.titulo}</td>
              <td className="px-4 py-3">{tipoLabel(g.tipo)}</td>
              <td className="px-4 py-3 num">{g.ordem}</td>
              <td className="px-4 py-3">
                <StatusBadge status={g.ativo ? "Ativa" : "Inativa"} />
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <Link
                    href={`/admin/galerias/${g.id}`}
                    className="text-xs font-medium text-aco-600 hover:underline"
                  >
                    Editar
                  </Link>
                  <form action={excluirGaleria}>
                    <input type="hidden" name="id" value={g.id} />
                    <button type="submit" className="text-xs font-medium text-erro hover:underline">
                      Excluir
                    </button>
                  </form>
                </div>
              </td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}
