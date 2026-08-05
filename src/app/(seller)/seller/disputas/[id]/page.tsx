import { notFound } from "next/navigation";
import { getUser, getMinhaLoja } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageTitle, PrecisaLogin, SemLoja } from "@/components/seller/states";
import { StatusBadge } from "@/components/admin/ui";
import { ChatThread } from "@/components/chat/ChatThread";
import { formatData } from "@/components/seller/format";
import { marcarResolvidaPelaLoja } from "../actions";

export const dynamic = "force-dynamic";

// Detalhe da disputa + resposta da loja (PRD 009 US02) — reaproveita
// ChatThread (mesmo componente do chat comprador↔vendedor).
export default async function SellerDisputaDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getUser();
  if (!user) return <PrecisaLogin />;

  const loja = await getMinhaLoja();
  if (!loja) return <SemLoja />;

  const { id } = await params;
  const supabase = await createClient();
  const { data: disputa } = await supabase
    .from("disputas")
    .select("id, motivo, descricao, status, aberta_em, sla_loja_vence_em, conversa_id, loja_id")
    .eq("id", id)
    .maybeSingle();
  if (!disputa || disputa.loja_id !== loja.id) notFound();

  const { data: fotosRaw } = await supabase
    .from("disputa_fotos")
    .select("id, url")
    .eq("disputa_id", id);

  // Bucket privado: `url` guarda o caminho no storage, não a URL pública —
  // gera URL assinada (10 min) sob demanda para exibir.
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

  const resolvida = disputa.status === "resolvida_pela_loja" || disputa.status === "resolvida";

  return (
    <div>
      <PageTitle title="Disputa" subtitle={disputa.motivo} />

      <div className="rounded border border-line bg-white p-4">
        <div className="flex items-center justify-between">
          <StatusBadge status={disputa.status} />
          <span className="text-xs text-muted">
            Aberta em {formatData(disputa.aberta_em)} · Responder até {formatData(disputa.sla_loja_vence_em)}
          </span>
        </div>
        <p className="mt-3 text-sm text-ink">{disputa.descricao}</p>

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
        <ChatThread
          conversaId={disputa.conversa_id}
          userId={user.id}
          mensagensIniciais={mensagens ?? []}
        />
      </div>

      {!resolvida && (
        <form action={marcarResolvidaPelaLoja} className="mt-4">
          <input type="hidden" name="disputa_id" value={disputa.id} />
          <button
            type="submit"
            className="rounded bg-aco-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-aco-800"
          >
            Marcar como resolvida
          </button>
        </form>
      )}
    </div>
  );
}
