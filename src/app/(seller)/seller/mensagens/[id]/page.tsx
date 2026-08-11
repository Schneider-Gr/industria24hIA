import Link from "next/link";
import { notFound } from "next/navigation";
import { getMinhaLoja } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ChatThread } from "@/components/chat/ChatThread";
import { slugify } from "@/lib/slug";

export const dynamic = "force-dynamic";

// Thread dentro do painel do seller (mesma sidebar/badges) — o seller não sai
// do painel para responder. O comprador usa /mensagens/[id], com a vitrine.
export default async function SellerConversaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const loja = await getMinhaLoja();
  if (!loja) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  // Filtro explícito por loja_id: a conversa tem de ser da loja DESTE seller,
  // não basta a RLS (mesma lição do bug getMinhaLoja).
  const { data: conversa } = await supabase
    .from("conversas")
    .select("id, comprador_nome, produtos(id, nome)")
    .eq("id", id)
    .eq("loja_id", loja.id)
    .maybeSingle();
  if (!conversa) notFound();

  const { data: mensagens } = await supabase
    .from("mensagens")
    .select("id, autor_id, corpo, created_at")
    .eq("conversa_id", id)
    .order("created_at", { ascending: true })
    .limit(500);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold text-ink">
            {conversa.comprador_nome ?? "Comprador"}
          </h1>
          <p className="truncate text-xs text-muted">
            {conversa.produtos ? (
              <Link
                href={`/produto/${conversa.produtos.id}/${slugify(conversa.produtos.nome)}`}
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
          href="/seller/mensagens"
          className="shrink-0 text-sm text-aco-600 underline underline-offset-2"
        >
          Voltar
        </Link>
      </div>
      <ChatThread conversaId={conversa.id} userId={user.id} mensagensIniciais={mensagens ?? []} />
    </div>
  );
}
