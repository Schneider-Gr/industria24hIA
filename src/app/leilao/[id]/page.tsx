import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import { PrecisaLogin } from "@/components/seller/states";
import { VitrineHeader, VitrineFooter } from "@/components/vitrine/ui";
import { StatusBadge, EmptyState } from "@/components/admin/ui";
import { formatBRL } from "@/components/seller/format";
import { adjudicarLeilao } from "../actions";

type Lance = {
  id: string;
  loja_id: string;
  preco: number;
  prazo: string;
  condicoes: string | null;
};

export default async function LeilaoDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getUser();
  if (!user) return <PrecisaLogin />;
  const { id } = await params;
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- tabelas 0039 fora dos tipos gerados
  const db = supabase as any;

  const { data: leilao } = await db.from("leiloes_fabricantes").select("*").eq("id", id).maybeSingle();
  if (!leilao) notFound();

  const { data: lances } = await db
    .from("leilao_lances")
    .select("id, loja_id, preco, prazo, condicoes")
    .eq("leilao_id", id)
    .order("preco", { ascending: true });

  const lojaIds = ((lances ?? []) as Lance[]).map((l) => l.loja_id);
  const { data: lojas } = lojaIds.length
    ? await db.from("lojas_vitrine").select("id, nome").in("id", lojaIds)
    : { data: [] };
  const nomeLoja = new Map<string, string>(
    ((lojas ?? []) as { id: string; nome: string }[]).map((l) => [l.id, l.nome])
  );

  const souComprador = leilao.comprador_id === user.id;
  const aberto = leilao.status === "Aberto" && new Date(leilao.janela_fim) > new Date();

  return (
    <>
      <VitrineHeader />
      <main className="mx-auto max-w-3xl px-4 py-10 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="font-display text-2xl font-bold text-ink">{leilao.titulo}</h1>
          <StatusBadge status={leilao.status} />
        </div>
        <div className="rounded border border-borda bg-white p-4 text-sm space-y-1">
          <p>{leilao.descricao}</p>
          <p><strong>Volume:</strong> {leilao.volume}</p>
          {leilao.prazo_desejado && (
            <p><strong>Prazo desejado:</strong> {new Date(leilao.prazo_desejado + "T12:00:00").toLocaleDateString("pt-BR")}</p>
          )}
          <p>
            <strong>{aberto ? "Encerra" : "Encerrou"}:</strong>{" "}
            {new Date(leilao.janela_fim).toLocaleString("pt-BR")}
          </p>
        </div>

        <section>
          <h2 className="text-lg font-bold mb-2">Lances ({(lances ?? []).length})</h2>
          {(lances ?? []).length === 0 ? (
            <EmptyState>Nenhum lance ainda.</EmptyState>
          ) : (
            <div className="space-y-2">
              {((lances ?? []) as Lance[]).map((l) => (
                <div key={l.id} className="rounded border border-borda bg-white p-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span>
                      <strong>{nomeLoja.get(l.loja_id) ?? "Fabricante"}</strong> ·{" "}
                      <span className="num font-semibold">{formatBRL(l.preco)}</span> · prazo {l.prazo}
                      {leilao.lance_vencedor === l.id && (
                        <span className="ml-2 rounded bg-[#DCFCE7] px-2 py-0.5 text-[11px] font-medium text-[#166534]">
                          vencedor
                        </span>
                      )}
                    </span>
                    {souComprador && aberto && (
                      <form action={adjudicarLeilao}>
                        <input type="hidden" name="leilao_id" value={leilao.id} />
                        <input type="hidden" name="lance_id" value={l.id} />
                        <button className="rounded bg-laranja px-3 py-1 text-sm font-semibold text-white hover:bg-laranja-escuro">
                          Escolher vencedor
                        </button>
                      </form>
                    )}
                  </div>
                  {l.condicoes && <p className="mt-1 text-muted">{l.condicoes}</p>}
                </div>
              ))}
            </div>
          )}
        </section>
        {leilao.status === "Adjudicado" && (
          <p className="text-sm text-muted">
            Leilão adjudicado. Combine a entrega e o pagamento com o fabricante
            vencedor — os contatos aparecem no seu pedido/chat com a loja.
          </p>
        )}
      </main>
      <VitrineFooter />
    </>
  );
}
