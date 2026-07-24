import { VitrineHeader, VitrineFooter } from "@/components/vitrine/ui";
import { notFound } from "next/navigation";
import { createPublicClient } from "@/lib/supabase/public";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { ErrorState } from "@/components/ErrorState";
import { formatBRL } from "@/components/seller/format";
import { FormParticipar, BarraProgresso } from "@/components/vitrine/CompraColetiva";
import { ReguaLotes } from "@/components/vitrine/ReguaLotes";
import { ChatThread } from "@/components/chat/ChatThread";
import { precoLote, type Lote } from "@/lib/coletiva";

export const dynamic = "force-dynamic";

const ROTULO_EVENTO: Record<string, string> = {
  criada: "Coletiva criada",
  participante_entrou: "Novo participante",
  lote_desbloqueado: "Lote desbloqueado",
  meta_atingida: "Meta atingida",
  prazo_proximo: "Prazo acabando",
  fechada: "Coletiva fechada",
  expirada: "Coletiva expirada",
  cancelada: "Coletiva cancelada",
  agente: "Aviso",
};

export default async function ColetivaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!isSupabaseConfigured) {
    return <ErrorState title="Supabase não configurado" detail="Defina as variáveis do Supabase." />;
  }

  const { id } = await params;
  const supabase = createPublicClient();

  const { data: coletiva } = await supabase
    .from("compras_coletivas")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!coletiva) notFound();

  // Colunas 0076/0077 ainda fora dos tipos gerados.
  const extra = coletiva as typeof coletiva & {
    lotes?: Lote[] | null;
    min_participantes?: number;
    max_participantes?: number | null;
    frete_conjunto?: boolean;
  };
  const lotes: Lote[] = Array.isArray(extra.lotes) ? extra.lotes : [];

  const { data: produto } = await supabase
    .from("produtos")
    .select("id, nome, valor, estoque_atual")
    .eq("id", coletiva.produto_id)
    .maybeSingle();
  const { data: loja } = await supabase
    .from("lojas_vitrine")
    .select("id, nome, cidade, estado")
    .eq("id", coletiva.loja_id)
    .maybeSingle();
  const { data: imagens } = await supabase
    .from("produto_imagens")
    .select("url")
    .eq("produto_id", coletiva.produto_id)
    .order("ordem", { ascending: true })
    .limit(1);

  const auth = await createClient();
  const {
    data: { user },
  } = await auth.auth.getUser();
  const { data: minha } = user
    ? await auth
        .from("coletiva_participacoes")
        .select("quantidade, pedido_id")
        .eq("coletiva_id", id)
        .eq("user_id", user.id)
        .maybeSingle()
    : { data: null };

  const { data: pagamentos } = await supabase
    .from("coletiva_pagamentos")
    .select("pedidos_gerados, pedidos_pagos")
    .eq("coletiva_id", id)
    .maybeSingle();

  // Etapas (0078) — só participantes e dono da loja leem, pela RLS.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- tabelas 0078 fora dos tipos gerados
  const authAny = auth as any;
  const { data: eventos } = user
    ? await authAny
        .from("coletiva_eventos")
        .select("id, tipo, payload, created_at")
        .eq("coletiva_id", id)
        .order("created_at", { ascending: false })
        .limit(12)
    : { data: [] };

  // Mural: abre a conversa da coletiva para quem participa.
  let muralId: string | null = null;
  let mensagensIniciais: { id: string; autor_id: string; corpo: string; created_at: string }[] = [];
  if (user && minha) {
    const { data: conversaId } = await authAny.rpc("coletiva_mural", { p_coletiva_id: id });
    muralId = (conversaId as string | null) ?? null;
    if (muralId) {
      const { data: msgs } = await authAny
        .from("mensagens")
        .select("id, autor_id, corpo, created_at")
        .eq("conversa_id", muralId)
        .order("created_at", { ascending: true })
        .limit(100);
      mensagensIniciais = msgs ?? [];
    }
  }

  // ponytail: expiração/fechamento são avaliados na RPC e no /api/coletivas/tick;
  // aqui só a leitura honesta do estado.
  const emAndamento = coletiva.status === "Aberta" || coletiva.status === "Viavel";
  const expirada = emAndamento && new Date(coletiva.prazo) < new Date();
  const status = expirada ? "Expirada" : coletiva.status;
  const restante = coletiva.meta_qtd - coletiva.qtd_atual;
  const precoAtual = lotes.length
    ? precoLote(lotes, coletiva.qtd_atual, Number(coletiva.preco_base))
    : Number(coletiva.valor_unitario);
  const desconto = Math.round((1 - precoAtual / Number(coletiva.preco_base)) * 100);
  const urlConvite = `https://industria24.com.br/coletiva/${coletiva.id}`;
  const textoConvite = encodeURIComponent(
    `Entra comigo nessa compra coletiva de "${produto?.nome ?? "produto"}" no Indústria 24h: ${formatBRL(precoAtual)}/un (${desconto}% off). Faltam ${Math.max(restante, 0)} un para fechar! ${urlConvite}`,
  );

  return (
    <>
      <VitrineHeader />
      <main className="mx-auto max-w-[720px] px-4 py-8 md:py-12">
        <a
          href={`/produto/${coletiva.produto_id}`}
          className="mb-4 inline-flex items-center gap-1 text-sm text-ink-2 hover:text-aco-600"
        >
          ← Ver produto
        </a>

        <div className="rounded-md border border-line bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-[.12em] text-[#7C7C7C]">
            Compra coletiva · {status === "Viavel" ? "Meta batida — segue aberta" : status}
          </p>
          <div className="mt-3 flex items-start gap-4">
            {imagens?.[0]?.url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imagens[0].url}
                alt={produto?.nome ?? ""}
                className="h-20 w-20 rounded object-cover"
              />
            )}
            <div className="min-w-0">
              <h1 className="font-display text-xl font-bold leading-tight text-[#121212]">
                {produto?.nome ?? "Produto"}
              </h1>
              {loja && (
                <p className="text-sm text-[#7C7C7C]">
                  {loja.nome}
                  {[loja.cidade, loja.estado].filter(Boolean).length > 0 &&
                    ` · ${[loja.cidade, loja.estado].filter(Boolean).join("/")}`}
                </p>
              )}
              <p className="mt-1 text-sm">
                <span className="num font-bold text-verde-24h">
                  {formatBRL(precoAtual)}/un
                </span>{" "}
                <span className="num text-[#7C7C7C] line-through">
                  {formatBRL(coletiva.preco_base)}/un
                </span>{" "}
                {desconto > 0 && (
                  <span className="rounded-sm bg-verde-24h-tint px-1.5 py-0.5 text-[11px] font-medium text-verde-24h">
                    -{desconto}%
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="mt-5">
            {lotes.length > 0 ? (
              <ReguaLotes
                lotes={lotes}
                atual={coletiva.qtd_atual}
                meta={coletiva.meta_qtd}
                base={Number(coletiva.preco_base)}
              />
            ) : (
              <BarraProgresso atual={coletiva.qtd_atual} meta={coletiva.meta_qtd} />
            )}
            <p className="mt-2 text-xs text-[#7C7C7C]">
              Prazo:{" "}
              <span className="num">
                {new Date(coletiva.prazo).toLocaleDateString("pt-BR")}
              </span>{" "}
              — ninguém paga nada antes do fechamento.
              {extra.max_participantes
                ? ` Vagas: até ${extra.max_participantes} participantes.`
                : ""}
              {extra.frete_conjunto ? " Entrega conjunta com frete rateado." : ""}
            </p>
          </div>

          {minha && (
            <div className="mt-4 rounded-sm bg-aco-100 px-3 py-2 text-sm text-aco-600">
              Você participa com <span className="num font-semibold">{minha.quantidade}</span> un.
              {minha.pedido_id && (
                <>
                  {" "}
                  <a href={`/pedido/${minha.pedido_id}`} className="font-semibold underline">
                    Pagar meu pedido →
                  </a>
                </>
              )}
            </div>
          )}

          {emAndamento && !expirada && (
            <div className="mt-5 flex flex-col gap-3">
              <FormParticipar
                coletivaId={coletiva.id}
                maxQtd={produto ? produto.estoque_atual - coletiva.qtd_atual : restante}
              />
              <a
                href={`https://wa.me/?text=${textoConvite}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-fit items-center justify-center rounded border border-verde-24h px-4 py-2 text-sm font-semibold text-verde-24h hover:bg-verde-24h-tint"
              >
                Convidar pelo WhatsApp
              </a>
            </div>
          )}
          {status === "Atingida" && (
            <div className="mt-4 text-sm">
              {!minha?.pedido_id && (
                <p className="text-verde-24h">
                  Coletiva fechada! Os pedidos dos participantes foram gerados no
                  preço de {formatBRL(coletiva.valor_unitario)}/un.
                </p>
              )}
              {pagamentos && (
                <p className="mt-1 text-[#374151]">
                  Pedidos pagos:{" "}
                  <span className="num font-semibold">
                    {pagamentos.pedidos_pagos} de {pagamentos.pedidos_gerados}
                  </span>
                  {pagamentos.pedidos_pagos >= pagamentos.pedidos_gerados &&
                    " — todos os participantes pagaram ✓"}
                </p>
              )}
            </div>
          )}
          {status === "Expirada" && (
            <p className="mt-4 text-sm text-[#7C7C7C]">
              Esta coletiva expirou sem fechar — nada foi cobrado de ninguém.
            </p>
          )}
          {status === "Cancelada" && (
            <p className="mt-4 text-sm text-[#7C7C7C]">
              A loja cancelou esta coletiva — nada foi cobrado de ninguém.
            </p>
          )}
        </div>

        {((eventos ?? []) as { id: string; tipo: string; payload: Record<string, unknown>; created_at: string }[])
          .length > 0 && (
          <section className="mt-6 rounded-md border border-line bg-white p-5">
            <h2 className="mb-3 text-[15px] font-semibold text-ink">Etapas</h2>
            <ol className="grid gap-2 text-sm">
              {((eventos ?? []) as {
                id: string;
                tipo: string;
                payload: Record<string, unknown>;
                created_at: string;
              }[]).map((e) => (
                <li key={e.id} className="flex gap-3">
                  <span className="num shrink-0 text-xs text-[#7C7C7C]">
                    {new Date(e.created_at).toLocaleString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <span className="text-ink">
                    <strong>{ROTULO_EVENTO[e.tipo] ?? e.tipo}</strong>
                    {typeof e.payload?.texto === "string" ? ` — ${e.payload.texto}` : ""}
                    {e.tipo === "lote_desbloqueado" && e.payload?.valor_unitario
                      ? ` — agora ${formatBRL(Number(e.payload.valor_unitario))}/un`
                      : ""}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        )}

        {muralId && user && (
          <section className="mt-6">
            <h2 className="mb-2 text-[15px] font-semibold text-ink">
              Mural da coletiva
            </h2>
            <p className="mb-3 text-xs text-[#7C7C7C]">
              Todos os participantes e a loja conversam aqui — combine quantidades
              e a retirada.
            </p>
            <ChatThread
              conversaId={muralId}
              userId={user.id}
              mensagensIniciais={mensagensIniciais}
            />
          </section>
        )}
      </main>
      <VitrineFooter />
    </>
  );
}
