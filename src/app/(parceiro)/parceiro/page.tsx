import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import { PageTitle, VazioBox } from "@/components/seller/states";
import { StatusBadge, EmptyState } from "@/components/admin/ui";
import { formatBRL } from "@/components/seller/format";
import { aceitarCorrida, darLanceCorrida, atualizarStatusCorrida, atualizarStatusRota } from "./actions";
import { GpsCheckin } from "./GpsCheckin";

type Rota = {
  id: string;
  origem_cep: string | null;
  destino_cep: string | null;
  frete_calculado: number | null;
  status: string;
};

const PROXIMO_STATUS_ROTA: Record<string, { valor: string; rotulo: string }> = {
  Atribuida: { valor: "EmTransito", rotulo: "Iniciar trânsito" },
  EmTransito: { valor: "Entregue", rotulo: "Confirmar entrega" },
};

type Corrida = {
  id: string;
  origem_endereco: string;
  destino_endereco: string;
  peso_kg: number;
  volume_m3: number | null;
  descricao_carga: string | null;
  janela_inicio: string;
  janela_fim: string;
  urgencia: string;
  modo: string;
  preco_sugerido: number | null;
  preco_final: number | null;
  status: string;
  parceiro_id: string | null;
};

const PROXIMO_STATUS: Record<string, { valor: string; rotulo: string }> = {
  Aceita: { valor: "Coletada", rotulo: "Confirmar coleta" },
  Coletada: { valor: "EmTransito", rotulo: "Iniciar trânsito" },
  EmTransito: { valor: "Entregue", rotulo: "Confirmar entrega (foto)" },
};

function fmtJanela(ini: string, fim: string) {
  const f = (s: string) =>
    new Date(s).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  return `${f(ini)} → ${f(fim)}`;
}

