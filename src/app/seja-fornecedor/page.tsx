import type { Metadata } from "next";
import Link from "next/link";
import { VitrineHeader, VitrineFooter } from "@/components/vitrine/ui";

export const metadata: Metadata = {
  title: "Venda sua produção para o Brasil inteiro — Indústria 24h",
  description:
    "Cadastre sua indústria na Indústria 24h: venda direta sem intermediários, alcance nacional, painel de gestão completo, Venda Futura com preço travado e compra coletiva.",
};

// Landing de conversão para o CTA do BannerRecrutamentoSeller e do botão
// "Vender no 24h" do header. Só lista vantagens de features JÁ implementadas
// (CLAUDE.md regra 1: proibido anunciar o que não existe) — os PRDs de
// marca própria, antecipação de recebíveis, centro de distribuição e
// contrato de preço travado genérico seguem em DRAFT, não entram aqui.
const VANTAGENS = [
  {
    titulo: "Venda direta, sem intermediários",
    texto:
      "Seu produto vai direto da sua indústria para o comprador. Sem atravessador, com comissão simples e transparente por venda.",
    icone: (
      <>
        <path d="M4 12h16M14 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
      </>
    ),
  },
  {
    titulo: "Alcance nacional",
    texto:
      "Sua loja fica visível para compradores de todo o Brasil no marketplace, com busca por categoria e cobertura por CEP.",
    icone: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18Z" />
      </>
    ),
  },
  {
    titulo: "Painel de gestão completo",
    texto:
      "Acompanhe pedidos, repasse, produtos e desempenho da loja em um único painel, sem depender de planilha.",
    icone: (
      <>
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path d="M3 9h18M8 4v5" strokeLinecap="round" />
      </>
    ),
  },
  {
    titulo: "Venda Futura com preço travado",
    texto:
      "Receba reservas antes da produção ficar pronta, com o preço combinado protegido até a entrega — capital de giro sem esperar o pedido acabar.",
    icone: (
      <>
        <rect x="4" y="10" width="16" height="10" rx="2" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      </>
    ),
  },
  {
    titulo: "Desconto progressivo por volume",
    texto:
      "Configure faixas de preço por quantidade — quanto mais o comprador leva, maior o desconto, sem precisar negociar pedido a pedido.",
    icone: (
      <>
        <path d="M4 20V10M12 20V4M20 20v-6" strokeLinecap="round" />
      </>
    ),
  },
  {
    titulo: "Compra coletiva",
    texto:
      "Compradores pequenos se juntam para destravar seu preço de lote — mais vendas de volume sem depender de um único comprador grande.",
    icone: (
      <>
        <circle cx="8" cy="9" r="2.6" />
        <circle cx="16" cy="9" r="2.6" />
        <path d="M3 19c0-3 2.2-5 5-5s5 2 5 5M11 19c0-3 2.2-5 5-5s5 2 5 5" strokeLinecap="round" />
      </>
    ),
  },
] as const;

export default function SejaFornecedorPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <VitrineHeader />

      <main className="flex-1">
        <section className="bg-lm-marinho">
          <div className="mx-auto max-w-[1000px] px-4 py-14 text-center sm:px-6 sm:py-20">
            <p className="text-xs font-bold uppercase tracking-[.14em] text-lm-amarelo">
              Para fabricantes e indústrias
            </p>
            <h1 className="font-display mt-3 text-[28px] font-extrabold leading-tight text-white sm:text-[40px]">
              Venda direto para o Brasil inteiro
            </h1>
            <p className="mx-auto mt-4 max-w-[640px] text-[15px] leading-relaxed text-white/80 sm:text-base">
              Cadastre sua produção na Indústria 24h e alcance milhares de compradores
              sem intermediário, com painel de gestão completo e ferramentas para vender
              mais em cada pedido.
            </p>
            <Link
              href="/vender"
              className="mt-7 inline-block rounded-sm bg-lm-amarelo px-8 py-3 text-sm font-bold uppercase tracking-[.04em] text-lm-marinho transition-colors hover:brightness-95"
            >
              Cadastrar minha indústria
            </Link>
          </div>
        </section>

        <section className="mx-auto max-w-[1080px] px-4 py-12 sm:px-6 sm:py-16">
          <h2 className="font-display text-center text-2xl font-bold text-ink sm:text-[28px]">
            Por que vender na Indústria 24h
          </h2>
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {VANTAGENS.map((v) => (
              <div key={v.titulo} className="rounded-md border border-line p-6">
                <div className="flex h-11 w-11 items-center justify-center rounded-[10px] bg-lm-azul/10">
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="text-lm-azul"
                    aria-hidden
                  >
                    {v.icone}
                  </svg>
                </div>
                <h3 className="mt-4 text-[15px] font-bold text-ink">{v.titulo}</h3>
                <p className="mt-2 text-[13.5px] leading-relaxed text-ink-2">{v.texto}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="border-t border-line bg-lm-cinza">
          <div className="mx-auto max-w-[720px] px-4 py-12 text-center sm:px-6">
            <h2 className="font-display text-2xl font-bold text-ink">
              Pronto para vender?
            </h2>
            <p className="mt-3 text-[14.5px] leading-relaxed text-ink-2">
              O cadastro é gratuito e leva poucos minutos. Depois de aprovado, você já
              pode publicar produtos e começar a receber pedidos.
            </p>
            <Link
              href="/vender"
              className="mt-6 inline-block rounded-sm bg-lm-azul px-8 py-3 text-sm font-bold text-white transition-colors hover:bg-lm-azul-escuro"
            >
              Cadastrar minha indústria
            </Link>
          </div>
        </section>
      </main>

      <VitrineFooter />
    </div>
  );
}
