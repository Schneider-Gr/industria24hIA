import { VitrineHeader, VitrineFooter, ProdutoCard, Breadcrumb } from "@/components/vitrine/ui";
import { createPublicClient } from "@/lib/supabase/public";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { ErrorState } from "@/components/ErrorState";
import { notFound } from "next/navigation";
import { normalizeWhatsapp } from "@/lib/whatsapp";
import { iniciarConversa } from "@/app/mensagens/actions";
import { limparBBCode } from "@/lib/bbcode";
import { cookies } from "next/headers";
import { lerEnderecoCookie, lojaCobreCep, CEP_COOKIE, type FaixaCep } from "@/lib/cep";
import { CapturaRef } from "@/components/vitrine/CapturaRef";
import { buscarFlagsRapidas } from "@/lib/vitrine-quick-flags";

// Página 100% pública (sem sessão) — ISR: recatalogado a cada 60s em vez
// de a cada request. Usa createPublicClient (sem cookies) para não forçar
// renderização dinâmica.
export const revalidate = 60;

export default async function LojaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!isSupabaseConfigured) {
    return (
      <ErrorState
        title="Supabase não configurado"
        detail="Defina as variáveis do Supabase em web/.env.local (ou nas env vars da Vercel em produção)."
      />
    );
  }

  const { id } = await params;
  const supabase = createPublicClient();

  // View pública sem PII (migration 0012): só lojas Ativas, sem PIX/CNPJ/e-mail.
  const { data: loja, error: lojaError } = await supabase
    .from("lojas_vitrine")
    .select(
      "id, nome, descricao, logotipo_url, banner_url, whatsapp, cidade, estado, situacao, valor_pedido_minimo, permite_retirada_na_loja"
    )
    .eq("id", id)
    .single();

  if (lojaError || !loja || !loja.id || !loja.nome) {
    notFound();
  }

  const cookieStore = await cookies();
  const cepComprador = lerEnderecoCookie(cookieStore.get(CEP_COOKIE)?.value)?.cep ?? null;
  const { data: faixasCep } = await supabase
    .from("faixas_cep")
    .select("cep_inicial, cep_final, loja_id, ativo")
    .eq("ativo", true);
  const foraDaCobertura =
    !!cepComprador && !lojaCobreCep((faixasCep ?? []) as FaixaCep[], loja.id, cepComprador);

  const { data: produtos } = await supabase
    .from("produtos")
    .select(
      "id, loja_id, nome, descricao, valor, sku, quantidade_minima, estoque_atual, status_produto, created_at, produto_imagens(url, ordem)"
    )
    .eq("loja_id", id)
    .eq("status_produto", "Aprovado")
    .gt("valor", 0)
    .order("created_at", { ascending: false });

  const produtosComImagem = (produtos ?? []).map((p) => {
    const imagens = (p.produto_imagens ?? []) as {
      url: string;
      ordem: number;
    }[];
    const primeira = [...imagens].sort((a, b) => a.ordem - b.ordem)[0];
    return {
      ...p,
      img: primeira?.url ?? null,
    };
  });

  const { vendaFutura, coletiva } = await buscarFlagsRapidas(
    supabase,
    produtosComImagem.map((p) => ({ id: p.id, valor: p.valor })),
  );

  const whatsappNumero = normalizeWhatsapp(loja.whatsapp);
  const whatsappHref = whatsappNumero ? `https://wa.me/${whatsappNumero}` : null;

  const localizacao = [loja.cidade, loja.estado].filter(Boolean).join(" - ");

  return (
    <>
      <CapturaRef />
      <VitrineHeader />

      <main className="anim-entra min-h-screen bg-background">
        {loja.banner_url ? (
          <div className="w-full h-[180px] md:h-[260px] bg-line overflow-hidden">
            <img
              src={loja.banner_url}
              alt={`Banner de ${loja.nome}`}
              className="w-full h-full object-cover"
            />
          </div>
        ) : null}

        <section className="max-w-[1280px] mx-auto px-4 pt-4 md:px-6">
          <Breadcrumb itens={[{ label: "Home", href: "/" }, { label: loja.nome }]} />
        </section>

        <section className="max-w-[1280px] mx-auto px-4 md:px-6 -mt-6 md:-mt-14 relative">
          <div className="bg-white rounded border border-line p-4 md:p-6 flex flex-col md:flex-row md:items-center gap-4">
            {loja.logotipo_url ? (
              <img
                src={loja.logotipo_url}
                alt={loja.nome}
                className="w-20 h-20 md:w-24 md:h-24 rounded-full object-cover border border-line shrink-0"
              />
            ) : (
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-line/40 border border-line shrink-0" />
            )}

            <div className="flex-1 min-w-0">
              <h1 className="font-display text-[24px] md:text-[28px] font-bold text-ink">
                {loja.nome}
              </h1>
              {loja.descricao ? (
                <p className="text-[14px] text-ink-2 mt-1 max-w-[640px] whitespace-pre-line">
                  {limparBBCode(loja.descricao)}
                </p>
              ) : null}
              {localizacao ? (
                <p className="text-[13px] text-muted mt-1">
                  {localizacao}
                </p>
              ) : null}
            </div>

            {whatsappHref ? (
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 inline-flex w-full items-center justify-center rounded-sm bg-lm-azul px-5 py-2.5 text-[14px] font-semibold text-white transition-colors hover:bg-lm-azul-escuro md:w-auto"
              >
                Falar no WhatsApp
              </a>
            ) : null}
            {/* Chat interno (MPDD-15) — dúvida geral, sem produto. */}
            <form action={iniciarConversa} className="shrink-0 w-full md:w-auto">
              <input type="hidden" name="loja_id" value={loja.id} />
              <button
                type="submit"
                className="inline-flex w-full items-center justify-center rounded-sm border border-lm-azul px-5 py-2.5 text-[14px] font-semibold text-lm-azul transition-colors hover:bg-lm-azul/5 md:w-auto"
              >
                Falar com o vendedor
              </button>
            </form>
          </div>
        </section>

        <section className="max-w-[1280px] mx-auto px-4 md:px-6 py-8 md:py-10">
          <h2 className="font-display mb-4 text-[19px] font-bold text-ink md:text-[24px]">
            Produtos da loja
            {produtosComImagem.length > 0 && (
              <span className="num ml-2 align-middle text-sm font-medium text-muted">
                {produtosComImagem.length}
              </span>
            )}
          </h2>

          {foraDaCobertura ? (
            <div className="border border-line rounded bg-white p-8 text-center text-[14px] text-muted">
              Esta loja não entrega para o CEP informado.
            </div>
          ) : produtosComImagem.length === 0 ? (
            <div className="border border-line rounded bg-white p-8 text-center text-[14px] text-muted">
              Esta loja ainda não tem produtos aprovados publicados.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5">
              {produtosComImagem.map((produto) => (
                <ProdutoCard
                  key={produto.id}
                  produto={produto}
                  lojaCidade={loja.cidade}
                  lojaEstado={loja.estado}
                  temVendaFutura={vendaFutura.has(produto.id)}
                  temCompraColetiva={coletiva.has(produto.id)}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      <VitrineFooter />
    </>
  );
}
