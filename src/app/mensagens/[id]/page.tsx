import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { VitrineHeader, VitrineFooter } from "@/components/vitrine/ui";
import { createClient } from "@/lib/supabase/server";
import { ChatThread } from "@/components/chat/ChatThread";

export const dynamic = "force-dynamic";

// Thread compartilhada: serve comprador E seller (RLS decide quem enxerga).
export default async function ConversaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/mensagens/${id}`)}`);

  const { data: conversa } = await supabase
    .from("conversas")
    .select("id, comprador_id, comprador_nome, lojas(id, nome, owner_id), produtos(id, nome)")
    .eq("id", id)
    .maybeSingle();
  if (!conversa) notFound();

  // Seller responde dentro do painel (sidebar + badges), não na vitrine.
  if (conversa.lojas?.owner_id === user.id) redirect(`/seller/mensagens/${id}`);
  const titulo = conversa.lojas?.nome ?? "Loja";

  const { data: mensagens } = await supabase
    .from("mensagens")
    .select("id, autor_id, corpo, created_at")
    .eq("conversa_id", id)
    .order("created_at", { ascending: true })
    .limit(500);

  return (
    <div className="min-h-screen bg-surface">
      <VitrineHeader />
      <main className="mx-auto max-w-[720px] px-4 py-8 sm:px-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-xl font-semibold text-ink">{titulo}</h1>
            <p className="truncate text-xs text-muted">
              {conversa.produtos ? (
                <Link
                  href={`/produto/${conversa.produtos.id}`}
                  className="underline underline-offset-2"
                >
                  {conversa.produtos.nome}
                </Link>
              ) : (
                "Dúvida geral sobre a loja"
              )}
            </p>
          </div>
          <Link
            href="/mensagens"
            className="shrink-0 text-sm text-aco-600 underline underline-offset-2"
          >
            Voltar
          </Link>
        </div>
        <ChatThread
          conversaId={conversa.id}
          userId={user.id}
          mensagensIniciais={mensagens ?? []}
        />
      </main>
      <VitrineFooter />
    </div>
  );
}
