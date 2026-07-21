import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import { PageTitle } from "@/components/seller/states";
import { StatusBadge } from "@/components/admin/ui";
import { salvarCadastroParceiro, alterarChavePixParceiro } from "../actions";

const inputCls =
  "mt-1 w-full rounded border border-borda px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-aco-600";

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
  chave_pix: string | null;
  tipo_chave_pix: string | null;
  termos_aceitos_em: string | null;
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
        {p?.termos_aceitos_em ? (
          <p className="text-xs text-muted">
            Termos aceitos em{" "}
            {new Date(p.termos_aceitos_em).toLocaleString("pt-BR")} —{" "}
            <a
              href="/termos/termos-parceiro-logistico"
              target="_blank"
              rel="noopener noreferrer"
              className="text-laranja underline"
            >
              ler os Termos do Parceiro Logístico
            </a>
          </p>
        ) : (
          <label className="flex items-start gap-2 text-sm text-ink-2">
            <input type="checkbox" name="aceite_termos" required className="mt-0.5 h-3.5 w-3.5" />
            <span>
              Li e aceito os{" "}
              <a
                href="/termos/termos-parceiro-logistico"
                target="_blank"
                rel="noopener noreferrer"
                className="text-laranja underline"
              >
                Termos do Parceiro Logístico
              </a>
            </span>
          </label>
        )}

        <button
          type="submit"
          className="rounded bg-sinal px-5 py-2 text-sm font-semibold text-white hover:bg-sinal-escuro"
        >
          Salvar cadastro
        </button>
      </form>

      {p && (
        <div className="border-t border-borda pt-6">
          <h2 className="text-lg font-bold text-ink">Chave PIX para recebimento de frete</h2>
          <p className="mt-1 text-sm text-muted">
            Usada para o repasse do frete das rotas que você atender. Trocar a chave reinicia a
            carência de confirmação.
          </p>
          {p.chave_pix && (
            <p className="mt-2 text-sm">
              Chave atual: <span className="font-mono">{p.chave_pix}</span> ({p.tipo_chave_pix})
            </p>
          )}
          <form action={alterarChavePixParceiro} className="mt-3 flex flex-wrap items-end gap-2">
            <label className="block text-sm">
              <span className="text-ink-2">Tipo</span>
              <select name="tipo_chave_pix" required className={inputCls}>
                <option value="CPF">CPF</option>
                <option value="CNPJ">CNPJ</option>
                <option value="EMAIL">E-mail</option>
                <option value="PHONE">Telefone</option>
              </select>
            </label>
            <label className="block text-sm flex-1 min-w-48">
              <span className="text-ink-2">Chave PIX</span>
              <input name="chave_pix" required className={inputCls} />
            </label>
            <button className="rounded bg-aco-800 px-4 py-2 text-sm font-semibold text-white hover:bg-aco-900">
              Salvar chave
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
