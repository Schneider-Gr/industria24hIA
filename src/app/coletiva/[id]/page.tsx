import { VitrineHeader, VitrineFooter } from "@/components/vitrine/ui";
import { notFound } from "next/navigation";
import { createPublicClient } from "@/lib/supabase/public";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { ErrorState } from "@/components/ErrorState";
import { formatBRL } from "@/components/seller/format";
import { FormParticipar, BarraProgresso } from "@/components/vitrine/CompraColetiva";

export const dynamic = "force-dynamic";

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

  // Minha participação (se logado) — client autenticado, RLS só devolve a própria.
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

  // Transparência: quantos pedidos da coletiva já foram pagos (view
  // agregada 0071 — não expõe quem pagou).
  const { data: pagamentos } = await supabase
    .from("coletiva_pagamentos")
    .select("pedidos_gerados, pedidos_pagos")
    .eq("coletiva_id", id)
    .maybeSingle();

  // Vagas restantes quando o vendedor limitou os participantes do lote
  // (migration 0076). View agregada — a policy de coletiva_participacoes só
  // deixa cada comprador ver a própria linha.
  const { data: participantes } = await supabase
    .from("coletiva_participantes_total")
    .select("total")
    .eq("coletiva_id", id)
    .maybeSingle();
  const vagas =
    coletiva.max_participantes == null
      ? null
      : Math.max(coletiva.max_participantes - (participantes?.total ?? 0), 0);

  // ponytail: expiração é avaliada na leitura e na RPC; sem cron.
  const expirada = coletiva.status === "Aberta" && new Date(coletiva.prazo) < new Date();
  const status = expirada ? "Expirada" : coletiva.status;
  const restante = coletiva.meta_qtd - coletiva.qtd_atual;
  const desconto = Math.round(
    (1 - Number(coletiva.valor_unitario) / Number(coletiva.preco_base)) * 100,
  );
  const urlConvite = `https://industria24.com.br/coletiva/${coletiva.id}`;
  const textoConvite = encodeURIComponent(
    `Entra comigo nessa compra coletiva de "${produto?.nome ?? "produto"}" no Indústria 24h: ${formatBRL(coletiva.valor_unitario)}/un (${desconto}% off). Faltam ${Math.max(restante, 0)} un para fechar! ${urlConvite}`,
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
            Compra coletiva · {status}
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
                  {formatBRL(coletiva.valor_unitario)}/un
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
            <BarraProgresso atual={coletiva.qtd_atual} meta={coletiva.meta_qtd} />
            <p className="mt-1 text-xs text-[#7C7C7C]">
              Prazo:{" "}
              <span className="num">
                {new Date(coletiva.prazo).toLocaleDateString("pt-BR")}
              </span>{" "}
              — ninguém paga nada antes de a meta ser atingida.
            </p>
            {vagas !== null && (
              <p className="mt-1 text-xs text-[#7C7C7C]">
                O vendedor limitou esta coletiva a{" "}
                <span className="num">{coletiva.max_participantes}</span> participantes —{" "}
                {vagas === 0 ? (
                  <span className="font-semibold text-[#121212]">vagas esgotadas</span>
                ) : (
                  <>
                    restam <span className="num font-semibold">{vagas}</span>.
                  </>
                )}
              </p>
            )}
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

          {status === "Aberta" && vagas === 0 && !minha && (
            <p className="mt-5 rounded-sm bg-surface px-3 py-2 text-sm text-ink-2">
              Esta coletiva atingiu o limite de participantes definido pelo vendedor.
              Você ainda pode comprar o produto direto ou abrir uma nova coletiva.
            </p>
          )}

          {status === "Aberta" && !(vagas === 0 && !minha) && (
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
                  Meta atingida! Os pedidos dos participantes foram gerados.
                </p>
              )}
              {pagamentos && (
                <p className="mt-1 text-[#374151]">
                  Pedidos pagos:{" "}
                  <span className="num font-semibold">
                    {pagamentos.pedidos_pagos ?? 0} de {pagamentos.pedidos_gerados ?? 0}
                  </span>
                  {(pagamentos.pedidos_pagos ?? 0) >= (pagamentos.pedidos_gerados ?? 0) &&
                    " — todos os participantes pagaram ✓"}
                </p>
              )}
            </div>
          )}
          {status === "Expirada" && (
            <p className="mt-4 text-sm text-[#7C7C7C]">
              Esta coletiva expirou sem atingir a meta — nada foi cobrado de ninguém.
            </p>
          )}
        </div>
      </main>
      <VitrineFooter />
    </>
  );
}
