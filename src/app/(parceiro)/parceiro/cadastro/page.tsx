import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import { PageTitle } from "@/components/seller/states";
import { StatusBadge } from "@/components/admin/ui";
import { IconCaminhao, IconCarteira, IconPin, IconUsuario } from "@/components/seller/icons";
import { AreaAtuacao } from "@/components/parceiro/AreaAtuacao";
import { zonaDasLinhas, type LinhaZona } from "@/lib/logistica-parceiro/zonas";
import { salvarCadastroParceiro, alterarChavePixParceiro } from "../actions";

const campo =
  "mt-1 h-12 w-full rounded border border-line bg-surface px-3 text-base text-ink outline-none transition-colors focus:border-lm-azul focus:ring-2 focus:ring-lm-azul/20 sm:h-10 sm:text-sm";
const rotulo = "text-[13px] font-medium text-ink-2";

type Parceiro = {
  tipo: string;
  nome: string;
  telefone: string | null;
  cnh: string | null;
  doc_veiculo: string | null;
  placa: string | null;
  capacidade_kg: number | null;
  capacidade_m3: number | null;
  cep_base: string | null;
  valor_minimo_entrega: number | null;
  status: string;
  chave_pix: string | null;
  tipo_chave_pix: string | null;
  termos_aceitos_em: string | null;
};

