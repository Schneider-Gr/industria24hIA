import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { VitrineHeader, VitrineFooter } from "@/components/vitrine/ui";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { ErrorState } from "@/components/ErrorState";
import { motivosDisponiveis, motivoSugeridoValido } from "@/lib/disputas";
import { abrirDisputa } from "../actions";

export const dynamic = "force-dynamic";

// Formulário de abertura de disputa (PRD 009 US01 / PRD 010 US03) — motivo
// categorizado (com opção extra para item perecível), descrição e fotos
// (obrigatória se o item for perecível).
export default async function NovaDisputaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ item?: string; motivo?: string; descricao?: string }>;
}) {
  if (!isSupabaseConfigured) return <ErrorState title="Supabase não configurado" />;

  const { id: pedidoId } = await params;
  const { item: linhaItemId, motivo: motivoSugerido, descricao: descricaoSugerida } = await searchParams;
  const user = await getUser();
  if (!user) redirect(`/login?next=/pedido/${pedidoId}`);
  if (!linhaItemId) notFound();

  const supabase = await createClient();
  const { data: item } = await supabase
    .from("linha_itens_cliente")
    .select("id, pedido_id, produto_nome, perecivel")
    .eq("id", linhaItemId)
    .maybeSingle();
  if (!item || item.pedido_id !== pedidoId) notFound();

  const perecivel = item.perecivel ?? false;
  const motivos = motivosDisponiveis(perecivel);
  const motivoValido = motivoSugeridoValido(perecivel, motivoSugerido);

  return (
    <div className="flex min-h-screen flex-col bg-[#FAFAF9]">
      <VitrineHeader />
      <main className="mx-auto w-full max-w-[600px] flex-1 px-4 py-8">
        <h1 className="font-display text-2xl font-bold text-ink">Trocar ou pedir ajuda</h1>
        <p className="mt-1 text-sm text-muted">
          Item: <strong>{item.produto_nome}</strong>
        </p>

        {motivoValido && (
          <p className="mt-3 rounded border border-line bg-lm-cinza/40 p-3 text-sm text-ink">
            Pré-preenchido a partir da sua conversa com o atendimento — confira e confirme.
          </p>
        )}

        {perecivel && (
          <p className="mt-3 rounded border border-warn bg-warn/10 p-3 text-sm text-ink">
            Este é um produto perecível: a janela para abrir disputa é de 24h após a entrega
            e a foto é obrigatória. Consulte os{" "}
            <a href="/termos/termos-produtos-pereciveis" target="_blank" rel="noopener noreferrer" className="underline">
              Termos de Produtos Perecíveis
            </a>
            .
          </p>
        )}

        <form action={abrirDisputa} encType="multipart/form-data" className="mt-5 space-y-4">
          <input type="hidden" name="pedido_id" value={pedidoId} />
          <input type="hidden" name="linha_item_id" value={item.id ?? ""} />

          <div>
            <label className="block text-sm font-semibold text-ink">Motivo</label>
            <select
              name="motivo"
              required
              defaultValue={motivoValido ?? ""}
              className="mt-1 w-full rounded border border-line px-3 py-2 text-sm"
            >
              <option value="" disabled hidden>
                Selecione
              </option>
              {motivos.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-ink">Descreva o problema</label>
            <textarea
              name="descricao"
              required
              rows={4}
              maxLength={2000}
              defaultValue={descricaoSugerida ?? ""}
              className="mt-1 w-full rounded border border-line px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-ink">
              Fotos {perecivel && <span className="text-erro">(obrigatória)</span>}
            </label>
            <input
              type="file"
              name="fotos"
              accept="image/*"
              multiple
              required={perecivel}
              className="mt-1 w-full text-sm"
            />
            <p className="mt-1 text-xs text-muted">Até 5 fotos.</p>
          </div>

          <button
            type="submit"
            className="w-full rounded bg-lm-azul px-5 py-3 text-sm font-semibold text-white hover:bg-lm-azul-escuro"
          >
            Abrir disputa
          </button>
        </form>

        <p className="mt-4 text-center">
          <Link href={`/pedido/${pedidoId}`} className="text-sm text-lm-azul underline">
            Voltar ao pedido
          </Link>
        </p>
      </main>
      <VitrineFooter />
    </div>
  );
}
