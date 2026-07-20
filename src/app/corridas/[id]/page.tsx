import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import { PrecisaLogin } from "@/components/seller/states";
import { VitrineHeader, VitrineFooter } from "@/components/vitrine/ui";
import { StatusBadge, EmptyState } from "@/components/admin/ui";
import { formatBRL } from "@/components/seller/format";
import { linkTrajeto } from "@/lib/maps";
import { escolherLanceCorrida, cancelarCorrida, avaliarCorrida } from "../actions";

const ETAPAS = ["Publicada", "Aceita", "Coletada", "EmTransito", "Entregue"];

export default async function CorridaPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getUser();
  if (!user) return <PrecisaLogin />;
  const { id } = await params;
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- tabelas 0039 fora dos tipos gerados
  const db = supabase as any;

  const { data: corrida } = await db.from("corridas").select("*").eq("id", id).maybeSingle();
  if (!corrida) notFound();

  const [{ data: lances }, { data: posicoes }, { data: avaliacao }, { data: parceiro }] =
    await Promise.all([
      db.from("corrida_lances").select("*").eq("corrida_id", id).order("valor", { ascending: true }),
      db.from("corrida_posicoes").select("lat, lng, criado_em").eq("corrida_id", id)
        .order("criado_em", { ascending: false }).limit(1),
      db.from("corrida_avaliacoes").select("nota, comentario").eq("corrida_id", id).maybeSingle(),
      corrida.parceiro_id
        ? db.from("parceiros_publicos").select("nome, tipo, nota_media").eq("id", corrida.parceiro_id).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

  const souSolicitante = corrida.solicitante_id === user.id;
  const ultimaPos = posicoes?.[0] ?? null;
  const etapaAtual = ETAPAS.indexOf(corrida.status);

  return (
    <>
      <VitrineHeader />
      <main className="mx-auto max-w-3xl px-4 py-10 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="font-display text-2xl font-bold text-ink">Corrida</h1>
          <StatusBadge status={corrida.status} />
        </div>

        {/* timeline */}
        {corrida.status !== "Cancelada" && (
          <ol className="flex flex-wrap gap-2 text-xs">
            {ETAPAS.map((e, i) => (
              <li
                key={e}
                className={`rounded-full px-3 py-1 ${
                  i <= etapaAtual ? "bg-aco-800 text-white" : "bg-aco-100 text-aco-600"
                }`}
              >
                {e}
              </li>
            ))}
          </ol>
        )}

        <div className="rounded border border-borda bg-white p-4 text-sm space-y-1">
          <p><strong>Origem:</strong> {corrida.origem_endereco} ({corrida.origem_cep})</p>
          <p><strong>Destino:</strong> {corrida.destino_endereco} ({corrida.destino_cep})</p>
          <p>
            <strong>Carga:</strong> {corrida.peso_kg} kg
            {corrida.volume_m3 ? ` · ${corrida.volume_m3} m³` : ""}
            {corrida.descricao_carga ? ` · ${corrida.descricao_carga}` : ""}
          </p>
          <p>
            <strong>Valor:</strong>{" "}
            <span className="num">{formatBRL(corrida.preco_final ?? corrida.preco_sugerido ?? 0)}</span>
            {corrida.preco_final == null && corrida.preco_sugerido != null && " (sugerido)"}
          </p>
          {parceiro && (
            <p>
              <strong>Parceiro:</strong> {parceiro.nome} ({parceiro.tipo}
              {parceiro.nota_media ? ` · ★ ${parceiro.nota_media}` : ""})
            </p>
          )}
          <p>
            <a
              href={linkTrajeto(
                `${corrida.origem_endereco} ${corrida.origem_cep}`,
                `${corrida.destino_endereco} ${corrida.destino_cep}`
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="text-aco-600 underline"
            >
              Ver trajeto no Google Maps
            </a>
          </p>
          {ultimaPos && (
            <p>
              <strong>Última posição:</strong>{" "}
              <a
                href={`https://www.google.com/maps?q=${ultimaPos.lat},${ultimaPos.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-aco-600 underline"
              >
                {new Date(ultimaPos.criado_em).toLocaleTimeString("pt-BR")} — abrir no mapa
              </a>
            </p>
          )}
          {corrida.foto_entrega_url && (
            <p>
              <strong>Comprovante de entrega:</strong>{" "}
              <a href={corrida.foto_entrega_url} target="_blank" rel="noopener noreferrer" className="text-aco-600 underline">
                ver foto
              </a>
            </p>
          )}
        </div>

        {/* lances (modo leilão, corrida aberta) */}
        {corrida.modo === "leilao" && corrida.status === "Publicada" && (
          <section>
            <h2 className="text-lg font-bold mb-2">Lances recebidos</h2>
            {(lances ?? []).length === 0 ? (
              <EmptyState>Nenhum lance ainda. Motoristas da região verão sua corrida.</EmptyState>
            ) : (
              <div className="space-y-2">
                {(lances ?? []).map((l: { id: string; valor: number; prazo: string | null }) => (
                  <div key={l.id} className="flex items-center justify-between rounded border border-borda bg-white p-3 text-sm">
                    <span>
                      <span className="num font-semibold">{formatBRL(l.valor)}</span>
                      {l.prazo ? ` · ${l.prazo}` : ""}
                    </span>
                    {souSolicitante && (
                      <form action={escolherLanceCorrida}>
                        <input type="hidden" name="lance_id" value={l.id} />
                        <input type="hidden" name="corrida_id" value={corrida.id} />
                        <button className="rounded bg-sinal px-3 py-1 text-sm font-semibold text-white hover:bg-sinal-escuro">
                          Escolher este
                        </button>
                      </form>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ações do solicitante */}
        {souSolicitante && ["Publicada", "Aceita"].includes(corrida.status) && (
          <form action={cancelarCorrida}>
            <input type="hidden" name="corrida_id" value={corrida.id} />
            <button className="rounded border border-borda px-4 py-1.5 text-sm text-ink-2 hover:bg-aco-100">
              Cancelar corrida
            </button>
          </form>
        )}

        {souSolicitante && corrida.status === "Entregue" && !avaliacao && (
          <section className="rounded border border-borda bg-white p-4">
            <h2 className="text-lg font-bold mb-2">Avaliar entrega</h2>
            <form action={avaliarCorrida} className="flex flex-wrap items-center gap-2">
              <input type="hidden" name="corrida_id" value={corrida.id} />
              <select name="nota" className="rounded border border-borda px-3 py-1.5 text-sm">
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>{"★".repeat(n)}</option>
                ))}
              </select>
              <input
                name="comentario" placeholder="Comentário (opcional)"
                className="flex-1 min-w-48 rounded border border-borda px-3 py-1.5 text-sm"
              />
              <button className="rounded bg-sinal px-4 py-1.5 text-sm font-semibold text-white hover:bg-sinal-escuro">
                Enviar avaliação
              </button>
            </form>
          </section>
        )}
        {avaliacao && (
          <p className="text-sm text-muted">
            Sua avaliação: {"★".repeat(avaliacao.nota)}
            {avaliacao.comentario ? ` — ${avaliacao.comentario}` : ""}
          </p>
        )}
      </main>
      <VitrineFooter />
    </>
  );
}
