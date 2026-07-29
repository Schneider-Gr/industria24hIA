// PROTÓTIPO — descartável. Duas variantes da tela de Corridas, trocáveis por
// ?variant=. "Atual" é a tela de hoje (baseline de comparação); "Foco" é a
// proposta: mobile-first, uma corrida por vez, com as métricas derivadas
// (km, ~min, R$/km) na lista de disponíveis.
import Link from "next/link";
import { StatusBadge, EmptyState } from "@/components/admin/ui";
import { PageTitle } from "@/components/seller/states";
import { formatBRL } from "@/components/seller/format";
import {
  aceitarCorrida,
  darLanceCorrida,
  atualizarStatusCorrida,
  atualizarStatusRota,
} from "./actions";
import { GpsCheckin } from "./GpsCheckin";

export type Rota = {
  id: string;
  origem_cep: string | null;
  destino_cep: string | null;
  frete_calculado: number | null;
  status: string;
};

export type Corrida = {
  id: string;
  origem_cep: string | null;
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
  valor_parceiro: number | null;
  distancia_m: number | null;
  duracao_s: number | null;
  link_mapa: string | null;
  status: string;
  parceiro_id: string | null;
};

export type Props = {
  nome: string;
  disponiveis: Corrida[];
  minhas: Corrida[];
  rotas: Rota[];
};

export const PROXIMO_STATUS: Record<string, { valor: string; rotulo: string }> = {
  Aceita: { valor: "Coletada", rotulo: "Confirmar coleta" },
  Coletada: { valor: "EmTransito", rotulo: "Iniciar trânsito" },
  EmTransito: { valor: "Entregue", rotulo: "Confirmar entrega (foto)" },
};

export const PROXIMO_STATUS_ROTA: Record<string, { valor: string; rotulo: string }> = {
  Atribuida: { valor: "EmTransito", rotulo: "Iniciar trânsito" },
  EmTransito: { valor: "Entregue", rotulo: "Confirmar entrega" },
};

// ponytail: proximidade por prefixo numérico do CEP, sem geocoding/API. Nudge
// visual só — não garante nada, aceitarCorrida continua sendo pull-race.
export function distanciaCep(a: string | null, b: string | null): number {
  if (!a || !b) return Infinity;
  const na = parseInt(a.replace(/\D/g, ""), 10);
  const nb = parseInt(b.replace(/\D/g, ""), 10);
  if (Number.isNaN(na) || Number.isNaN(nb)) return Infinity;
  return Math.abs(na - nb);
}

function fmtJanela(ini: string, fim: string) {
  const f = (s: string) =>
    new Date(s).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  return `${f(ini)} → ${f(fim)}`;
}

// ============================================================
// Variante A — a tela de hoje, intacta, só para comparar
// ============================================================

export const nomeA = "Atual (3 seções)";