export default async function ParceiroPage() {
  const user = await getUser();
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- tabelas 0039 fora dos tipos gerados
  const db = supabase as any;

  const { data: parceiro } = await db
    .from("parceiros_logisticos")
    .select("id, status, nome")
    .eq("user_id", user!.id)
    .maybeSingle();

  if (!parceiro) {
    return (
      <div className="space-y-6">
        <PageTitle title="Corridas" subtitle="Fretes avulsos sob demanda" />
        <VazioBox>
          Você ainda não tem cadastro de parceiro logístico.{" "}
          <Link href="/parceiro/cadastro" className="text-sinal-escuro font-semibold underline">
            Cadastre-se aqui
          </Link>{" "}
          para ver e aceitar corridas.
        </VazioBox>
      </div>
    );
  }

  if (parceiro.status !== "Aprovado") {
    return (
      <div className="space-y-6">
        <PageTitle title="Corridas" subtitle="Fretes avulsos sob demanda" />
        <VazioBox>
          Seu cadastro está <strong>{parceiro.status}</strong>. Assim que o
          marketplace aprovar, as corridas disponíveis aparecerão aqui.
        </VazioBox>
      </div>
    );
  }

  const { data: corridas } = await db
    .from("corridas")
    .select("*")
    .in("status", ["Publicada", "Aceita", "Coletada", "EmTransito"])
    .order("janela_inicio", { ascending: true });

  const lista = (corridas ?? []) as Corrida[];
  const disponiveis = lista.filter((c) => c.status === "Publicada");
  const minhas = lista.filter((c) => c.parceiro_id === parceiro.id);

  const { data: rotasData } = await db
    .from("rotas")
    .select("id, origem_cep, destino_cep, frete_calculado, status")
    .eq("parceiro_id", parceiro.id)
    .in("status", ["Atribuida", "EmTransito"])
    .order("criado_em", { ascending: true });
  const rotas = (rotasData ?? []) as Rota[];

  return (
    <div className="space-y-8">
      <PageTitle title="Corridas" subtitle={`Bem-vindo, ${parceiro.nome}`} />

      <section>
        <h2 className="text-lg font-bold mb-3">Disponíveis ({disponiveis.length})</h2>
        {disponiveis.length === 0 ? (
          <EmptyState>Nenhuma corrida publicada agora.</EmptyState>
        ) : (
          <div className="space-y-3">
            {disponiveis.map((c) => (
              <div key={c.id} className="rounded border border-borda bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold">
                    {c.origem_endereco} → {c.destino_endereco}
                  </p>
                  <StatusBadge status={c.urgencia === "urgente" ? "Urgente" : "Normal"} />
                </div>
                <p className="mt-1 text-sm text-muted">
                  {c.peso_kg} kg{c.volume_m3 ? ` · ${c.volume_m3} m³` : ""} ·{" "}
                  janela {fmtJanela(c.janela_inicio, c.janela_fim)}
                  {c.descricao_carga ? ` · ${c.descricao_carga}` : ""}
                </p>
                <p className="mt-1 text-sm">
                  {c.preco_sugerido != null && (
                    <>Frete sugerido: <strong className="num">{formatBRL(c.preco_sugerido)}</strong></>
                  )}
                </p>
                <div className="mt-3">
                  {c.modo === "primeiro_aceita" ? (
                    <form action={aceitarCorrida}>
                      <input type="hidden" name="corrida_id" value={c.id} />
                      <button className="rounded bg-sinal px-4 py-1.5 text-sm font-semibold text-white hover:bg-sinal-escuro">
                        Aceitar corrida
                      </button>
                    </form>
                  ) : (
                    <form action={darLanceCorrida} className="flex flex-wrap items-center gap-2">
                      <input type="hidden" name="corrida_id" value={c.id} />
                      <input
                        name="valor" type="number" step="0.01" min="1" required
                        placeholder="Seu lance (R$)"
                        className="w-36 rounded border border-borda px-3 py-1.5 text-sm"
                      />
                      <input
                        name="prazo" placeholder="Prazo (ex.: hoje 18h)"
                        className="w-44 rounded border border-borda px-3 py-1.5 text-sm"
                      />
                      <button className="rounded bg-aco-800 px-4 py-1.5 text-sm font-semibold text-white hover:bg-aco-900">
                        Dar lance
                      </button>
                    </form>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-lg font-bold mb-3">Minhas corridas ({minhas.length})</h2>
        {minhas.length === 0 ? (
          <EmptyState>Você ainda não tem corridas em andamento.</EmptyState>
        ) : (
          <div className="space-y-3">
            {minhas.map((c) => {
              const prox = PROXIMO_STATUS[c.status];
              return (
                <div key={c.id} className="rounded border border-borda bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold">
                      {c.origem_endereco} → {c.destino_endereco}
                    </p>
                    <StatusBadge status={c.status} />
                  </div>
                  <p className="mt-1 text-sm text-muted">
                    {c.peso_kg} kg · janela {fmtJanela(c.janela_inicio, c.janela_fim)} ·{" "}
                    valor <span className="num font-semibold">{formatBRL(c.preco_final ?? c.preco_sugerido ?? 0)}</span>
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    {prox && (
                      <form action={atualizarStatusCorrida} className="flex items-center gap-2">
                        <input type="hidden" name="corrida_id" value={c.id} />
                        <input type="hidden" name="status" value={prox.valor} />
                        {prox.valor === "Entregue" && (
                          <input type="file" name="foto" accept="image/*" required className="text-xs" />
                        )}
                        <button className="rounded bg-sinal px-4 py-1.5 text-sm font-semibold text-white hover:bg-sinal-escuro">
                          {prox.rotulo}
                        </button>
                      </form>
                    )}
                    {(c.status === "Coletada" || c.status === "EmTransito") && (
                      <GpsCheckin corridaId={c.id} />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-lg font-bold mb-3">Rotas atribuídas a mim ({rotas.length})</h2>
        {rotas.length === 0 ? (
          <EmptyState>Nenhuma rota de pedido atribuída a você no momento.</EmptyState>
        ) : (
          <div className="space-y-3">
            {rotas.map((r) => {
              const prox = PROXIMO_STATUS_ROTA[r.status];
              return (
                <div key={r.id} className="rounded border border-borda bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold">
                      {r.origem_cep} → {r.destino_cep}
                    </p>
                    <StatusBadge status={r.status} />
                  </div>
                  {r.frete_calculado != null && (
                    <p className="mt-1 text-sm text-muted">
                      Frete: <span className="num font-semibold">{formatBRL(r.frete_calculado)}</span>
                    </p>
                  )}
                  {prox && (
                    <form action={atualizarStatusRota} className="mt-3">
                      <input type="hidden" name="rota_id" value={r.id} />
                      <input type="hidden" name="status" value={prox.valor} />
                      <button className="rounded bg-sinal px-4 py-1.5 text-sm font-semibold text-white hover:bg-sinal-escuro">
                        {prox.rotulo}
                      </button>
                    </form>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
