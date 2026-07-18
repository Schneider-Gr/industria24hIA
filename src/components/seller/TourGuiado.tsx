"use client";

import { createContext, useContext, useEffect, useState } from "react";
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
    href: "/seller/produtos",
    titulo: "Produtos",
    texto:
      'Cadastre e edite seu catálogo aqui. Em "Cadastrar Novo" você preenche nome, preço e descrição — e o botão "IA: gerar imagem da descrição" cria a foto de catálogo do produto automaticamente a partir do texto.',
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

  // Âncora do passo: o item correspondente no menu lateral (sempre montado).
  // O balão se move até ele e um anel destaca o alvo — o usuário segue o menu
  // passo a passo. Recalcula ao trocar de passo/rota e em scroll/resize; tenta
  // por ~600ms após navegar, porque o link só ganha destaque depois do paint.
  const [rect, setRect] = useState<DOMRect | null>(null);
  useEffect(() => {
    // Quando inativo o overlay não é renderizado (gate `ativo &&`), então não
    // precisamos limpar o rect síncronamente aqui — só não medimos.
    if (!ativo) return;
    const alvo = () =>
      document.querySelector<HTMLElement>(
        `nav[aria-label="Menu do vendedor"] a[href="${step.href}"]`,
      );
    let raf = 0;
    const medir = () => {
      const el = alvo();
      setRect(el ? el.getBoundingClientRect() : null);
    };
    // Retry curto pós-navegação até o alvo aparecer/estabilizar. A 1ª medição
    // sai num rAF (não síncrona no corpo do effect) para não cascatear render.
    const inicio = performance.now();
    const loop = () => {
      medir();
      if (performance.now() - inicio < 600) raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    window.addEventListener("scroll", medir, true);
    window.addEventListener("resize", medir);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", medir, true);
      window.removeEventListener("resize", medir);
    };
  }, [ativo, passo, pathname, step.href]);

  // Balão junto ao alvo quando ancorado; senão, canto inferior direito.
  const ancorado = naTelaCerta && rect != null;
  const dialogStyle: React.CSSProperties = ancorado
    ? {
        top: `clamp(0.5rem, ${rect.top}px, calc(100vh - 20rem))`,
        left: `min(${rect.right + 12}px, calc(100vw - min(360px, 100vw - 2rem) - 0.5rem))`,
      }
    : { bottom: "1rem", right: "1rem" };

  return (
    <TourContext.Provider value={{ iniciar }}>
      {children}
      {ativo && ancorado && (
        <div
          aria-hidden
          className="pointer-events-none fixed z-40 rounded-md ring-2 ring-amarelo ring-offset-2 ring-offset-roxo-900 transition-all duration-200"
          style={{
            top: rect.top - 2,
            left: rect.left - 2,
            width: rect.width + 4,
            height: rect.height + 4,
          }}
        />
      )}
      {ativo && (
        <div
          role="dialog"
          aria-label="Tour guiado"
          style={dialogStyle}
          className="fixed z-50 w-[min(360px,calc(100vw-2rem))] rounded-lg border border-line bg-surface p-5 shadow-xl"
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