export function VariantA({ nome, disponiveis, minhas, rotas }: Props) {
  return (
    <div className="space-y-8">
      <PageTitle title="Corridas" subtitle={`Bem-vindo, ${nome}`} />

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
                  {c.peso_kg} kg{c.volume_m3 ? ` · ${c.volume_m3} m³` : ""} · janela{" "}
                  {fmtJanela(c.janela_inicio, c.janela_fim)}
                  {c.descricao_carga ? ` · ${c.descricao_carga}` : ""}
                </p>
                <p className="mt-1 text-sm">
                  {c.modo === "primeiro_aceita" && c.valor_parceiro != null ? (
                    <>
                      Você ganha: <strong className="num">{formatBRL(c.valor_parceiro)}</strong>{" "}
                      <span className="text-muted">
                        (frete {formatBRL(c.preco_final ?? 0)}, comissão da plataforma já descontada)
                      </span>
                    </>
                  ) : (
                    c.preco_sugerido != null && (
                      <>
                        Frete sugerido: <strong className="num">{formatBRL(c.preco_sugerido)}</strong>
                      </>
                    )
                  )}
                  {c.distancia_m != null && (
                    <>
                      {" · "}
                      <span className="num">{(c.distancia_m / 1000).toFixed(1)} km</span>
                      {c.duracao_s != null && (
                        <>
                          {" "}
                          · ~<span className="num">{Math.round(c.duracao_s / 60)} min</span>
                        </>
                      )}
                    </>
                  )}
                </p>
                {c.link_mapa && (
                  <a
                    href={c.link_mapa}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-block text-sm text-sinal-escuro underline"
                  >
                    Ver rota no mapa
                  </a>
                )}
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
                        name="valor"
                        type="number"
                        step="0.01"
                        min="1"
                        required
                        placeholder="Seu lance (R$)"
                        className="w-36 rounded border border-borda px-3 py-1.5 text-sm"
                      />
                      <input
                        name="prazo"
                        placeholder="Prazo (ex.: hoje 18h)"
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
                    {c.peso_kg} kg · janela {fmtJanela(c.janela_inicio, c.janela_fim)} · valor{" "}
                    <span className="num font-semibold">
                      {formatBRL(c.preco_final ?? c.preco_sugerido ?? 0)}
                    </span>
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

// ============================================================
// Variante B — foco: uma corrida por vez + métricas da C
// ============================================================

export const nomeB = "Foco — uma por vez + R$/km";

const TRILHA = ["Aceita", "Coletada", "EmTransito", "Entregue"] as const;
const ROTULO_TRILHA: Record<string, string> = {
  Aceita: "Aceita",
  Coletada: "Coletada",
  EmTransito: "Em trânsito",
  Entregue: "Entregue",
};

function reaisPorKm(c: Corrida): number | null {
  const valor = c.valor_parceiro ?? c.preco_final ?? c.preco_sugerido;
  if (valor == null || c.distancia_m == null || c.distancia_m < 100) return null;
  return valor / (c.distancia_m / 1000);
}

function Trilha({ atual }: { atual: string }) {
  const i = TRILHA.indexOf(atual as (typeof TRILHA)[number]);
  return (
    <ol className="my-5 space-y-0">
      {TRILHA.map((s, idx) => {
        const feito = idx <= i;
        const agora = idx === i;
        return (
          <li key={s} className="flex items-stretch gap-3">
            <div className="flex w-5 flex-col items-center">
              <span
                className={`h-3.5 w-3.5 shrink-0 rounded-full ring-2 ${
                  agora
                    ? "bg-sinal ring-sinal/30"
                    : feito
                      ? "bg-aco-800 ring-transparent"
                      : "bg-white ring-borda"
                }`}
              />
              {idx < TRILHA.length - 1 && (
                <span className={`w-0.5 flex-1 ${idx < i ? "bg-aco-800" : "bg-borda"}`} />
              )}
            </div>
            <span
              className={`pb-5 text-sm leading-none ${
                agora ? "font-bold text-ink" : feito ? "text-ink-2" : "text-muted"
              }`}
            >
              {ROTULO_TRILHA[s]}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function CorridaAtiva({ c }: { c: Corrida }) {
  const prox = PROXIMO_STATUS[c.status];
  return (
    <div className="rounded-xl border border-borda bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted">Agora</span>
        <StatusBadge status={c.status} />
      </div>

      <p className="mt-4 text-xs uppercase tracking-wide text-muted">Coleta</p>
      <p className="text-xl font-bold leading-snug text-ink">{c.origem_endereco}</p>
      <p className="mt-3 text-xs uppercase tracking-wide text-muted">Entrega</p>
      <p className="text-xl font-bold leading-snug text-ink">{c.destino_endereco}</p>

      <p className="mt-3 text-sm text-muted">
        {c.peso_kg} kg · janela {fmtJanela(c.janela_inicio, c.janela_fim)} ·{" "}
        <span className="num font-semibold text-ink">
          {formatBRL(c.valor_parceiro ?? c.preco_final ?? c.preco_sugerido ?? 0)}
        </span>
      </p>

      <Trilha atual={c.status} />

      {prox && (
        <form action={atualizarStatusCorrida} className="space-y-2">
          <input type="hidden" name="corrida_id" value={c.id} />
          <input type="hidden" name="status" value={prox.valor} />
          {prox.valor === "Entregue" && (
            <input
              type="file"
              name="foto"
              accept="image/*"
              capture="environment"
              required
              className="block w-full rounded border border-borda p-2 text-sm"
            />
          )}
          <button className="w-full rounded-lg bg-sinal py-4 text-base font-bold text-white hover:bg-sinal-escuro">
            {prox.rotulo}
          </button>
        </form>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-3">
        {c.link_mapa && (
          <a
            href={c.link_mapa}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded border border-borda px-3 py-1 text-sm hover:bg-aco-100"
          >
            🗺 Abrir rota
          </a>
        )}
        {(c.status === "Coletada" || c.status === "EmTransito") && <GpsCheckin corridaId={c.id} />}
      </div>
    </div>
  );
}

function RotaAtiva({ r }: { r: Rota }) {
  const prox = PROXIMO_STATUS_ROTA[r.status];
  return (
    <div className="rounded-xl border border-borda bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted">
          Agora · rota de pedido
        </span>
        <StatusBadge status={r.status} />
      </div>
      <p className="mt-4 text-xl font-bold leading-snug text-ink">
        {r.origem_cep} → {r.destino_cep}
      </p>
      {r.frete_calculado != null && (
        <p className="mt-1 text-sm text-muted">
          Frete <span className="num font-semibold text-ink">{formatBRL(r.frete_calculado)}</span>
        </p>
      )}
      {prox && (
        <form action={atualizarStatusRota} className="mt-4">
          <input type="hidden" name="rota_id" value={r.id} />
          <input type="hidden" name="status" value={prox.valor} />
          <button className="w-full rounded-lg bg-sinal py-4 text-base font-bold text-white hover:bg-sinal-escuro">
            {prox.rotulo}
          </button>
        </form>
      )}
    </div>
  );
}

export function VariantB({ nome, disponiveis, minhas, rotas }: Props) {
  // Ativo = a corrida mais avançada na trilha; empate resolve pela janela.
  const ordenadas = [...minhas].sort(
    (a, b) =>
      TRILHA.indexOf(b.status as (typeof TRILHA)[number]) -
        TRILHA.indexOf(a.status as (typeof TRILHA)[number]) ||
      a.janela_inicio.localeCompare(b.janela_inicio)
  );
  const ativa = ordenadas[0] ?? null;
  const depois = ordenadas.slice(1);
  const rotaAtiva = !ativa && rotas.length > 0 ? rotas[0] : null;
  const rotasDepois = rotaAtiva ? rotas.slice(1) : rotas;

  return (
    <div className="mx-auto max-w-lg space-y-6 pb-24">
      <div>
        <h1 className="text-2xl font-bold text-ink">Olá, {nome}</h1>
        <p className="text-sm text-muted">
          {minhas.length + rotas.length} em andamento · {disponiveis.length} disponíveis
        </p>
      </div>

      {ativa ? (
        <CorridaAtiva c={ativa} />
      ) : rotaAtiva ? (
        <RotaAtiva r={rotaAtiva} />
      ) : (
        <EmptyState>Nada em andamento. Pegue uma corrida abaixo.</EmptyState>
      )}

      {(depois.length > 0 || rotasDepois.length > 0) && (
        <section>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
            Depois ({depois.length + rotasDepois.length})
          </h2>
          <ul className="divide-y divide-borda rounded-lg border border-borda bg-white">
            {depois.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <span className="min-w-0 truncate text-sm">
                  {c.origem_endereco} → {c.destino_endereco}
                </span>
                <StatusBadge status={c.status} />
              </li>
            ))}
            {rotasDepois.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <span className="min-w-0 truncate text-sm">
                  {r.origem_cep} → {r.destino_cep}
                </span>
                <StatusBadge status={r.status} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
          Disponíveis ({disponiveis.length}) · mais perto do seu CEP primeiro
        </h2>
        {disponiveis.length === 0 ? (
          <EmptyState>Nenhuma corrida publicada agora.</EmptyState>
        ) : (
          <ul className="space-y-3">
            {disponiveis.map((c) => {
              const rpk = reaisPorKm(c);
              const valor = c.valor_parceiro ?? c.preco_final ?? c.preco_sugerido;
              return (
                <li key={c.id} className="rounded-lg border border-borda bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="min-w-0 text-sm font-semibold leading-snug">
                      {c.origem_endereco} → {c.destino_endereco}
                    </p>
                    {c.urgencia === "urgente" && <StatusBadge status="Urgente" />}
                  </div>

                  {/* colunas derivadas da variante C: o que decide aceitar ou não */}
                  <dl className="mt-3 grid grid-cols-4 gap-2 rounded bg-aco-100/60 px-3 py-2 text-center">
                    <div>
                      <dt className="text-[10px] uppercase tracking-wide text-muted">Você ganha</dt>
                      <dd className="num text-sm font-bold text-ink">
                        {valor != null ? formatBRL(valor) : "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[10px] uppercase tracking-wide text-muted">R$/km</dt>
                      <dd className="num text-sm font-bold text-ink">
                        {rpk != null ? rpk.toFixed(2) : "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[10px] uppercase tracking-wide text-muted">Distância</dt>
                      <dd className="num text-sm font-bold text-ink">
                        {c.distancia_m != null ? `${(c.distancia_m / 1000).toFixed(1)} km` : "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[10px] uppercase tracking-wide text-muted">Duração</dt>
                      <dd className="num text-sm font-bold text-ink">
                        {c.duracao_s != null ? `${Math.round(c.duracao_s / 60)} min` : "—"}
                      </dd>
                    </div>
                  </dl>

                  <p className="mt-2 text-xs text-muted">
                    {c.peso_kg} kg{c.volume_m3 ? ` · ${c.volume_m3} m³` : ""} ·{" "}
                    {fmtJanela(c.janela_inicio, c.janela_fim)}
                    {c.descricao_carga ? ` · ${c.descricao_carga}` : ""}
                  </p>

                  <div className="mt-3">
                    {c.modo === "primeiro_aceita" ? (
                      <form action={aceitarCorrida}>
                        <input type="hidden" name="corrida_id" value={c.id} />
                        <button className="w-full rounded-lg bg-sinal py-3 text-sm font-bold text-white hover:bg-sinal-escuro">
                          Aceitar corrida
                        </button>
                      </form>
                    ) : (
                      <form action={darLanceCorrida} className="flex flex-wrap items-center gap-2">
                        <input type="hidden" name="corrida_id" value={c.id} />
                        <input
                          name="valor"
                          type="number"
                          step="0.01"
                          min="1"
                          required
                          placeholder="Seu lance (R$)"
                          className="w-32 rounded border border-borda px-3 py-2 text-sm"
                        />
                        <input
                          name="prazo"
                          placeholder="Prazo"
                          className="w-32 rounded border border-borda px-3 py-2 text-sm"
                        />
                        <button className="flex-1 rounded-lg bg-aco-800 py-2 text-sm font-bold text-white hover:bg-aco-900">
                          Dar lance
                        </button>
                      </form>
                    )}
                  </div>

                  {c.link_mapa && (
                    <a
                      href={c.link_mapa}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-block text-xs text-sinal-escuro underline"
                    >
                      Ver rota no mapa
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <p className="text-center text-xs text-muted">
        <Link href="/parceiro/cadastro" className="underline">
          Meu cadastro
        </Link>
      </p>
    </div>
  );
}
