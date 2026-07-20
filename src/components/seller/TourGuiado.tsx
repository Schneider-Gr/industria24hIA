"use client";

import { createContext, useContext, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

// Tour guiado replicando o vídeo "Visão Geral da Plataforma" do Bubble
// (industria24h.com.br/version-test/seller — assistido em 2026-07-15).
// Lógica de navegação observada no vídeo: o apresentador vai de Produtos →
// Análise Geral (aponta os cards de Valor Total/Produtos Vendidos e as
// colunas Status/Repasse Ind da tabela de vendas) → Centro de distribuição
// (lista de centros → formulário de novo centro com CEP/mapa) → Pedidos
// (visão geral com filtro de status). Sem narração capturada (sem chave
// Whisper configurada neste projeto), então os textos abaixo descrevem o
// que a tela mostra, não transcrevem fala — atualizar se a chave for
// configurada e a voz off puder ser transcrita literalmente.
const PASSOS = [
  {
    href: "/seller",
    titulo: "Bem-vindo ao painel do lojista",
    texto:
      "Este é o Dashboard: visão rápida de vendas do mês, comparação com o mês anterior e top produtos. É a tela inicial sempre que você entra.",
  },
  {
    href: "/seller/analise-geral",
    titulo: "Análise Geral",
    texto:
      "Aqui você vê o valor total vendido, quantos produtos foram vendidos e a variação percentual em relação ao período anterior — os cards verde/vermelho no topo.",
  },
  {
    href: "/seller/analise-geral",
    titulo: "Tabela de vendas",
    texto:
      "Abaixo dos cards fica a lista de vendas: cliente, item, status do pagamento e o Repasse Ind — o valor que a Indústria 24h repassa pra sua loja depois da comissão.",
  },
  {
    href: "/seller/centros",
    titulo: "Centro de distribuição",
    texto:
      "Cadastre os pontos de onde seus produtos são despachados. Cada centro tem nome e localização — o CEP ajuda a calcular frete e cobertura de entrega.",
  },
  {
    href: "/seller/pedidos",
    titulo: "Pedidos",
    texto:
      "Visão geral dos pedidos recebidos: cliente, quantidade, data e status (Pago, Em separação, etc). Use os filtros pra achar um pedido específico rápido.",
  },
  {
    href: "/seller/minha-loja",
    titulo: "Minha Loja",
    texto:
      'Edite os dados cadastrais, chave PIX e configurações da sua loja. É a mesma tela que o menu "Dados" abre.',
  },
] as const;

type TourContextValue = { iniciar: () => void };
const TourContext = createContext<TourContextValue | null>(null);

// Botão de entrada do tour — usado na página de Tutoriais. Fica fora do
// TourProvider (não precisa saber o estado, só disparar o início).
export function TourTrigger() {
  const ctx = useContext(TourContext);
  if (!ctx) return null;
  return (
    <button
      type="button"
      onClick={ctx.iniciar}
      className="rounded bg-aco-600 px-4 py-2 text-sm font-semibold text-white hover:bg-aco-900"
    >
      Iniciar tour guiado
    </button>
  );
}

// Provider + overlay do tour. Montado uma vez no SellerShell (persiste em
// memória entre navegações dentro do (seller) layout — não precisa
// sincronizar com storage porque o layout não desmonta ao trocar de rota).
export function TourProvider({ children }: { children: React.ReactNode }) {
  const [ativo, setAtivo] = useState(false);
  const [passo, setPasso] = useState(0);
  const pathname = usePathname();
  const router = useRouter();

  function iniciar() {
    setPasso(0);
    setAtivo(true);
    if (pathname !== PASSOS[0].href) router.push(PASSOS[0].href);
  }

  function irParaPasso(i: number) {
    setPasso(i);
    if (pathname !== PASSOS[i].href) router.push(PASSOS[i].href);
  }

  function encerrar() {
    setAtivo(false);
  }

  const step = PASSOS[passo];
  const naTelaCerta = pathname === step.href;

  return (
    <TourContext.Provider value={{ iniciar }}>
      {children}
      {ativo && (
        <div
          role="dialog"
          aria-label="Tour guiado"
          className="fixed bottom-4 right-4 z-50 w-[min(360px,calc(100vw-2rem))] rounded-lg border border-line bg-surface p-5 shadow-xl"
        >
          <div className="mb-1 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-aco-600">
              Passo {passo + 1} de {PASSOS.length}
            </span>
            <button type="button" onClick={encerrar} aria-label="Fechar tour" className="text-muted hover:text-ink">
              ✕
            </button>
          </div>
          <h3 className="mb-1 font-display text-lg font-semibold text-ink">{step.titulo}</h3>
          <p className="mb-4 text-sm text-ink-2">{step.texto}</p>

          {!naTelaCerta && (
            <button
              type="button"
              onClick={() => router.push(step.href)}
              className="mb-3 w-full rounded border border-aco-600 px-3 py-1.5 text-sm font-semibold text-aco-600 hover:bg-aco-600/10"
            >
              Ir para esta tela
            </button>
          )}

          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              disabled={passo === 0}
              onClick={() => irParaPasso(passo - 1)}
              className="rounded border border-line px-3 py-1.5 text-sm text-ink-2 disabled:opacity-40"
            >
              Voltar
            </button>
            {passo < PASSOS.length - 1 ? (
              <button
                type="button"
                onClick={() => irParaPasso(passo + 1)}
                className="rounded bg-sinal px-4 py-1.5 text-sm font-semibold text-white hover:bg-sinal-escuro"
              >
                Próximo
              </button>
            ) : (
              <button
                type="button"
                onClick={encerrar}
                className="rounded bg-ok px-4 py-1.5 text-sm font-semibold text-white"
              >
                Concluir
              </button>
            )}
          </div>
        </div>
      )}
    </TourContext.Provider>
  );
}
