import type { Metadata } from "next";
import Link from "next/link";
import { VitrineHeader, VitrineFooter } from "@/components/vitrine/ui";

export const metadata: Metadata = {
  title: "Seja parceiro — divulgue ou entregue",
  description:
    "Ganhe com a Indústria 24h: divulgue produtos e receba comissão, ou transporte cargas como afiliado logístico ou parceiro de plataforma.",
};

// Landing pública que junta os dois caminhos de parceria que antes só eram
// acessíveis por URL direta (/afiliado/solicitar e /parceiro/cadastro).
// Página estática — sem dado dinâmico.
export default function SejaParceiroPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <VitrineHeader />

      <main className="mx-auto max-w-[880px] px-4 py-10 sm:px-6 flex-1">
        <header className="mb-10">
          <p className="font-archivo text-sm font-bold uppercase tracking-wide text-sinal">
            Para quem divulga e para quem entrega
          </p>
          <h1 className="mt-2 font-archivo text-3xl font-extrabold text-aco-900 sm:text-4xl">
            Seja parceiro da Indústria 24h
          </h1>
          <p className="mt-4 text-aco-800">
            Duas formas de ganhar com o marketplace B2B da Amazônia: indicar produtos e
            receber comissão por venda, ou transportar as cargas dos pedidos pagos.
            Escolha o caminho e faça seu cadastro — a aprovação é feita pela loja ou pela
            nossa equipe.
          </p>
        </header>

        <div className="grid gap-6 sm:grid-cols-2">
          <section className="rounded-sm border border-aco-100 bg-aco-100 p-6">
            <h2 className="font-archivo text-lg font-bold text-aco-900">
              Afiliado de vendas
            </h2>
            <p className="mt-3 text-aco-800">
              Divulgue produtos ou lojas com seu link e receba comissão a cada venda
              concluída. O percentual é definido pela loja no cadastro do produto.
            </p>
            <Link
              href="/afiliado/solicitar"
              className="mt-4 inline-block rounded bg-sinal px-4 py-2 text-sm font-semibold text-white hover:bg-sinal-escuro"
            >
              Solicitar afiliação
            </Link>
          </section>

          <section className="rounded-sm border border-aco-100 bg-aco-100 p-6">
            <h2 className="font-archivo text-lg font-bold text-aco-900">
              Afiliado logístico da loja
            </h2>
            <p className="mt-3 text-aco-800">
              Faça as entregas de uma loja específica. Ao ser aprovado, os pedidos pagos
              da loja aparecem no seu painel com endereço, distância e valor do frete —
              você tem prioridade para aceitar.
            </p>
            <Link
              href="/afiliado/solicitar"
              className="mt-4 inline-block rounded bg-sinal px-4 py-2 text-sm font-semibold text-white hover:bg-sinal-escuro"
            >
              Solicitar afiliação de logística
            </Link>
          </section>

          <section className="rounded-sm border border-aco-100 bg-aco-100 p-6 sm:col-span-2">
            <h2 className="font-archivo text-lg font-bold text-aco-900">
              Parceiro logístico de plataforma (motorista ou transportadora)
            </h2>
            <p className="mt-3 text-aco-800">
              Atenda corridas de qualquer loja no feed de entregas — inclusive as que não
              têm afiliado logístico. Cadastre seu veículo e área de atuação; a aprovação
              é da nossa equipe.
            </p>
            <Link
              href="/parceiro/cadastro"
              className="mt-4 inline-block rounded bg-sinal px-4 py-2 text-sm font-semibold text-white hover:bg-sinal-escuro"
            >
              Cadastrar como parceiro logístico
            </Link>
          </section>
        </div>

        <p className="mt-8 text-sm text-aco-800">
          Antes de começar, leia os termos:{" "}
          <a href="/termos/termos-afiliado-vendas" target="_blank" rel="noopener noreferrer" className="text-sinal-escuro underline">
            afiliado de vendas
          </a>
          {", "}
          <a href="/termos/termos-afiliado-logistica" target="_blank" rel="noopener noreferrer" className="text-sinal-escuro underline">
            afiliado logístico
          </a>
          {" e "}
          <a href="/termos/termos-parceiro-logistico" target="_blank" rel="noopener noreferrer" className="text-sinal-escuro underline">
            parceiro logístico
          </a>
          .
        </p>
      </main>

      <VitrineFooter />
    </div>
  );
}
