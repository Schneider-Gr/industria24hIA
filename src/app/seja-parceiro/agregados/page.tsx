import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { VitrineHeader, VitrineFooter } from "@/components/vitrine/ui";

export const metadata: Metadata = {
  title: "Seja um agregado — entregue para a Indústria 24h",
  description:
    "Motorista ou transportadora em Manaus: cadastre seu veículo, escolha as corridas no feed de entregas e receba o frete via PIX.",
};

// Landing de captação de parceiro logístico, seção de /seja-parceiro.
// Estrutura inspirada no hotsite de agregados da Martins (hero, benefícios,
// requisitos, FAQ, CTA repetido). Só entra o que o cadastro e o painel do
// parceiro já fazem em produção: nada de antecipação de frete, premiação ou
// volume garantido, que a Martins promete e nós não temos.
const CADASTRO_HREF = "/parceiro/cadastro";
const WHATSAPP_HREF = `https://wa.me/5592981139950?text=${encodeURIComponent(
  "Olá! Quero ser parceiro logístico (agregado) da Indústria 24h.",
)}`;

const CTA =
  "inline-block rounded-sm bg-lm-amarelo px-8 py-4 font-display text-sm font-bold uppercase tracking-[.04em] text-lm-marinho transition-[filter] hover:brightness-95";
const CTA_SEC =
  "inline-block rounded-sm border-[1.5px] border-white/45 px-7 py-4 font-display text-sm font-bold uppercase tracking-[.04em] text-white transition-colors hover:bg-white/10";
const EYEBROW = "font-display text-xs font-bold uppercase tracking-[.16em] text-sinal";
const H2 = "font-display mt-3 text-2xl font-extrabold tracking-[-.02em] text-ink sm:text-[30px]";

const BENEFICIOS = [
  { t: "Você escolhe a corrida", d: "O feed mostra endereço, distância e valor do frete antes do aceite. Aceita só o que compensa." },
  { t: "Frete via PIX", d: "O valor cai na chave PIX que você cadastrou, sem boleto e sem intermediário." },
  { t: "Seu valor mínimo", d: "Você define o valor mínimo por entrega e a sua área de atuação. Assim o marketplace sabe onde e por quanto você roda." },
  { t: "Cargas de várias indústrias", d: "Pedidos pagos de todas as lojas do marketplace, inclusive as que não têm entregador próprio." },
] as const;

const REQUISITOS = [
  "CNH válida",
  "Documento do veículo (CRLV) e placa",
  "Capacidade de carga em kg e m³",
  "Chave PIX para receber o frete",
  "Celular com WhatsApp e internet",
] as const;

const ETAPAS = [
  { n: "01", t: "Faça o cadastro", d: "Leva poucos minutos: dados, veículo, CEP base, área de atuação e PIX." },
  { n: "02", t: "Aprovação da equipe", d: "Nossa equipe confere os documentos e libera o seu acesso ao feed." },
  { n: "03", t: "Aceite corridas", d: "Pedidos pagos aparecem com endereço, distância e valor. Você decide." },
  { n: "04", t: "Entregue e receba", d: "Você registra a posição por GPS durante o transporte e o frete sai via PIX." },
] as const;

const FAQ = [
  { q: "Quem pode se cadastrar?", a: "Motoristas com veículo próprio ou agregado e transportadoras. O tipo é escolhido no cadastro." },
  { q: "Tenho que aceitar todas as corridas?", a: "Não. Você vê o valor e a distância antes e aceita só as que fazem sentido para você." },
  { q: "Como recebo?", a: "Via PIX, na chave que você informou no cadastro." },
  { q: "Quanto tempo leva a aprovação?", a: "Depende da conferência dos documentos pela nossa equipe. Você acompanha o status no seu painel." },
  { q: "Onde a operação acontece?", a: "Começamos por Manaus/AM. A sua área de atuação (cidades ou CEPs) é você quem informa." },
] as const;

