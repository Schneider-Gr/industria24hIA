import { VitrineHeader, VitrineFooter } from "@/components/vitrine/ui";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { ErrorState } from "@/components/ErrorState";
import { formatBRL } from "@/components/seller/format";
import { BotaoAddCarrinho } from "@/components/carrinho/carrinho";
import { MercadoFuturo, type VendaFuturaItem } from "@/components/vitrine/MercadoFuturo";

type Faixa = { min_qtd: number; valor_unitario: number };

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
  const supabase = await createClient();

  const { data: produto, error } = await supabase
    .from("produtos")
    .select("*")
    .eq("id", id)
    .single();

  // Produto sem preço é rascunho: não deve ser acessível na vitrine pública,
  // mesmo por link direto. Trata como inexistente (coerente com H5).
  if (error || !produto || !produto.valor || Number(produto.valor) <= 0) {
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

  const whatsappNumero = loja?.whatsapp ? loja.whatsapp.replace(/\D/g, "") : "";
  const textoWhatsapp = encodeURIComponent(
    `Olá! Tenho interesse no produto "${produto.nome}" que vi no Indústria 24h.`
  );
  const linkWhatsapp = whatsappNumero
    ? `https://wa.me/${whatsappNumero}?text=${textoWhatsapp}`
    : null;

  return (
    <>
      <VitrineHeader />

      <main className="mx-auto max-w-[1280px] px-4 py-8 md:py-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-12">
          {/* Galeria */}
          <div>
            {imagens && imagens.length > 0 ? (
              <div className="space-y-3">
                <div className="aspect-square w-full overflow-hidden rounded-sm border border-[#E5E7EB] bg-white">
                  <img
                    src={imagens[0].url}
                    alt={produto.nome}
                    className="h-full w-full object-cover"
                  />
                </div>
                {imagens.length > 1 && (
                  <div className="grid grid-cols-4 gap-2">
                    {imagens.slice(1).map((img) => (
                      <div
                        key={img.url + img.ordem}
                        className="aspect-square overflow-hidden rounded-sm border border-[#E5E7EB] bg-white"
                      >
                        <img
                          src={img.url}
                          alt={produto.nome}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex aspect-square w-full items-center justify-center rounded-sm border border-[#E5E7EB] bg-[#F3F4F6]">
                <span className="text-sm text-[#7C7C7C]">Sem foto</span>
              </div>
            )}
          </div>

          {/* Painel de informações */}
          <div className="flex flex-col gap-5">
            <div>
              {loja && (
                <a
                  href={`/loja/${loja.id}`}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-[#4C1D95] hover:underline"
                >
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-roxo-100 text-[10px] font-bold">
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
              <span className="num text-3xl font-bold text-[#121212]">
                {formatBRL(produto.valor)}
              </span>
              <span className="ml-1 text-sm text-[#7C7C7C]">/un</span>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <span className="inline-flex items-center rounded-sm bg-[#DCFCE7] px-2 py-0.5 text-[11px] font-medium text-[#166534]">
                  estoque: <span className="num ml-1">{produto.estoque_atual}</span>&nbsp;un
                </span>
                {produto.quantidade_minima != null && (
                  <span className="inline-flex items-center rounded-sm bg-roxo-100 px-2 py-0.5 text-[11px] font-medium text-roxo-800">
                    pedido mín.: <span className="num ml-1">{produto.quantidade_minima}</span>&nbsp;un
                  </span>
                )}
              </div>
            </div>

            {produto.descricao && (
              <p className="whitespace-pre-line text-sm leading-relaxed text-[#374151]">
                {produto.descricao}
              </p>
            )}

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

            <div className="pt-2">
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
              />
            </div>

            <div className="pt-2">
              {linkWhatsapp ? (
                <a
                  href={linkWhatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center rounded bg-[#F04E23] px-6 py-3 text-base font-semibold text-white hover:bg-[#D8451F]"
                >
                  Pedir pelo WhatsApp
                </a>
              ) : (
                <p className="text-sm text-[#7C7C7C]">
                  Esta loja não disponibilizou WhatsApp para contato.
                </p>
              )}
            </div>
          </div>
        </div>

        {itensMercadoFuturo.length > 0 && (
          <div className="mt-4">
            <MercadoFuturo itens={itensMercadoFuturo} />
          </div>
        )}
      </main>

      <VitrineFooter />
    </>
  );
}
