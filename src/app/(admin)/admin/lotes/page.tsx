import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { ErrorState } from "@/components/ErrorState";
import { PageHeader, Table, EmptyState, fmtBRL } from "@/components/admin/ui";
import { criarLote, cancelarLote } from "./actions";
import { sugerirLotes, textoChegada, type EntregadorDaLoja } from "@/lib/logistica-parceiro/rota-lote";
import type { LinhaZona } from "@/lib/logistica-parceiro/zonas";

export const dynamic = "force-dynamic";

type PedidoPendente = {
  id: string;
  id_venda: string;
  loja_id: string;
  loja_nome: string;
  cep: string;
  bairro: string | null;
  criado_em: string;
  cidade: string;
  frete: number;
};

export default async function LotesPage() {
  if (!isSupabaseConfigured) {
    return (
      <ErrorState
        title="Supabase não configurado"
        detail="Defina as variáveis do Supabase em web/.env.local."
      />
    );
  }

  const supabase = await createClient();

  // Pedidos pagos com frete consolidado que ainda não entraram num lote.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- colunas 0074 fora dos tipos gerados
  const sb = supabase as any;
  const [{ data: pedidos, error: e1 }, { data: emLote }, { data: lotes, error: e2 }] =
    await Promise.all([
      sb
        .from("pedidos")
        .select(
          "id, id_venda, loja_id, created_at, frete_consolidado, status_pedido, lojas(nome), linha_itens(entrega_cep, entrega_bairro, entrega_cidade, valor_frete, retirar_na_loja)",
        )
        .eq("frete_consolidado", true)
        .eq("status_pedido", "Pagamento Realizado")
        .order("created_at", { ascending: false })
        .limit(200),
      sb.from("lote_pedidos").select("pedido_id"),
      sb
        .from("lotes_consolidacao")
        .select(
          "id, corredor_cep, status, criado_em, rota_otimizada, lojas(nome), corridas(status, preco_final), lote_pedidos(pedido_id, ordem, chegada_s, endereco)",
        )
        .order("criado_em", { ascending: false })
        .limit(50),
    ]);

  if (e1 || e2) {
    return <ErrorState title="Falha ao carregar lotes" detail={(e1 ?? e2)?.message} />;
  }

  const jaEmLote = new Set(
    ((emLote ?? []) as { pedido_id: string }[]).map((l) => l.pedido_id),
  );

  // Pedidos elegíveis; o agrupamento (zona do entregador ou corredor de CEP)
  // é o sugerirLotes, a mesma regra que a RPC valida ao montar o lote (0215).
  const pendentes: PedidoPendente[] = [];
  for (const p of pedidos ?? []) {
    if (jaEmLote.has(p.id)) continue;
    const linha = (p.linha_itens ?? []).find(
      (li: { entrega_cep: string | null; entrega_bairro: string | null; retirar_na_loja: boolean }) =>
        !li.retirar_na_loja && li.entrega_cep,
    );
    if (!linha) continue;
    pendentes.push({
      id: p.id,
      id_venda: p.id_venda,
      loja_id: p.loja_id,
      loja_nome: p.lojas?.nome ?? "—",
      cep: String(linha.entrega_cep),
      bairro: linha.entrega_bairro ?? null,
      criado_em: p.created_at,
      cidade: linha.entrega_cidade ?? "—",
      frete: (p.linha_itens ?? []).reduce(
        (s: number, li: { valor_frete: number | null }) => s + Number(li.valor_frete ?? 0),
        0,
      ),
    });
  }

  // Entregadores das lojas com pedido pendente e a zona de cada um (PRD 059).
  const lojaIds = [...new Set(pendentes.map((p) => p.loja_id))];
  let entregadores: EntregadorDaLoja[] = [];
  if (lojaIds.length > 0) {
    const { data: afils } = await sb
      .from("afiliacoes")
      .select("afiliado_id, loja_id, created_at")
      .in("loja_id", lojaIds)
      .eq("tipo", "logistica")
      .eq("status", "Aprovada");
    const lista = (afils ?? []) as { afiliado_id: string; loja_id: string; created_at: string }[];
    const { data: zonas } = lista.length
      ? await sb.from("entregador_zonas").select("user_id, tipo, valor").in("user_id", [...new Set(lista.map((a) => a.afiliado_id))])
      : { data: [] };
    const linhas = (zonas ?? []) as (LinhaZona & { user_id: string })[];
    entregadores = lista.map((a) => ({
      lojaId: a.loja_id,
      userId: a.afiliado_id,
      desde: a.created_at,
      zona: linhas.filter((z) => z.user_id === a.afiliado_id),
    }));
  }

  const porId = new Map(pendentes.map((p) => [p.id, p]));
  const sugestoes = sugerirLotes(
    pendentes.map((p) => ({ id: p.id, lojaId: p.loja_id, cep: p.cep, bairro: p.bairro, criadoEm: p.criado_em })),
    entregadores,
  );
  const grupos = new Map<string, PedidoPendente[]>(
    sugestoes.map((g) => [g.chave, g.pedidoIds.map((id) => porId.get(id)!)]),
  );
  const rotulo = new Map(
    sugestoes.map((g) => {
      const bairros = [...new Set(g.pedidoIds.map((id) => porId.get(id)!.bairro).filter(Boolean))].join(", ");
      return [
        g.chave,
        g.tipo === "zona" ? `zona de um entregador${bairros ? ` (${bairros})` : ""}` : `corredor ${g.corredor}xx-xxx`,
      ];
    }),
  );

  return (
    <div>
      <PageHeader
        title="Lotes de consolidação"
        subtitle="Lotes sugeridos: pedidos pagos com frete consolidado, da mesma loja e da mesma zona de entrega"
        count={pendentes.length}
      />

      {grupos.size === 0 ? (
        <EmptyState>Nenhum pedido consolidado aguardando lote.</EmptyState>
      ) : (
        [...grupos.entries()].map(([chave, grupo]) => (
          <form key={chave} action={criarLote} className="mb-6">
            <h3 className="mb-1 text-sm font-semibold text-ink">
              {grupo[0].loja_nome} → {rotulo.get(chave)} ({grupo[0].cidade})
            </h3>
            <Table headers={["", "Pedido", "Frete cobrado", "Cidade"]}>
              {grupo.map((p) => (
                <tr key={p.id} className="text-ink dark:text-ink-2">
                  <td className="w-8 px-4 py-[9px]">
                    <input type="checkbox" name="pedido_id" value={p.id} defaultChecked />
                  </td>
                  <td className="px-4 py-[9px] font-mono text-xs">{p.id_venda}</td>
                  <td className="px-4 py-[9px] text-right num">{fmtBRL(p.frete)}</td>
                  <td className="px-4 py-[9px]">{p.cidade}</td>
                </tr>
              ))}
            </Table>
            <button
              type="submit"
              disabled={grupo.length < 2}
              className="mt-2 rounded bg-sinal px-4 py-1.5 text-sm font-semibold text-white hover:bg-sinal-escuro disabled:opacity-40"
            >
              Criar lote ({grupo.length} pedidos, {fmtBRL(grupo.reduce((s, p) => s + p.frete, 0))}{" "}
              ao transportador)
            </button>
            {grupo.length < 2 && (
              <span className="ml-2 text-xs text-muted">
                Um lote precisa de pelo menos 2 pedidos da mesma zona.
              </span>
            )}
          </form>
        ))
      )}

      <PageHeader title="Lotes criados" count={(lotes ?? []).length} />
      {(lotes ?? []).length === 0 ? (
        <EmptyState>Nenhum lote criado ainda.</EmptyState>
      ) : (
        <Table headers={["Loja", "Corredor", "Pedidos", "Frete total", "Corrida", "Rota", "Criado em", ""]}>
          {(lotes ?? []).map(
            (l: {
              id: string;
              corredor_cep: string;
              status: string;
              criado_em: string;
              lojas: { nome: string } | null;
              corridas: { status: string; preco_final: number | null } | null;
              rota_otimizada: boolean;
              lote_pedidos: { pedido_id: string; ordem: number | null; chegada_s: number | null; endereco: string | null }[];
            }) => (
              <tr key={l.id} className="text-ink dark:text-ink-2">
                <td className="px-4 py-[9px]">{l.lojas?.nome ?? "—"}</td>
                <td className="px-4 py-[9px] font-mono text-xs">{l.corredor_cep}xx-xxx</td>
                <td className="px-4 py-[9px] text-right num">{l.lote_pedidos?.length ?? 0}</td>
                <td className="px-4 py-[9px] text-right num">
                  {fmtBRL(Number(l.corridas?.preco_final ?? 0))}
                </td>
                <td className="px-4 py-[9px]">{l.corridas?.status ?? "—"}</td>
                <td className="px-4 py-[9px] text-xs">
                  {l.status === "Publicado" && !l.rota_otimizada && (
                    <p className="mb-1 font-semibold text-warn">Rota não otimizada: paradas na ordem de chegada dos pedidos.</p>
                  )}
                  <ol className="space-y-0.5">
                    {[...(l.lote_pedidos ?? [])]
                      .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0))
                      .map((p) => (
                        <li key={p.pedido_id}>
                          {p.ordem ?? "?"}. {p.endereco ?? "endereço não informado"}
                          {p.chegada_s != null && <span className="text-muted"> ({textoChegada(p.chegada_s)} da coleta)</span>}
                        </li>
                      ))}
                  </ol>
                </td>
                <td className="px-4 py-[9px] text-xs text-muted">
                  {new Date(l.criado_em).toLocaleString("pt-BR")}
                </td>
                <td className="px-4 py-[9px]">
                  {l.status === "Publicado" &&
                  ["Publicada", "Aceita", undefined].includes(l.corridas?.status) ? (
                    <form action={cancelarLote}>
                      <input type="hidden" name="lote_id" value={l.id} />
                      <button
                        type="submit"
                        className="rounded border border-line px-2 py-0.5 text-xs text-muted hover:text-ink"
                      >
                        Desfazer
                      </button>
                    </form>
                  ) : (
                    <span className="text-xs text-muted">{l.status}</span>
                  )}
                </td>
              </tr>
            ),
          )}
        </Table>
      )}
    </div>
  );
}
