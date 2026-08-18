import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { isWhatsappConfigured } from "@/lib/whatsapp";
import { ErrorState } from "@/components/ErrorState";
import { PageHeader, EmptyState, fmtDate } from "@/components/admin/ui";
import {
  setStatusLead,
  atribuirResponsavel,
  registrarInteracao,
  registrarLeadManual,
  registrarOptinWhatsapp,
  enviarFollowupWhatsapp,
} from "./actions";

export const dynamic = "force-dynamic";

const STATUS = ["novo", "em_contato", "convertido", "descartado"] as const;
const STATUS_LABEL: Record<(typeof STATUS)[number], string> = {
  novo: "Novo",
  em_contato: "Em contato",
  convertido: "Convertido",
  descartado: "Descartado",
};
const FONTE_LABEL: Record<string, string> = { bot_site: "Bot (site)", whatsapp: "Bot (WhatsApp)", manual: "Manual" };
const SCORE_STYLE: Record<string, string> = {
  quente: "bg-red-100 text-red-700",
  morno: "bg-amber-100 text-amber-700",
  frio: "bg-sky-100 text-sky-700",
};
const PERSONAS = ["consumidor", "seller", "motorista", "afiliado"] as const;
const PRAZO_ATRASADO_DIAS = 3; // premissa PRD 002 US03 — dias corridos, sem confirmação final do usuário

// Tipos manuais: `leads`/`lead_interacoes` (migrations 0088/0091/0127) ainda
// fora de database.types.ts, mesmo motivo documentado em src/lib/ai/botDb.ts.
type Lead = {
  id: string;
  nome: string | null;
  contato: string;
  interesse: string | null;
  status: string;
  responsavel_id: string | null;
  created_at: string;
  persona: string | null;
  etapa_funil: string | null;
  fonte: string;
  score: string | null;
  resumo_ia: string | null;
  whatsapp_optin_at: string | null;
};
type Interacao = { lead_id: string; autor_id: string; conteudo: string; created_at: string };
type Admin = { user_id: string; email: string };

interface ClientComLeads {
  from(table: "leads"): {
    select(cols: string): {
      order(col: string, opts: { ascending: boolean }): Promise<{ data: Lead[] | null; error: { message: string } | null }>;
    };
  };
}
interface ClientComInteracoes {
  from(table: "lead_interacoes"): {
    select(cols: string): {
      order(col: string, opts: { ascending: boolean }): Promise<{ data: Interacao[] | null; error: { message: string } | null }>;
    };
  };
}
interface ClientComAdmins {
  rpc(fn: "listar_admins"): Promise<{ data: Admin[] | null; error: { message: string } | null }>;
}

