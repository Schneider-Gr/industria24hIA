import { createClient } from "@/lib/supabase/server";
import { PageTitle } from "@/components/seller/states";
import { Table, StatusBadge, EmptyState } from "@/components/admin/ui";
import { moderarParceiro } from "./actions";

type Parceiro = {
  id: string;
  tipo: string;
  nome: string;
  telefone: string | null;
  placa: string | null;
  capacidade_kg: number | null;
  area_atuacao: string | null;
  status: string;
  nota_media: number | null;
  termos_aceitos_em: string | null;
};

export default async function AdminParceirosPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("parceiros_logisticos")
    .select(
      "id, tipo, nome, telefone, placa, capacidade_kg, area_atuacao, status, nota_media, termos_aceitos_em",
    )
    .order("criado_em", { ascending: false });
  const parceiros = (data ?? []) as Parceiro[];

  return (
    <div className="space-y-6">
      <PageTitle
        title="Parceiros logísticos"
        subtitle="Moderação de motoristas e transportadoras (mobilidade urbana / corridas)"
      />
      {parceiros.length === 0 ? (
        <EmptyState>Nenhum parceiro cadastrado ainda.</EmptyState>
      ) : (
        <Table headers={["Nome", "Tipo", "Telefone", "Placa", "Cap. (kg)", "Área", "Nota", "Termos", "Status", "Moderar"]}>
          {parceiros.map((p) => (
            <tr key={p.id} className="border-b border-borda">
              <td className="py-[9px] px-3 font-medium">{p.nome}</td>
              <td className="py-[9px] px-3">{p.tipo}</td>
              <td className="py-[9px] px-3">{p.telefone ?? "—"}</td>
              <td className="py-[9px] px-3">{p.placa ?? "—"}</td>
              <td className="py-[9px] px-3 num text-right">{p.capacidade_kg ?? "—"}</td>
              <td className="py-[9px] px-3 max-w-40 truncate">{p.area_atuacao ?? "—"}</td>
              <td className="py-[9px] px-3 num">{p.nota_media ?? "—"}</td>
              <td className="py-[9px] px-3 whitespace-nowrap">
                {p.termos_aceitos_em ? (
                  new Date(p.termos_aceitos_em).toLocaleDateString("pt-BR")
                ) : (
                  <span className="text-laranja" title="Cadastro anterior à exigência de aceite">
                    Sem aceite
                  </span>
                )}
              </td>
              <td className="py-[9px] px-3"><StatusBadge status={p.status} /></td>
              <td className="py-[9px] px-3">
                <div className="flex gap-2">
                  {p.status !== "Aprovado" && (
                    <form action={moderarParceiro}>
                      <input type="hidden" name="id" value={p.id} />
                      <input type="hidden" name="status" value="Aprovado" />
                      <button className="rounded bg-sinal px-3 py-1 text-sm font-semibold text-white hover:bg-sinal-escuro">
                        Aprovar
                      </button>
                    </form>
                  )}
                  {p.status === "Aprovado" && (
                    <form action={moderarParceiro}>
                      <input type="hidden" name="id" value={p.id} />
                      <input type="hidden" name="status" value="Suspenso" />
                      <button className="rounded border border-borda px-3 py-1 text-sm text-ink-2 hover:bg-aco-100">
                        Suspender
                      </button>
                    </form>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}
