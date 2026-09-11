import Link from "next/link";
import { redirect } from "next/navigation";
import { VitrineHeader, VitrineFooter } from "@/components/vitrine/ui";
import { createClient } from "@/lib/supabase/server";
import { formatBRL } from "@/components/seller/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Meus cupons" };

/**
 * Cupons que o comprador pode usar. A leitura é liberada pela migration 0170
 * e já vem filtrada pela policy (só cupom ativo, dentro da validade e com
 * limite global disponível) — a página não repete o filtro para não divergir
 * da regra do banco. `limite_por_cliente` sai daqui: quem já gastou os usos
 * dele vê o cupom como "já utilizado", que é a informação honesta.
 * A validação de verdade continua no checkout, no servidor.
 */
type CupomRegra = { tipo: "percentual" | "valor_fixo"; valor: number; alvo: string };
type Cupom = {
  id: string;
  codigo: string;
  validade_fim: string;
  valor_minimo_pedido: number | null;
  limite_por_cliente: number;
  cupom_regras: CupomRegra[];
};

export default async function CuponsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/cupons");

  const [{ data: cupons }, { data: usos }] = await Promise.all([
    supabase
      .from("cupons")
      .select("id, codigo, validade_fim, valor_minimo_pedido, limite_por_cliente, cupom_regras ( tipo, valor, alvo )")
      .order("validade_fim", { ascending: true })
      .returns<Cupom[]>(),
    supabase.from("cupom_usos").select("cupom_id").eq("user_id", user.id),
  ]);

  const usosPorCupom = new Map<string, number>();
  for (const u of usos ?? []) {
    usosPorCupom.set(u.cupom_id, (usosPorCupom.get(u.cupom_id) ?? 0) + 1);
  }

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <VitrineHeader />
      <main className="mx-auto w-full max-w-[720px] flex-1 px-4 py-8 pb-24 sm:px-6">
        <h1 className="mb-1 font-display text-2xl font-bold text-ink">Meus cupons</h1>
        <p className="mb-4 text-sm text-muted">
          Use o código no checkout, antes de fechar o pedido.
        </p>

        {!cupons || cupons.length === 0 ? (
          <div className="rounded border border-dashed border-line bg-white p-10 text-center text-sm text-muted">
            Nenhum cupom disponível agora.
            <p className="mt-3">
              <Link href="/" className="text-lm-azul underline underline-offset-2">
                Ver ofertas da vitrine
              </Link>
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {cupons.map((c) => {
              const esgotado = (usosPorCupom.get(c.id) ?? 0) >= c.limite_por_cliente;
              const regra = c.cupom_regras[0];
              const desconto = regra
                ? regra.tipo === "percentual"
                  ? `${Number(regra.valor)}% de desconto`
                  : `${formatBRL(regra.valor)} de desconto`
                : "Desconto no checkout";
              return (
                <li
                  key={c.id}
                  className={`rounded border border-line bg-white p-4 ${esgotado ? "opacity-60" : ""}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="num rounded bg-lm-cinza px-2.5 py-1 text-[13px] font-bold uppercase tracking-[0.08em] text-ink">
                      {c.codigo}
                    </span>
                    <span className="text-[12px] text-muted">
                      Vale até {new Date(c.validade_fim).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                  <p className="mt-2 text-[14px] font-semibold text-ink">{desconto}</p>
                  {c.valor_minimo_pedido != null && (
                    <p className="text-[12.5px] text-muted">
                      Em pedidos a partir de {formatBRL(c.valor_minimo_pedido)}
                    </p>
                  )}
                  {esgotado && (
                    <p className="mt-1 text-[12.5px] font-medium text-muted">Você já utilizou este cupom.</p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </main>
      <VitrineFooter />
    </div>
  );
}
