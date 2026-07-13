import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import { PrecisaLogin } from "@/components/seller/states";
import { VitrineHeader, VitrineFooter } from "@/components/vitrine/ui";
import { StatusBadge, EmptyState } from "@/components/admin/ui";
import { publicarLeilao } from "./actions";

const inputCls =
  "mt-1 w-full rounded border border-borda px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-roxo-300";

type Leilao = { id: string; titulo: string; volume: string; janela_fim: string; status: string };
type Categoria = { id: string; nome: string };

export default async function LeilaoPage() {
  const user = await getUser();
  if (!user) return <PrecisaLogin />;
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- tabelas 0039 fora dos tipos gerados
  const db = supabase as any;

  const [{ data: leiloes }, { data: categorias }] = await Promise.all([
    db.from("leiloes_fabricantes").select("id, titulo, volume, janela_fim, status")
      .eq("comprador_id", user.id).order("criado_em", { ascending: false }),
    db.from("categorias").select("id, nome").order("nome"),
  ]);

  return (
    <>
      <VitrineHeader />
      <main className="mx-auto max-w-3xl px-4 py-10 space-y-8">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Leilão reverso</h1>
          <p className="mt-1 text-sm text-muted">
            Publique um pedido de volume e receba lances de vários fabricantes.
            Você escolhe o vencedor — preço, prazo e reputação contam.
          </p>
        </div>

        <form action={publicarLeilao} className="rounded border border-borda bg-white p-4 space-y-4">
          <h2 className="text-lg font-bold">Publicar pedido</h2>
          <label className="block text-sm">
            <span className="text-ink-2">Título *</span>
            <input name="titulo" required className={inputCls} placeholder="Ex.: 500 sacos de cimento CP-II" />
          </label>
          <label className="block text-sm">
            <span className="text-ink-2">Descrição *</span>
            <textarea name="descricao" rows={2} required className={inputCls} />
          </label>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="text-ink-2">Volume *</span>
              <input name="volume" required className={inputCls} placeholder="Ex.: 500 un / 10 ton" />
            </label>
            <label className="block text-sm">
              <span className="text-ink-2">Categoria</span>
              <select name="categoria_id" className={inputCls} defaultValue="">
                <option value="">Todas</option>
                {((categorias ?? []) as Categoria[]).map((c) => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-ink-2">Prazo desejado de entrega</span>
              <input name="prazo_desejado" type="date" className={inputCls} />
            </label>
            <label className="block text-sm">
              <span className="text-ink-2">Fim do leilão *</span>
              <input name="janela_fim" type="datetime-local" required className={inputCls} />
            </label>
          </div>
          <button className="rounded bg-laranja px-5 py-2 text-sm font-semibold text-white hover:bg-laranja-escuro">
            Publicar leilão
          </button>
        </form>

        <section>
          <h2 className="text-lg font-bold mb-3">Meus leilões</h2>
          {((leiloes ?? []) as Leilao[]).length === 0 ? (
            <EmptyState>Você ainda não publicou nenhum leilão.</EmptyState>
          ) : (
            <div className="space-y-2">
              {((leiloes ?? []) as Leilao[]).map((l) => (
                <Link
                  key={l.id}
                  href={`/leilao/${l.id}`}
                  className="flex items-center justify-between rounded border border-borda bg-white p-3 text-sm hover:border-roxo-300"
                >
                  <span>
                    <strong>{l.titulo}</strong> · {l.volume} · encerra{" "}
                    {new Date(l.janela_fim).toLocaleString("pt-BR")}
                  </span>
                  <StatusBadge status={l.status} />
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
      <VitrineFooter />
    </>
  );
}