export default function AgregadosPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <VitrineHeader />

      <main className="flex-1">
        {/* Hero */}
        <section className="bg-lm-marinho text-white">
          <div className="mx-auto grid max-w-[1100px] items-center gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.2fr_1fr]">
            <div>
              <p className="font-display text-xs font-bold uppercase tracking-[.16em] text-lm-amarelo">
                Parceiro logístico · Manaus
              </p>
              <h1 className="mt-3 font-display text-3xl font-extrabold leading-tight tracking-[-.02em] sm:text-5xl">
                Seu veículo rodando com carga da indústria.
              </h1>
              <p className="mt-5 max-w-[520px] text-lg text-white/85">
                Seja agregado da Indústria 24h: escolha as entregas no feed, veja o valor antes de
                aceitar e receba o frete via PIX.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href={CADASTRO_HREF} className={CTA}>Quero ser agregado</Link>
                <a href={WHATSAPP_HREF} target="_blank" rel="noopener noreferrer" className={CTA_SEC}>
                  Falar no WhatsApp
                </a>
              </div>
              <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/75">
                <li>✓ Cadastro gratuito</li>
                <li>✓ Você escolhe a corrida</li>
                <li>✓ Frete via PIX</li>
              </ul>
            </div>
            <div className="relative mx-auto aspect-[975/723] w-full max-w-[520px] overflow-hidden rounded-sm">
              <Image src="/parceiro/hero.jpg" alt="Motorista parceiro da Indústria 24h ao lado do caminhão" fill priority sizes="(min-width:768px) 520px, 100vw" className="object-cover" />
            </div>
          </div>
        </section>

        {/* Benefícios */}
        <section className="mx-auto max-w-[1100px] px-4 py-16 sm:px-6">
          <p className={EYEBROW}>Por que rodar com a gente</p>
          <h2 className={H2}>Benefícios de ser agregado</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {BENEFICIOS.map((b) => (
              <div key={b.t} className="rounded-sm border border-aco-100 border-t-4 border-t-lm-amarelo p-6">
                <h3 className="font-display text-lg font-bold text-ink">{b.t}</h3>
                <p className="mt-2 text-sm text-aco-800">{b.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Como funciona */}
        <section className="bg-aco-100">
          <div className="mx-auto grid max-w-[1100px] items-center gap-10 px-4 py-16 sm:px-6 md:grid-cols-2">
            <div className="relative aspect-[868/768] w-full overflow-hidden rounded-sm">
              <Image src="/parceiro/entrega.jpg" alt="Parceiro entregando pedido da Indústria 24h" fill sizes="(min-width:768px) 540px, 100vw" className="object-cover" />
            </div>
            <div>
              <p className={EYEBROW}>Como funciona</p>
              <h2 className={H2}>Do cadastro à primeira entrega</h2>
              <ol className="mt-6 space-y-5">
                {ETAPAS.map((e) => (
                  <li key={e.n} className="flex gap-4">
                    <span className="font-display text-2xl font-extrabold text-sinal">{e.n}</span>
                    <div>
                      <h3 className="font-display font-bold text-ink">{e.t}</h3>
                      <p className="text-sm text-aco-800">{e.d}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        {/* Requisitos */}
        <section className="mx-auto grid max-w-[1100px] items-center gap-10 px-4 py-16 sm:px-6 md:grid-cols-2">
          <div>
            <p className={EYEBROW}>Requisitos</p>
            <h2 className={H2}>O que você precisa para se cadastrar</h2>
            <ul className="mt-6 space-y-3">
              {REQUISITOS.map((r) => (
                <li key={r} className="flex items-start gap-3 text-aco-800">
                  <span className="mt-0.5 font-bold text-sinal">✓</span>
                  {r}
                </li>
              ))}
            </ul>
            <Link href={CADASTRO_HREF} className={`${CTA} mt-8`}>Começar meu cadastro</Link>
          </div>
          <div className="relative aspect-[685/402] w-full overflow-hidden rounded-sm">
            <Image src="/parceiro/operacao.jpg" alt="Operação da Indústria 24h" fill sizes="(min-width:768px) 540px, 100vw" className="object-cover" />
          </div>
        </section>

        {/* FAQ */}
        <section className="bg-aco-100">
          <div className="mx-auto max-w-[800px] px-4 py-16 sm:px-6">
            <p className={EYEBROW}>Dúvidas frequentes</p>
            <h2 className={H2}>Perguntas de quem está começando</h2>
            <div className="mt-6 divide-y divide-aco-100 rounded-sm bg-white">
              {FAQ.map((f) => (
                <details key={f.q} className="group p-5">
                  <summary className="cursor-pointer list-none font-display font-bold text-ink">
                    {f.q}
                    <span className="float-right text-sinal group-open:rotate-45">+</span>
                  </summary>
                  <p className="mt-3 text-sm text-aco-800">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* CTA final */}
        <section className="bg-lm-marinho text-white">
          <div className="mx-auto max-w-[800px] px-4 py-16 text-center sm:px-6">
            <h2 className="font-display text-2xl font-extrabold sm:text-4xl">Pronto para rodar com a Indústria 24h?</h2>
            <p className="mt-4 text-white/80">Cadastro gratuito. Nossa equipe aprova e você começa a ver as corridas.</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href={CADASTRO_HREF} className={CTA}>Quero ser agregado</Link>
              <a href={WHATSAPP_HREF} target="_blank" rel="noopener noreferrer" className={CTA_SEC}>Falar no WhatsApp</a>
            </div>
            <p className="mt-6 text-xs text-white/60">
              Leia os{" "}
              <a href="/termos/termos-parceiro-logistico" target="_blank" rel="noopener noreferrer" className="underline">
                termos do parceiro logístico
              </a>
              .
            </p>
          </div>
        </section>
      </main>

      <VitrineFooter />
    </div>
  );
}
