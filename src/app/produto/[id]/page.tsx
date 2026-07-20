import { VitrineHeader, VitrineFooter, Entrega24hBadge } from "@/components/vitrine/ui";
import { notFound } from "next/navigation";
import { createPublicClient } from "@/lib/supabase/public";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { ErrorState } from "@/components/ErrorState";
import { formatBRL } from "@/components/seller/format";
import { BotaoAddCarrinho } from "@/components/carrinho/carrinho";
import { GaleriaProduto } from "@/components/vitrine/GaleriaProduto";
import { MercadoFuturo, type VendaFuturaItem } from "@/components/vitrine/MercadoFuturo";
import { normalizeWhatsapp } from "@/lib/whatsapp";
import { limparBBCode } from "@/lib/bbcode";
import { cookies } from "next/headers";
import { lerEnderecoCookie, lojaCobreCep, CEP_COOKIE, type FaixaCep } from "@/lib/cep";

type Faixa = { min_qtd: number; valor_unitario: number };

// ISR curto (preço/estoque exibidos aqui) — o checkout_criar_pedido revalida
// preço/estoque de verdade no banco, então uma vitrine com até 30s de atraso
// não quebra a integridade da compra, só a exatidão do que é exibido.
export const revalidate = 30;

export default async function ProdutoPage({
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

  const { data: produto, error } = await supabase
    .from("produtos")
    .select("*")
    .eq("id", id)
    .single();

  // Produto sem preço é rascunho: não deve ser acessível na vitrine pública,
  // mesmo por link direto. Trata como inexistente (coerente com H5).
  if (
    error ||
    !produto ||
    !produto.valor ||
    Number(produto.valor) <= 0 ||
    produto.status_produto !== "Aprovado"
  ) {
    notFound();
  }

  // Dados da loja via view pública sem PII (migration 0012) — a tabela
  // lojas não tem mais leitura anônima.
  const { data: loja } = await supabase
    .from("lojas_vitrine")
    .select("id, nome, whatsapp, cidade, estado")
    .eq("id", produto.loja_id)
    .maybeSingle();

  const { data: imagens } = await supabase
    .from("produto_imagens")
    .select("*")
    .eq("produto_id", id)
    .order("ordem", { ascending: true });

  const { data: promocao } = await supabase
    .from("promocoes_progressivas")
    .select("*")
    .eq("produto_id", id)
    .eq("ativo", true)
    .maybeSingle();

  const faixas: Faixa[] = Array.isArray(promocao?.faixas) ? (promocao.faixas as unknown as Faixa[]) : [];

  const { data: vendasFuturas } = await supabase
    .from("vendas_futuras")
    .select("id, previsao, estoque, valor")
    .eq("produto_id", id)
    .gt("estoque", 0)
    .order("previsao", { ascending: true });

  const itensMercadoFuturo: VendaFuturaItem[] = (vendasFuturas ?? [])
    .filter((v) => v.previsao)
    .map((v) => ({
      id: v.id,
      produto_id: produto.id,
      produto_nome: produto.nome,
      loja_id: produto.loja_id,
      loja_nome: loja?.nome ?? "—",
      img: imagens?.[0]?.url ?? null,
      previsao: v.previsao as string,
      estoque: v.estoque ?? 0,
      valor: v.valor,
      preco_base: Number(produto.valor),
      quantidade_minima: produto.quantidade_minima,
    }));

  const cookieStore = await cookies();
  const cepComprador = lerEnderecoCookie(cookieStore.get(CEP_COOKIE)?.value)?.cep ?? null;
  const { data: faixasCep } = await supabase
    .from("faixas_cep")
    .select("cep_inicial, cep_final, loja_id, ativo")
    .eq("ativo", true);
  const foraDaCobertura =
    !!cepComprador && !lojaCobreCep((faixasCep ?? []) as FaixaCep[], produto.loja_id, cepComprador);

  const whatsappNumero = normalizeWhatsapp(loja?.whatsapp);
  const textoWhatsapp = encodeURIComponent(
    `Olá! Tenho interesse no produto "${produto.nome}" que vi no Indústria 24h.`
  );
  const linkWhatsapp = whatsappNumero
    ? `https://wa.me/${whatsappNumero}?text=${textoWhatsapp}`
    : null;

  return (
    <>
      <VitrineHeader />

      <main className="mx-auto max-w-[1280px] px-4 py-8 pb-28 md:py-12 md:pb-12">
        <a
          href={loja ? `/loja/${loja.id}` : "/"}
          className="mb-4 inline-flex items-center gap-1 text-sm text-ink-2 hover:text-aco-600"
        >
          ← {loja ? `Voltar para ${loja.nome}` : "Voltar"}
        </a>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-12">
          {/* Galeria (DESIGN.md, padrão 2026-07-17): componente client interativo,
              miniaturas clicáveis trocam a foto principal sem reload */}
          <div>
            <GaleriaProduto imagens={imagens ?? []} nomeProduto={produto.nome} />
          </div>

          {/* Painel de informações */}
          <div className="flex flex-col gap-5">
            <div>
              {loja && (
                <a
                  href={`/loja/${loja.id}`}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-aco-600 hover:underline"
                >
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-aco-100 text-[10px] font-bold">
                    {loja.nome.charAt(0).toUpperCase()}
                  </span>
                  {loja.nome}
                  {[loja.cidade, loja.estado].filter(Boolean).length > 0 && (
                    <span className="font-normal text-[#7C7C7C]">
                      · {[loja.cidade, loja.estado].filter(Boolean).join("/")}
                    </span>
                  )}
                </a>
              )}
              <h1 className="font-display mt-1 text-2xl font-bold leading-tight text-[#121212] md:text-3xl">
                {produto.nome}
              </h1>
            </div>

            <div className="rounded-md border border-line bg-white p-4">
              <span className="num text-[24px] font-bold text-[#121212]">
                {formatBRL(produto.valor)}
              </span>
              <span className="ml-1 text-sm text-[#7C7C7C]">/un</span>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {!foraDaCobertura && (
                  <Entrega24hBadge cidade={loja?.cidade} estado={loja?.estado} />
                )}
                <span className="inline-flex items-center rounded-sm bg-verde-24h-tint px-2 py-0.5 text-[11px] font-medium text-verde-24h">
                  estoque: <span className="num ml-1">{produto.estoque_atual}</span>&nbsp;un
                </span>
                {produto.quantidade_minima != null && (
                  <span className="inline-flex items-center rounded-sm bg-aco-100 px-2 py-0.5 text-[11px] font-medium text-aco-600">
                    pedido mín.: <span className="num ml-1">{produto.quantidade_minima}</span>&nbsp;un
                  </span>
                )}
              </div>
            </div>

            {faixas.length > 0 && (
              <div className="rounded-sm border border-[#E5E7EB] bg-white p-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[.12em] text-[#7C7C7C]">
                  Promoção progressiva
                </p>
                <table className="w-full text-sm">
                  <tbody>
                    {faixas
                      .slice()
                      .sort((a, b) => a.min_qtd - b.min_qtd)
                      .map((faixa, idx) => (
                        <tr
                          key={idx}
                          className="border-t border-[#E5E7EB] first:border-t-0"
                        >
                          <td className="py-1.5 text-[#374151]">
                            A partir de{" "}
                            <span className="num font-semibold">
                              {faixa.min_qtd}
                            </span>{" "}
                            un
                          </td>
                          <td className="num py-1.5 text-right font-semibold text-[#121212]">
                            {formatBRL(faixa.valor_unitario)}/un
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Ações de compra — escondidas no mobile, onde viram a barra fixa no rodapé */}
            <div className="hidden flex-col gap-3 md:flex">
              {foraDaCobertura ? (
                <button
                  type="button"
                  disabled
                  className="rounded bg-line px-5 py-2.5 text-sm font-semibold text-muted cursor-not-allowed"
                >
                  indisponível na sua região
                </button>
              ) : (
                <BotaoAddCarrinho
                  produto={{
                    produto_id: produto.id,
                    nome: produto.nome,
                    valor: Number(produto.valor),
                    quantidade_minima: produto.quantidade_minima,
                    loja_id: produto.loja_id,
                    loja_nome: loja?.nome ?? "",
                    img: imagens?.[0]?.url ?? null,
                  }}
                  estoqueMaximo={produto.estoque_atual}
                />
              )}
              {linkWhatsapp ? (
                <a
                  href={linkWhatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center rounded bg-sinal px-6 py-3 text-base font-semibold text-white hover:bg-sinal-escuro"
                >
                  Pedir pelo WhatsApp
                </a>
              ) : (
                <p className="text-sm text-[#7C7C7C]">
                  Esta loja não disponibilizou WhatsApp para contato.
                </p>
              )}
              {/* Leilão reverso: comprador que quer volume maior/preço melhor
                  publica um pedido pré-preenchido com este produto, em vez de
                  comprar direto. Link simples com query string — reaproveita
                  o form já existente em /leilao. */}
              <a
                href={`/leilao?titulo=${encodeURIComponent(produto.nome)}${produto.categoria_id ? `&categoria_id=${produto.categoria_id}` : ""}`}
                className="inline-flex items-center justify-center rounded border border-aco-600 px-6 py-2.5 text-sm font-semibold text-aco-600 hover:bg-aco-600/5"
              >
                Pedir em leilão (volume/preço melhor)
              </a>
            </div>

            {produto.descricao && (
              <p className="whitespace-pre-line border-t border-line pt-5 text-sm leading-relaxed text-[#374151]">
                {limparBBCode(produto.descricao)}
              </p>
            )}
          </div>
        </div>

        {itensMercadoFuturo.length > 0 && (
          <div className="mt-4">
            <MercadoFuturo itens={itensMercadoFuturo} />
          </div>
        )}
      </main>

      {/* Barra de compra fixa no mobile: preço + ações sempre visíveis, sem rolar até o fim da descrição */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white p-3 shadow-[0_-2px_12px_rgba(0,0,0,.08)] md:hidden">
        <div className="flex items-center gap-3">
          <div className="min-w-0 shrink-0">
            <p className="num text-lg font-bold leading-none text-ink">
              {formatBRL(produto.valor)}
              <span className="text-xs font-normal text-muted">/un</span>
            </p>
          </div>
          <div className="min-w-0 flex-1">
            {foraDaCobertura ? (
              <button
                type="button"
                disabled
                className="h-10 w-full rounded bg-line px-4 text-sm font-semibold text-muted cursor-not-allowed"
              >
                indisponível na sua região
              </button>
            ) : (
              <BotaoAddCarrinho
                produto={{
                  produto_id: produto.id,
                  nome: produto.nome,
                  valor: Number(produto.valor),
                  quantidade_minima: produto.quantidade_minima,
                  loja_id: produto.loja_id,
                  loja_nome: loja?.nome ?? "",
                  img: imagens?.[0]?.url ?? null,
                }}
                estoqueMaximo={produto.estoque_atual}
                compacto
              />
            )}
          </div>
        </div>
      </div>

      <VitrineFooter />
    </>
  );
}