function calcularAtrasado(lead: Lead, ultimaInteracao: string | undefined): boolean {
  if (lead.status !== "novo" && lead.status !== "em_contato") return false;
  const referencia = ultimaInteracao ?? lead.created_at;
  const dias = (Date.now() - new Date(referencia).getTime()) / 86_400_000;
  return dias > PRAZO_ATRASADO_DIAS;
}

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ responsavel?: string; atrasado?: string; persona?: string; fonte?: string }>;
}) {
  if (!isSupabaseConfigured) {
    return <ErrorState title="Supabase não configurado" detail="Defina as variáveis do Supabase em web/.env.local." />;
  }

  const { responsavel: filtroResponsavel, atrasado: filtroAtrasado, persona: filtroPersona, fonte: filtroFonte } = await searchParams;

  const supabase = await createClient();
  const [leadsRes, interacoesRes, adminsRes] = await Promise.all([
    (supabase as unknown as ClientComLeads)
      .from("leads")
      .select("id, nome, contato, interesse, status, responsavel_id, created_at, persona, etapa_funil, fonte, score, resumo_ia, whatsapp_optin_at")
      .order("created_at", { ascending: false }),
    (supabase as unknown as ClientComInteracoes)
      .from("lead_interacoes")
      .select("lead_id, autor_id, conteudo, created_at")
      .order("created_at", { ascending: false }),
    (supabase as unknown as ClientComAdmins).rpc("listar_admins"),
  ]);

  if (leadsRes.error) return <ErrorState title="Falha ao carregar leads" detail={leadsRes.error.message} />;

  const admins = adminsRes.data ?? [];
  const interacoesPorLead = new Map<string, Interacao[]>();
  for (const i of interacoesRes.data ?? []) {
    const lista = interacoesPorLead.get(i.lead_id) ?? [];
    lista.push(i);
    interacoesPorLead.set(i.lead_id, lista);
  }

  const leads = leadsRes.data ?? [];
  const comAtraso = leads.map((l) => ({
    lead: l,
    interacoes: interacoesPorLead.get(l.id) ?? [],
    atrasado: calcularAtrasado(l, interacoesPorLead.get(l.id)?.[0]?.created_at),
  }));

  const filtrados = comAtraso.filter(({ lead, atrasado }) => {
    if (filtroResponsavel === "sem_dono" && lead.responsavel_id) return false;
    if (filtroResponsavel && filtroResponsavel !== "sem_dono" && lead.responsavel_id !== filtroResponsavel) return false;
    if (filtroAtrasado === "1" && !atrasado) return false;
    if (filtroPersona && lead.persona !== filtroPersona) return false;
    if (filtroFonte && lead.fonte !== filtroFonte) return false;
    return true;
  });

  const colunas = STATUS.map((status) => ({
    status,
    itens: filtrados.filter(({ lead }) => lead.status === status),
  }));

  return (
    <div>
      <PageHeader title="Leads" subtitle="Pipeline de leads (bot, WhatsApp e registro manual)" count={filtrados.length} />

      <form className="mb-4 flex flex-wrap gap-2 text-sm" method="get">
        <select name="responsavel" defaultValue={filtroResponsavel ?? ""} className="rounded border border-line px-2 py-1">
          <option value="">Todos os responsáveis</option>
          <option value="sem_dono">Sem dono</option>
          {admins.map((a) => (
            <option key={a.user_id} value={a.user_id}>
              {a.email}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-1 rounded border border-line px-2 py-1">
          <input type="checkbox" name="atrasado" value="1" defaultChecked={filtroAtrasado === "1"} />
          Só atrasados
        </label>
        <select name="persona" defaultValue={filtroPersona ?? ""} className="rounded border border-line px-2 py-1">
          <option value="">Todas as personas</option>
          {PERSONAS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <select name="fonte" defaultValue={filtroFonte ?? ""} className="rounded border border-line px-2 py-1">
          <option value="">Todas as fontes</option>
          {Object.entries(FONTE_LABEL).map(([v, label]) => (
            <option key={v} value={v}>
              {label}
            </option>
          ))}
        </select>
        <button type="submit" className="rounded bg-aco-600 px-3 py-1 font-semibold text-white">
          Filtrar
        </button>
      </form>

      <details className="mb-6 rounded border border-line p-3 text-sm">
        <summary className="cursor-pointer font-semibold text-aco-600">Registrar contato manual (Instagram, telefone, presencial)</summary>
        <form action={registrarLeadManual} className="mt-3 flex flex-wrap gap-2">
          <input name="nome" placeholder="Nome" className="rounded border border-line px-2 py-1" />
          <input name="contato" placeholder="Telefone ou e-mail" required className="rounded border border-line px-2 py-1" />
          <input name="interesse" placeholder="Interesse" className="w-56 rounded border border-line px-2 py-1" />
          <button type="submit" className="rounded bg-aco-600 px-3 py-1 font-semibold text-white">
            Registrar
          </button>
        </form>
      </details>

      {filtrados.length === 0 ? (
        <EmptyState>Nenhum lead encontrado com esse filtro.</EmptyState>
      ) : (
        <div className="grid grid-cols-1 gap-4 overflow-x-auto sm:grid-cols-2 lg:grid-cols-4">
          {colunas.map(({ status, itens }) => (
            <div key={status} className="min-w-0 rounded border border-line bg-lm-cinza/40 p-2">
              <h2 className="mb-2 flex items-center justify-between px-1 text-sm font-semibold text-ink">
                {STATUS_LABEL[status]}
                <span className="rounded bg-white px-1.5 py-0.5 text-xs text-ink-2">{itens.length}</span>
              </h2>
              <div className="space-y-2">
                {itens.map(({ lead: l, interacoes, atrasado }) => {
                  const responsavelEmail = admins.find((a) => a.user_id === l.responsavel_id)?.email;
                  return (
                    <div key={l.id} className="rounded border border-line bg-white p-3 text-xs shadow-sm">
                      <div className="mb-1 flex flex-wrap items-center gap-1">
                        <span className="font-semibold text-ink">{l.nome ?? l.contato}</span>
                        {l.score && (
                          <span className={`rounded px-1.5 py-0.5 font-semibold ${SCORE_STYLE[l.score] ?? ""}`}>{l.score}</span>
                        )}
                        {atrasado && <span className="rounded bg-red-100 px-1.5 py-0.5 font-semibold text-red-700">atrasado</span>}
                        {!l.responsavel_id && <span className="rounded bg-amber-100 px-1.5 py-0.5 font-semibold text-amber-700">sem dono</span>}
                      </div>
                      <p className="text-ink-2">{l.contato}</p>
                      <p className="mt-1 text-ink-2">
                        {FONTE_LABEL[l.fonte] ?? l.fonte} · {fmtDate(l.created_at)}
                      </p>
                      {l.resumo_ia && <p className="mt-1 italic text-ink-2">"{l.resumo_ia}"</p>}
                      {l.interesse && <p className="mt-1">{l.interesse}</p>}

                      <form action={setStatusLead} className="mt-2 flex gap-1">
                        <input type="hidden" name="id" value={l.id} />
                        <select name="status" defaultValue={l.status} className="w-full rounded border border-line px-1 py-0.5">
                          {STATUS.map((s) => (
                            <option key={s} value={s}>
                              Mover para: {STATUS_LABEL[s]}
                            </option>
                          ))}
                        </select>
                        <button type="submit" className="font-semibold text-aco-600 hover:underline">
                          Ok
                        </button>
                      </form>

                      <form action={atribuirResponsavel} className="mt-1 flex gap-1">
                        <input type="hidden" name="id" value={l.id} />
                        <select name="responsavel_id" defaultValue={l.responsavel_id ?? ""} className="w-full rounded border border-line px-1 py-0.5">
                          <option value="">Sem dono</option>
                          {admins.map((a) => (
                            <option key={a.user_id} value={a.user_id}>
                              {a.email}
                            </option>
                          ))}
                        </select>
                        <button type="submit" className="font-semibold text-aco-600 hover:underline">
                          Ok
                        </button>
                      </form>
                      {responsavelEmail && <p className="mt-0.5 text-ink-2">Dono: {responsavelEmail}</p>}

                      <details className="mt-2">
                        <summary className="cursor-pointer font-semibold text-aco-600">Histórico ({interacoes.length})</summary>
                        <ul className="mt-1 space-y-1">
                          {interacoes.map((i, idx) => (
                            <li key={idx} className="border-b border-line pb-1">
                              <span className="text-ink-2">{fmtDate(i.created_at)}</span> — {i.conteudo}
                            </li>
                          ))}
                        </ul>
                        <form action={registrarInteracao} className="mt-1 flex gap-1">
                          <input type="hidden" name="lead_id" value={l.id} />
                          <input name="conteudo" placeholder="Registrar nota/ligação..." className="w-full rounded border border-line px-1 py-0.5" />
                          <button type="submit" className="font-semibold text-aco-600 hover:underline">
                            +
                          </button>
                        </form>
                      </details>

                      <details className="mt-2">
                        <summary className="cursor-pointer font-semibold text-aco-600">Follow-up WhatsApp</summary>
                        {!isWhatsappConfigured ? (
                          <p className="mt-1 text-ink-2">Integração de WhatsApp pendente de configuração.</p>
                        ) : !l.whatsapp_optin_at ? (
                          <>
                            <p className="mt-1 text-ink-2">Sem opt-in registrado — obrigatório antes de enviar (política Meta).</p>
                            <form action={registrarOptinWhatsapp} className="mt-1 flex flex-col gap-1">
                              <input type="hidden" name="lead_id" value={l.id} />
                              <input name="texto" placeholder="Texto de opt-in mostrado ao lead" required className="rounded border border-line px-1 py-0.5" />
                              <button type="submit" className="self-start font-semibold text-aco-600 hover:underline">
                                Registrar opt-in
                              </button>
                            </form>
                          </>
                        ) : (
                          <form action={enviarFollowupWhatsapp} className="mt-1 flex flex-col gap-1">
                            <input type="hidden" name="lead_id" value={l.id} />
                            <input name="template" placeholder="Mensagem de follow-up" required className="rounded border border-line px-1 py-0.5" />
                            <button type="submit" className="self-start font-semibold text-aco-600 hover:underline">
                              Enviar
                            </button>
                          </form>
                        )}
                      </details>

                      <p className="mt-2 text-ink-2">
                        Follow-up por e-mail: integração pendente (domínio Resend ainda não validado — ver skill deploy).
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
