import Link from "next/link";
import { redirect } from "next/navigation";
import { VitrineHeader, VitrineFooter } from "@/components/vitrine/ui";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Avisos" };

/**
 * Central de avisos do comprador. ponytail: sem tabela de notificações — os
 * avisos que importam já existem no banco (pedido que mudou de status,
 * mensagem do vendedor sem resposta). A página os deriva na hora, então
 * nasce correta e não precisa de fan-out nem de job para popular nada.
 * Quando houver evento que NÃO seja derivável daí (promoção, aviso da
 * plataforma), aí sim vale uma tabela.
 */
type Aviso = {
  chave: string;
  titulo: string;
  detalhe: string;
  href: string;
  quando: string | null;
};

export default async function AvisosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/avisos");

  const [{ data: pedidos }, { data: conversas }] = await Promise.all([
    supabase
      .from("pedidos_cliente")
      .select("id, id_venda, data, status_pedido")
      .order("data", { ascending: false })
      .limit(10),
    supabase
      .from("conversas")
      .select("id, updated_at, lojas(nome)")
      .eq("comprador_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(20),
  ]);

  const naoLidasPorConversa = new Map<string, number>();
  if (conversas?.length) {
    const { data: pendentes } = await supabase
      .from("mensagens")
      .select("conversa_id")
      .in("conversa_id", conversas.map((c) => c.id))
      .neq("autor_id", user.id)
      .is("lida_em", null);
    for (const m of pendentes ?? []) {
      naoLidasPorConversa.set(m.conversa_id, (naoLidasPorConversa.get(m.conversa_id) ?? 0) + 1);
    }
  }

  const avisos: Aviso[] = [
    ...(conversas ?? [])
      .filter((c) => (naoLidasPorConversa.get(c.id) ?? 0) > 0)
      .map((c) => {
        const n = naoLidasPorConversa.get(c.id) ?? 0;
        const loja = (c.lojas as { nome: string } | null)?.nome ?? "um vendedor";
        return {
          chave: `conversa-${c.id}`,
          titulo: n === 1 ? "1 mensagem não lida" : `${n} mensagens não lidas`,
          detalhe: `Conversa com ${loja}`,
          href: `/mensagens/${c.id}`,
          quando: c.updated_at,
        };
      }),
    ...(pedidos ?? []).map((p) => ({
      chave: `pedido-${p.id}`,
      titulo: `Pedido ${p.id_venda}`,
      detalhe: p.status_pedido ?? "Em andamento",
      href: `/pedido/${p.id}`,
      quando: p.data,
    })),
  ];

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <VitrineHeader />
      <main className="mx-auto w-full max-w-[720px] flex-1 px-4 py-8 pb-24 sm:px-6">
        <h1 className="mb-1 font-display text-2xl font-bold text-ink">Avisos</h1>
        <p className="mb-4 text-sm text-muted">
          Mensagens sem resposta e o andamento dos seus pedidos, do mais recente para o mais antigo.
        </p>

        {avisos.length === 0 ? (
          <div className="rounded border border-dashed border-line bg-white p-10 text-center text-sm text-muted">
            Nada por aqui. Quando um vendedor responder ou um pedido mudar de status, o aviso
            aparece nesta página.
          </div>
        ) : (
          <ul className="divide-y divide-line rounded border border-line bg-white">
            {avisos.map((a) => (
              <li key={a.chave}>
                <Link href={a.href} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-surface">
                  <span className="min-w-0">
                    <span className="block truncate text-[14px] font-semibold text-ink">{a.titulo}</span>
                    <span className="block truncate text-[13px] text-muted">{a.detalhe}</span>
                  </span>
                  <span className="shrink-0 text-[12px] text-muted">
                    {a.quando ? new Date(a.quando).toLocaleDateString("pt-BR") : "—"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
      <VitrineFooter />
    </div>
  );
}
