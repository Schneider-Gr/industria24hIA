import Link from "next/link";
import { VitrineHeader, VitrineFooter } from "@/components/vitrine/ui";
import { createPublicClient } from "@/lib/supabase/public";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { ErrorState } from "@/components/ErrorState";
import { formatBRL } from "@/components/seller/format";
import { BarraProgresso } from "@/components/vitrine/CompraColetiva";

export const dynamic = "force-dynamic";

// Galeria pública de compras coletivas abertas (PRD compra-coletiva.md /
// MPDD-36): mesma mecânica já usada na PDP (FormCriarColetiva/BarraProgresso),
// aqui reunida numa vitrine própria pra quem quer entrar numa coletiva já em
// andamento sem passar antes por um produto específico.
export default async function ColetivasPage() {
  if (!isSupabaseConfigured) {
    return <ErrorState title="Supabase não configurado" detail="Defina as variáveis do Supabase." />;
  }

  const supabase = createPublicClient();

  const { data: coletivas } = await supabase
    .from("compras_coletivas")
    .select("id, produto_id, loja_id, valor_unitario, preco_base, qtd_atual, meta_qtd, prazo")
    .in("status", ["Aberta", "Viavel"])
    .gt("prazo", new Date().toISOString())
    .order("created_at", { ascending: false });

  const produtoIds = [...new Set((coletivas ?? []).map((c) => c.produto_id))];
  const lojaIds = [...new Set((coletivas ?? []).map((c) => c.loja_id))];

  const [{ data: produtos }, { data: lojas }, { data: imagens }] = await Promise.all([
    produtoIds.length > 0
      ? supabase.from("produtos").select("id, nome").in("id", produtoIds)
      : Promise.resolve({ data: [] as { id: string; nome: string }[] }),
    lojaIds.length > 0
      ? supabase.from("lojas_vitrine").select("id, nome").in("id", lojaIds)
      : Promise.resolve({ data: [] as { id: string; nome: string }[] }),
    produtoIds.length > 0
      ? supabase
          .from("produto_imagens")
          .select("produto_id, url, ordem")
          .in("produto_id", produtoIds)
          .order("ordem", { ascending: true })
      : Promise.resolve({ data: [] as { produto_id: string; url: string; ordem: number }[] }),
  ]);

  const nomeProduto = new Map((produtos ?? []).map((p) => [p.id, p.nome]));
  const nomeLoja = new Map((lojas ?? []).map((l) => [l.id, l.nome]));
  const imgPorProduto = new Map<string, string>();
  for (const img of imagens ?? []) {
    if (!imgPorProduto.has(img.produto_id)) imgPorProduto.set(img.produto_id, img.url);
  }

  return (
    <>
      <VitrineHeader />
      <main className="mx-auto max-w-[1280px] px-4 py-8 sm:px-6">
        <div className="mb-1 flex items-center gap-2">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-lm-azul" aria-hidden>
            <circle cx="8" cy="8" r="3" />
            <circle cx="17" cy="9" r="2.6" />
            <path d="M2.5 20c0-3.6 2.5-6.2 5.5-6.2s5.5 2.6 5.5 6.2" strokeLinecap="round" />
            <path d="M14.2 14.3c2.6.2 4.6 2.6 4.6 5.7" strokeLinecap="round" />
          </svg>
          <h1 className="font-display text-2xl font-bold text-ink">Compras coletivas abertas</h1>
        </div>
        <p className="text-sm text-muted">
          Não atinge a quantidade do desconto sozinho? Junte-se a outros compradores —
          ninguém paga nada antes do fechamento, e quanto mais volume entrar, mais barato
          fica para todos.
        </p>

        {!coletivas || coletivas.length === 0 ? (
          <div className="mt-6 rounded border border-dashed border-line bg-white p-10 text-center text-sm text-muted">
            Nenhuma compra coletiva aberta no momento.{" "}
            <Link href="/" className="text-lm-azul underline underline-offset-2">
              Ver produtos
            </Link>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {coletivas.map((c) => {
              const img = imgPorProduto.get(c.produto_id);
              const desconto = Math.round((1 - c.valor_unitario / c.preco_base) * 100);
              return (
                <Link
                  key={c.id}
                  href={`/coletiva/${c.id}`}
                  className="flex gap-3 rounded-md border border-line bg-white p-3 transition-colors hover:border-lm-azul"
                >
                  {img ? (
                    <img src={img} alt="" className="h-20 w-20 shrink-0 rounded-sm object-cover" />
                  ) : (
                    <div className="h-20 w-20 shrink-0 rounded-sm bg-[#F3F4F6]" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-[13px] font-medium leading-snug text-ink">
                      {nomeProduto.get(c.produto_id) ?? "Produto"}
                    </p>
                    <p className="text-[11px] text-muted">{nomeLoja.get(c.loja_id) ?? "—"}</p>
                    <div className="mt-1 flex items-baseline gap-1.5">
                      <span className="num text-base font-bold text-lm-azul">
                        {formatBRL(c.valor_unitario)}
                      </span>
                      {desconto > 0 && (
                        <span className="rounded-sm bg-verde-24h-tint px-1.5 py-0.5 text-[10px] font-semibold text-verde-24h">
                          -{desconto}%
                        </span>
                      )}
                    </div>
                    <div className="mt-2">
                      <BarraProgresso atual={c.qtd_atual} meta={c.meta_qtd} />
                    </div>
                    <p className="mt-1 text-[11px] text-muted">
                      até <span className="num">{new Date(c.prazo).toLocaleDateString("pt-BR")}</span>
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
      <VitrineFooter />
    </>
  );
}