function Secao({ icone, titulo, children }: { icone: React.ReactNode; titulo: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 border-t border-line pt-5 first:border-t-0 first:pt-0">
      <h2 className="flex items-center gap-2.5 font-display text-base font-semibold tracking-[-0.015em] text-ink">
        <span className="flex size-8 items-center justify-center rounded-lg bg-lm-azul/10 text-lm-azul">{icone}</span>
        {titulo}
      </h2>
      {children}
    </section>
  );
}

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

  const { data: linhasZona } = await supabase
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- tabela da 0214 fora dos tipos gerados
    .from("entregador_zonas" as any)
    .select("tipo, valor")
    .eq("user_id", user!.id);
  const linhas = (linhasZona ?? []) as unknown as LinhaZona[];
  const cidades = linhas.filter((l) => l.tipo === "cidade").map((l) => l.valor);
  const bairros = zonaDasLinhas(linhas).bairros;

  return (
    <div className="max-w-2xl space-y-5">
      <PageTitle
        title="Cadastro de parceiro logístico"
        subtitle="Motorista ou transportadora. Seu cadastro passa por aprovação do marketplace."
      />

      {p && (
        <p className="text-sm">
          Status do cadastro: <StatusBadge status={p.status} />
          {p.status === "Pendente" && <span className="ml-2 text-muted">aguardando aprovação do admin.</span>}
        </p>
      )}

      <form action={salvarCadastroParceiro} className="space-y-5">
        <Secao icone={<IconUsuario className="size-[18px]" />} titulo="Quem vai entregar">
          <div className="grid grid-cols-2 gap-2">
            {[
              { v: "motorista", t: "Motorista", d: "Veículo próprio ou agregado", i: <IconUsuario className="size-5" /> },
              { v: "transportadora", t: "Transportadora", d: "Empresa com frota", i: <IconCaminhao className="size-5" /> },
            ].map((o) => (
              <label
                key={o.v}
                className="flex cursor-pointer flex-col gap-1 rounded-lg border border-line bg-surface p-3 text-ink-2 transition-colors has-checked:border-lm-azul has-checked:bg-lm-azul/5 has-checked:text-lm-azul has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-lm-azul"
              >
                <input
                  type="radio"
                  name="tipo"
                  value={o.v}
                  defaultChecked={(p?.tipo ?? "motorista") === o.v}
                  className="sr-only"
                />
                {o.i}
                <span className="text-sm font-semibold text-ink">{o.t}</span>
                <span className="text-xs text-muted">{o.d}</span>
              </label>
            ))}
          </div>
          <label className="block">
            <span className={rotulo}>Nome ou razão social</span>
            <input name="nome" required autoComplete="name" defaultValue={p?.nome ?? ""} className={campo} />
          </label>
          <label className="block">
            <span className={rotulo}>Telefone com WhatsApp</span>
            <input
              name="telefone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="(92) 90000-0000"
              defaultValue={p?.telefone ?? ""}
              className={campo}
            />
          </label>
        </Secao>

        <Secao icone={<IconCaminhao className="size-[18px]" />} titulo="Veículo e documentos">
          <div className="grid grid-cols-2 gap-x-3 gap-y-3">
            <label className="block">
              <span className={rotulo}>CNH</span>
              <input name="cnh" inputMode="numeric" defaultValue={p?.cnh ?? ""} className={campo} />
            </label>
            <label className="block">
              <span className={rotulo}>Placa</span>
              <input
                name="placa"
                autoCapitalize="characters"
                placeholder="ABC1D23"
                defaultValue={p?.placa ?? ""}
                className={`${campo} uppercase placeholder:normal-case`}
              />
            </label>
            <label className="col-span-2 block">
              <span className={rotulo}>Documento do veículo (CRLV)</span>
              <input name="doc_veiculo" defaultValue={p?.doc_veiculo ?? ""} className={campo} />
            </label>
            <label className="block">
              <span className={rotulo}>Carga em kg</span>
              <input
                name="capacidade_kg"
                type="number"
                inputMode="decimal"
                step="0.01"
                defaultValue={p?.capacidade_kg ?? ""}
                className={`${campo} num`}
              />
            </label>
            <label className="block">
              <span className={rotulo}>Volume em m³</span>
              <input
                name="capacidade_m3"
                type="number"
                inputMode="decimal"
                step="0.01"
                defaultValue={p?.capacidade_m3 ?? ""}
                className={`${campo} num`}
              />
            </label>
          </div>
        </Secao>

        <Secao icone={<IconPin className="size-[18px]" />} titulo="Onde você roda">
          <AreaAtuacao cepInicial={p?.cep_base ?? ""} cidadesIniciais={cidades} bairrosIniciais={bairros} />
          <label className="block">
            <span className={rotulo}>Valor mínimo por entrega, em R$</span>
            <input
              name="valor_minimo_entrega"
              type="number"
              inputMode="decimal"
              step="0.01"
              defaultValue={p?.valor_minimo_entrega ?? ""}
              className={`${campo} num`}
            />
          </label>
        </Secao>

        <div className="space-y-4 border-t border-line pt-5">
          {p?.termos_aceitos_em ? (
            <p className="text-xs text-muted">
              Termos aceitos em {new Date(p.termos_aceitos_em).toLocaleString("pt-BR")}.{" "}
              <a
                href="/termos/termos-parceiro-logistico"
                target="_blank"
                rel="noopener noreferrer"
                className="text-lm-azul underline underline-offset-2"
              >
                Ler os Termos do Parceiro Logístico
              </a>
            </p>
          ) : (
            <label className="flex min-h-11 items-center gap-3 text-sm text-ink-2">
              <input type="checkbox" name="aceite_termos" required className="size-5 shrink-0 accent-lm-azul" />
              <span>
                Li e aceito os{" "}
                <a
                  href="/termos/termos-parceiro-logistico"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-lm-azul underline underline-offset-2"
                >
                  Termos do Parceiro Logístico
                </a>
              </span>
            </label>
          )}

          <button
            type="submit"
            className="min-h-12 w-full rounded-md bg-lm-azul px-5 text-base font-semibold text-white transition-colors hover:bg-lm-azul-escuro focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lm-azul sm:w-auto sm:text-sm"
          >
            Salvar cadastro
          </button>
        </div>
      </form>

      {p && (
        <Secao icone={<IconCarteira className="size-[18px]" />} titulo="Chave PIX para receber o frete">
          <p className="text-sm text-muted">
            Usada no repasse do frete das rotas que você atender. Trocar a chave reinicia a carência de confirmação.
          </p>
          {p.chave_pix && (
            <p className="text-sm">
              Chave atual: <span className="font-mono">{p.chave_pix}</span> ({p.tipo_chave_pix})
            </p>
          )}
          <form action={alterarChavePixParceiro} className="grid grid-cols-[minmax(0,7.5rem)_minmax(0,1fr)] gap-x-3 gap-y-3">
            <label className="block">
              <span className={rotulo}>Tipo</span>
              <select name="tipo_chave_pix" required className={campo}>
                <option value="CPF">CPF</option>
                <option value="CNPJ">CNPJ</option>
                <option value="EMAIL">E-mail</option>
                <option value="PHONE">Telefone</option>
              </select>
            </label>
            <label className="block">
              <span className={rotulo}>Chave PIX</span>
              <input name="chave_pix" required className={campo} />
            </label>
            <button className="col-span-2 min-h-12 rounded-md border border-lm-azul px-4 text-base font-semibold text-lm-azul transition-colors hover:bg-lm-azul/5 sm:min-h-10 sm:justify-self-start sm:text-sm">
              Salvar chave
            </button>
          </form>
        </Secao>
      )}
    </div>
  );
}
