import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { ErrorState } from "@/components/ErrorState";
import { PageHeader, StatusBadge, fmtBRL, fmtDate } from "@/components/admin/ui";
import { ChatThread } from "@/components/chat/ChatThread";
import { MediacaoThread } from "@/components/chat/MediacaoThread";
import { getUser } from "@/lib/auth";
import { mediacaoAdminAtrasada } from "@/lib/disputas";
import { decidirDisputa, enviarMensagemMediacao } from "../actions";

export const dynamic = "force-dynamic";

// Tela de arbitragem do admin (PRD 009 US04): histórico completo, fotos,
// mensagens e formulário de decisão com justificativa obrigatória.
export default async function AdminDisputaDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!isSupabaseConfigured) return <ErrorState title="Supabase não configurado" />;

  const { id } = await params;
  const user = await getUser();
  if (!user) return <ErrorState title="Faça login" />;

  const supabase = await createClient();
  const { data: disputa } = await supabase
    .from("disputas")
    .select(
      "id, motivo, descricao, status, aberta_em, escalada_em, conversa_id, linha_item_id, decisao, decisao_valor, decisao_justificativa",
    )
    .eq("id", id)
    .maybeSingle();
  if (!disputa) notFound();

  const { data: fotosRaw } = await supabase.from("disputa_fotos").select("id, url").eq("disputa_id", id);
  // Bucket privado: `url` guarda o caminho no storage — assina sob demanda.
  const fotos = await Promise.all(
    (fotosRaw ?? []).map(async (f) => {
      const { data: assinada } = await supabase.storage.from("disputas").createSignedUrl(f.url, 600);
      return { id: f.id, url: assinada?.signedUrl ?? null };
    }),
  );
  const { data: mensagens } = await supabase
    .from("mensagens")
    .select("id, autor_id, corpo, created_at")
    .eq("conversa_id", disputa.conversa_id)
    .order("created_at", { ascending: true });

  async function assinarFotosMediacao(
    rows: { id: string; autor_id: string; corpo: string; created_at: string; foto_url: string | null }[] | null,
  ) {
    return Promise.all(
      (rows ?? []).map(async (m) => {
        if (!m.foto_url) return { ...m, foto_url: null };
        const { data: assinada } = await supabase.storage.from("disputas").createSignedUrl(m.foto_url, 600);
        return { ...m, foto_url: assinada?.signedUrl ?? null };
      }),
    );
  }

  const { data: mensagensCompradorRaw } = await supabase
    .from("disputa_mensagens_mediacao")
    .select("id, autor_id, corpo, created_at, foto_url")
    .eq("disputa_id", id)
    .eq("destinatario", "comprador")
    .order("created_at", { ascending: true });
  const { data: mensagensLojaRaw } = await supabase
    .from("disputa_mensagens_mediacao")
    .select("id, autor_id, corpo, created_at, foto_url")
    .eq("disputa_id", id)
    .eq("destinatario", "loja")
    .order("created_at", { ascending: true });
  const mensagensComprador = await assinarFotosMediacao(mensagensCompradorRaw);
  const mensagensLoja = await assinarFotosMediacao(mensagensLojaRaw);

  const atrasada =
    disputa.status === "em_mediacao_admin" && disputa.escalada_em
      ? mediacaoAdminAtrasada(new Date(disputa.escalada_em))
      : false;

  let valorItem = 0;
  if (disputa.linha_item_id) {
    const { data: item } = await supabase
      .from("linha_itens")
      .select("valor, produto_nome")
      .eq("id", disputa.linha_item_id)
      .maybeSingle();
    valorItem = item?.valor ?? 0;
  }

  const decidida = disputa.status === "resolvida";

  return (
    <div>
      <PageHeader title="Disputa" subtitle={disputa.motivo} />

      <div className="rounded-lg border border-line bg-surface p-4">
        <div className="flex items-center justify-between">
          <StatusBadge status={disputa.status} />
          <span className="text-xs text-ink-2">
            Aberta em {fmtDate(disputa.aberta_em)} · Escalada em {fmtDate(disputa.escalada_em)}
            {atrasada && (
              <span className="ml-2 rounded bg-warn/20 px-2 py-0.5 text-[10px] font-semibold uppercase text-warn">
                Atrasada (SLA de 24h vencido)
              </span>
            )}
          </span>
        </div>
        <p className="mt-3 text-sm text-ink">{disputa.descricao}</p>
        {valorItem > 0 && (
          <p className="mt-2 text-sm text-ink-2">Valor do item em disputa: {fmtBRL(valorItem)}</p>
        )}

        {fotos.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {fotos.map(
              (f) =>
                f.url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={f.id} src={f.url} alt="Foto da disputa" className="h-24 w-24 rounded object-cover" />
                ),
            )}
          </div>
        )}
      </div>

      <div className="mt-4">
        <h2 className="font-display text-sm font-semibold text-ink">
          Histórico comprador ↔ loja (antes da mediação)
        </h2>
        <ChatThread conversaId={disputa.conversa_id} userId={user.id} mensagensIniciais={mensagens ?? []} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <h2 className="font-display text-sm font-semibold text-ink">Canal privado — comprador</h2>
          <p className="text-xs text-muted">A loja não vê estas mensagens.</p>
          <div className="mt-1">
            <MediacaoThread
              disputaId={disputa.id}
              userId={user.id}
              mensagensIniciais={mensagensComprador ?? []}
              action={enviarMensagemMediacao}
              extraFields={{ destinatario: "comprador" }}
            />
          </div>
        </div>
        <div>
          <h2 className="font-display text-sm font-semibold text-ink">Canal privado — loja</h2>
          <p className="text-xs text-muted">O comprador não vê estas mensagens.</p>
          <div className="mt-1">
            <MediacaoThread
              disputaId={disputa.id}
              userId={user.id}
              mensagensIniciais={mensagensLoja ?? []}
              action={enviarMensagemMediacao}
              extraFields={{ destinatario: "loja" }}
            />
          </div>
        </div>
      </div>

      {decidida ? (
        <div className="mt-4 rounded-lg border border-line bg-surface p-4">
          <p className="text-sm font-semibold text-ink">Decisão: {disputa.decisao}</p>
          {disputa.decisao_valor != null && (
            <p className="mt-1 text-sm text-ink-2">Valor: {fmtBRL(disputa.decisao_valor)}</p>
          )}
          <p className="mt-1 text-sm text-ink-2">{disputa.decisao_justificativa}</p>
          <p className="mt-2 text-xs text-muted">
            Reembolso/troca registrados aqui não disparam pagamento automático — abrem uma
            pendência no fluxo manual de repasse/estorno.
          </p>
        </div>
      ) : (
        <form action={decidirDisputa} className="mt-4 space-y-3 rounded-lg border border-line bg-surface p-4">
          <input type="hidden" name="disputa_id" value={disputa.id} />
          <div>
            <label className="block text-sm font-semibold text-ink">Desfecho</label>
            <select name="decisao" required className="mt-1 w-full rounded border border-line px-3 py-2 text-sm">
              <option value="reembolso_total">Reembolso total</option>
              <option value="reembolso_parcial">Reembolso parcial</option>
              <option value="troca">Troca</option>
              <option value="negada">Negada</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-ink">
              Valor do reembolso parcial (se aplicável)
            </label>
            <input
              name="decisao_valor"
              type="number"
              step="0.01"
              max={valorItem || undefined}
              className="mt-1 w-full rounded border border-line px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-ink">Justificativa</label>
            <textarea
              name="justificativa"
              required
              rows={3}
              className="mt-1 w-full rounded border border-line px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            className="rounded bg-aco-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-aco-700"
          >
            Registrar decisão
          </button>
        </form>
      )}
    </div>
  );
}
