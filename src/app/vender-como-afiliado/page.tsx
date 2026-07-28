import type { Metadata } from "next";
import Link from "next/link";
import { VitrineHeader, VitrineFooter } from "@/components/vitrine/ui";
import { TourPainelAfiliado } from "@/components/vitrine/TourPainelAfiliado";

export const metadata: Metadata = {
  title: "Venda como Afiliado",
  description:
    "Divulgue produtos da Indústria 24h com seu link exclusivo e receba comissão por venda. Cadastro em minutos, sem loja própria.",
};

// Landing pública do programa de afiliados. Modelo de link/comissão segue o
// que existe de fato em (afiliado)/afiliado e afiliado/solicitar: link via
// ?ref=, comissão variável definida pela loja por produto — nada de slug
// próprio, comissão fixa ou coleta de CPF/conta bancária (isso não existe
// no sistema hoje, ver docs/business-rules.md).
export default function VendaComoAfiliadoPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <VitrineHeader />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden bg-aco-900">
          <img
            src="/afiliado-hero.png"
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-40"
          />
          <div className="relative mx-auto max-w-[880px] px-4 py-16 sm:px-6 sm:py-24">
            <p className="font-archivo text-sm font-bold uppercase tracking-wide text-sinal">
              Programa de Afiliados
            </p>
            <h1 className="mt-3 font-archivo text-3xl font-extrabold text-white sm:text-5xl">
              Transforme indicação em dinheiro no seu bolso
            </h1>
            <p className="mt-4 max-w-[560px] text-lg text-white/80">
              Escolha produtos da Indústria 24h, compartilhe seu link exclusivo e
              receba comissão a cada venda. Sem loja própria, sem estoque, sem
              complicação.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/afiliado/solicitar"
                className="rounded-sm bg-sinal px-6 py-3 text-sm font-semibold text-white hover:bg-sinal-escuro transition-colors"
              >
                Criar minha conta de afiliado
              </Link>
              <Link
                href="/afiliado"
                className="rounded-sm border border-white/30 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
              >
                Já sou afiliado, entrar
              </Link>
            </div>
          </div>
        </section>

        {/* Como funciona */}
        <section className="mx-auto max-w-[880px] px-4 py-14 sm:px-6">
          <p className="font-archivo text-sm font-bold uppercase tracking-wide text-sinal">
            Como funciona
          </p>
          <h2 className="mt-2 font-archivo text-2xl font-extrabold text-aco-900 sm:text-3xl">
            Quatro passos até a primeira venda
          </h2>

          <ol className="mt-8 grid gap-5 sm:grid-cols-2">
            {[
              {
                n: "1",
                t: "Crie sua conta",
                d: 'Acesse a Indústria 24h e clique em "Venda como Afiliado" para se cadastrar ou fazer login.',
              },
              {
                n: "2",
                t: "Escolha o produto",
                d: "No seu painel, navegue pelos produtos liberados para afiliação — como o Jambu em conserva, por exemplo — e solicite a divulgação.",
              },
              {
                n: "3",
                t: "Gere seu link",
                d: "Assim que aprovado, seu link exclusivo já aparece pronto para copiar ou enviar direto pelo WhatsApp.",
              },
              {
                n: "4",
                t: "Compartilhe e acompanhe",
                d: "Quando alguém compra pelo seu link, o pedido vai para a loja separar e você acompanha a comissão em tempo real no painel.",
              },
            ].map((p) => (
              <li key={p.n} className="rounded-sm border border-aco-100 bg-aco-100 p-5">
                <span className="font-archivo text-2xl font-extrabold text-sinal">{p.n}</span>
                <h3 className="mt-2 font-archivo text-base font-bold text-aco-900">{p.t}</h3>
                <p className="mt-1.5 text-sm text-aco-800">{p.d}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Vídeo explicativo */}
        <section className="bg-aco-100/60">
          <div className="mx-auto max-w-[880px] px-4 py-14 sm:px-6">
            <p className="font-archivo text-sm font-bold uppercase tracking-wide text-sinal">
              Entenda o modelo
            </p>
            <h2 className="mt-2 font-archivo text-2xl font-extrabold text-aco-900 sm:text-3xl">
              O que é um programa de afiliados
            </h2>
            <p className="mt-3 max-w-[640px] text-aco-800">
              O vídeo abaixo explica de forma geral como funciona um modelo de
              afiliados por influência e recomendação. Não é uma gravação do
              painel da Indústria 24h — para ver o painel real, use o tour logo
              abaixo.
            </p>
            <div className="mt-6 aspect-video w-full overflow-hidden rounded-md border border-line">
              <iframe
                className="h-full w-full"
                src="https://www.youtube.com/embed/w9SNWyCbIOI"
                title="Modelo de afiliados (influência e recomendação)"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </section>

        {/* Tour do painel real */}
        <section className="mx-auto max-w-[1000px] px-4 py-14 sm:px-6">
          <p className="font-archivo text-sm font-bold uppercase tracking-wide text-sinal">
            Tour do painel
          </p>
          <h2 className="mt-2 font-archivo text-2xl font-extrabold text-aco-900 sm:text-3xl">
            Veja o seu painel de afiliado por dentro
          </h2>
          <p className="mt-3 max-w-[640px] text-aco-800">
            As telas abaixo reproduzem o painel real, tela a tela.
          </p>
          <div className="mt-8">
            <TourPainelAfiliado />
          </div>
        </section>

        {/* Controle do lojista */}
        <section className="bg-aco-900">
          <div className="mx-auto max-w-[880px] px-4 py-14 sm:px-6">
            <p className="font-archivo text-sm font-bold uppercase tracking-wide text-sinal">
              Quem decide o quê
            </p>
            <h2 className="mt-2 font-archivo text-2xl font-extrabold text-white sm:text-3xl">
              A loja controla produto e comissão
            </h2>
            <p className="mt-3 max-w-[640px] text-white/75">
              Nem todo produto está liberado para afiliação, e o percentual de
              comissão varia de item para item — quem define isso é a loja, na
              hora de cadastrar o produto. Sua comissão é creditada quando a
              loja confirma a entrega do pedido feito pelo seu link, e fica
              disponível para saque depois do período de carência do programa.
            </p>
          </div>
        </section>

        {/* CTA final */}
        <section className="mx-auto max-w-[880px] px-4 py-16 text-center sm:px-6">
          <h2 className="font-archivo text-2xl font-extrabold text-aco-900 sm:text-3xl">
            Pronto para começar a divulgar?
          </h2>
          <p className="mt-3 text-aco-800">
            Simplifique suas vendas, conecte parceiros e alavanque o seu negócio.
          </p>
          <Link
            href="/afiliado/solicitar"
            className="mt-6 inline-block rounded-sm bg-sinal px-8 py-3 text-sm font-semibold text-white hover:bg-sinal-escuro transition-colors"
          >
            Criar minha conta de afiliado
          </Link>
        </section>
      </main>

      <VitrineFooter />
    </div>
  );
}
