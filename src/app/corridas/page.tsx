import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import { PrecisaLogin } from "@/components/seller/states";
import { VitrineHeader, VitrineFooter } from "@/components/vitrine/ui";
import { StatusBadge, EmptyState } from "@/components/admin/ui";
import { formatBRL } from "@/components/seller/format";

type Corrida = {
  id: string;
  origem_endereco: string;
  destino_endereco: string;
  peso_kg: number;
  status: string;
  modo: string;
  preco_sugerido: number | null;
  preco_final: number | null;
  criado_em: string;
};

export default async function CorridasPage() {
  const user = await getUser();
  if (!user) return <PrecisaLogin />;
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- tabela 0039 fora dos tipos gerados
  const { data } = await (supabase as any)
    .from("corridas")
    .select("id, origem_endereco, destino_endereco, peso_kg, status, modo, preco_sugerido, preco_final, criado_em")
    .eq("solicitante_id", user.id)
    .order("criado_em", { ascending: false });
  const corridas = (data ?? []) as Corrida[];

  return (
    <>
      <VitrineHeader />
      <main className="mx-auto max-w-4xl px-4 py-10">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl font-bold text-ink">Minhas corridas</h1>
          <Link
            href="/corridas/nova"
            className="rounded bg-sinal px-4 py-2 text-sm font-semibold text-white hover:bg-sinal-escuro"
          >
            + Chamar motorista
          </Link>
        </div>

        <div className="mt-6 space-y-3">
          {corridas.length === 0 ? (
            <EmptyState>Você ainda não publicou nenhuma corrida.</EmptyState>
          ) : (
            corridas.map((c) => (
              <Link
                key={c.id}
                href={`/corridas/${c.id}`}
                className="block rounded border border-borda bg-white p-4 hover:border-aco-600"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold">
                    {c.origem_endereco} → {c.destino_endereco}
                  </p>
                  <StatusBadge status={c.status} />
                </div>
                <p className="mt-1 text-sm text-muted">
                  {c.peso_kg} kg · {c.modo === "leilao" ? "leilão de frete" : "primeiro a aceitar"} ·{" "}
                  <span className="num">{formatBRL(c.preco_final ?? c.preco_sugerido ?? 0)}</span>
                </p>
              </Link>
            ))
          )}
        </div>
      </main>
      <VitrineFooter />
    </>
  );
}
