import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import { PageTitle } from "@/components/seller/states";
import { StatusBadge } from "@/components/admin/ui";
import { salvarCadastroParceiro } from "../actions";

const inputCls =
  "mt-1 w-full rounded border border-borda px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-roxo-300";

type Parceiro = {
  tipo: string;
  nome: string;
  telefone: string | null;
  cnh: string | null;
  doc_veiculo: string | null;
  placa: string | null;
  capacidade_kg: number | null;
  capacidade_m3: number | null;
  area_atuacao: string | null;
  cep_base: string | null;
  valor_minimo_entrega: number | null;
  status: string;
};

export default async function CadastroParceiroPage() {
  const user = await getUser();
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- tabela 0039 fora dos tipos gerados
  const { data } = await (supabase as any)
    .from("parceiros_logisticos")
    .select("*")
    .eq("user_id", user!.id)
    .maybeSingle();
  const p = (data ?? null) as Parceiro | null;

  return (
    <div className="max-w-2xl space-y-6">
      <PageTitle
        title="Cadastro de parceiro logístico"
        subtitle="Motorista ou transportadora — seu cadastro passa por aprovação do marketplace"
      />

      {p && (
        <p className="text-sm">
          Status do cadastro: <StatusBadge status={p.status} />
          {p.status === "Pendente" && (
            <span className="ml-2 text-muted">aguardando aprovação do admin.</span>
          )}
        </p>
      )}

      <form action={salvarCadastroParceiro} className="space-y-4">
        <label className="block text-sm">
          <span className="text-ink-2">Tipo *</span>
          <select name="tipo" defaultValue={p?.tipo ?? "motorista"} className={inputCls}>
            <option value="motorista">Motorista (frota própria/agregado)</option>
            <option value="transportadora">Transportadora</option>
          </select>
        </label>
        <label className="block text-sm">
          <span className="text-ink-2">Nome / Razão social *</span>
          <input name="nome" required defaultValue={p?.nome ?? ""} className={inputCls} />
        </label>
        <div className="grid grid-cols-2 gap-4">
          <label className="block text-sm">
            <span className="text-ink-2">Telefone (WhatsApp)</span>
            <input name="telefone" defaultValue={p?.telefone ?? ""} className={inputCls} />
          </label>
          <label className="block text-sm">
            <span className="text-ink-2">CNH</span>
            <input name="cnh" defaultValue={p?.cnh ?? ""} className={inputCls} />
          </label>
          <label className="block text-sm">
            <span className="text-ink-2">Documento do veículo (CRLV)</span>
            <input name="doc_veiculo" defaultValue={p?.doc_veiculo ?? ""} className={inputCls} />
          </label>
          <label className="block text-sm">
            <span className="text-ink-2">Placa</span>
            <input name="placa" defaultValue={p?.placa ?? ""} className={inputCls} />
          </label>
          <label className="block text-sm">
            <span className="text-ink-2">Capacidade (kg)</span>
            <input name="capacidade_kg" type="number" step="0.01" defaultValue={p?.capacidade_kg ?? ""} className={inputCls} />
          </label>
          <label className="block text-sm">
            <span className="text-ink-2">Capacidade (m³)</span>
            <input name="capacidade_m3" type="number" step="0.01" defaultValue={p?.capacidade_m3 ?? ""} className={inputCls} />
          </label>
          <label className="block text-sm">
            <span className="text-ink-2">CEP base</span>
            <input name="cep_base" defaultValue={p?.cep_base ?? ""} className={inputCls} />
          </label>
          <label className="block text-sm">
            <span className="text-ink-2">Valor mínimo por entrega (R$)</span>
            <input name="valor_minimo_entrega" type="number" step="0.01" defaultValue={p?.valor_minimo_entrega ?? ""} className={inputCls} />
          </label>
        </div>
        <label className="block text-sm">
          <span className="text-ink-2">Área de atuação (cidades/CEPs)</span>
          <textarea name="area_atuacao" rows={2} defaultValue={p?.area_atuacao ?? ""} className={inputCls} />
        </label>
        <button
          type="submit"
          className="rounded bg-laranja px-5 py-2 text-sm font-semibold text-white hover:bg-laranja-escuro"
        >
          Salvar cadastro
        </button>
      </form>
    </div>
  );
}
