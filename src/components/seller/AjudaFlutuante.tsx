"use client";

import Image from "next/image";
import Link from "next/link";
import { useId, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { useTour } from "@/components/seller/TourGuiado";
import { buscarAjudaDaTela } from "@/lib/seller/ajuda-telas";
import { DICAS } from "@/lib/seller/dicas";

// Botão de ajuda da tela, com o mascote. Um por tela, não um por campo: a
// explicação de cada campo continua no "?" do `Dica.tsx` — repetir o mascote
// ao lado de 21 campos do ProdutoForm vira ruído (efeito Clippy) e dobra a
// altura do formulário no celular.
//
// POSIÇÃO: empilhado ACIMA do FAB de Atendimento (`ChatWidget`), que ocupa o
// mesmo canto com z-50. Os números abaixo derivam dos dele: no seller não há
// TabBarMobile (`rotas-tabbar.ts`), então o FAB é a pílula de ~3.25rem de
// altura, com `bottom: calc(3.5rem + safe + 0.75rem)` no mobile e `6rem` no
// desktop. Somando a altura do FAB mais uma folga de 0.75rem chega-se aos
// valores usados aqui. Mexeu no ChatWidget, confira este empilhamento.
const ACIMA_DO_ATENDIMENTO = "bottom-[calc(8.25rem+env(safe-area-inset-bottom))] md:bottom-40";

// Convite da primeira visita, por tela. Guardado no navegador do seller, não
// no banco: é preferência de interface. `sessionStorage` e não `localStorage`
// porque o convite deve voltar numa visita futura (decisão da dona em
// 14/09/2026) — fechar silencia aquela tela só enquanto o navegador ficar
// aberto. Lido por `useSyncExternalStore` em vez de um effect: no servidor o
// snapshot é "dispensado", então o convite não entra no HTML e não pisca
// antes da hidratação.
const PREFIXO_CONVITE = "seller:ajuda-convite-dispensado:";
let ouvintes: Array<() => void> = [];

function assinarConvite(cb: () => void) {
  ouvintes.push(cb);
  return () => {
    ouvintes = ouvintes.filter((o) => o !== cb);
  };
}

function lerDispensadas(): string {
  try {
    return sessionStorage.getItem(PREFIXO_CONVITE) ?? "";
  } catch {
    // Storage bloqueado (janela anônima, bloqueio de site): o convite
    // continua aparecendo, que é o lado seguro de errar.
    return "";
  }
}

function dispensarConvite(rota: string) {
  try {
    const atual = lerDispensadas().split(",").filter(Boolean);
    if (!atual.includes(rota)) {
      sessionStorage.setItem(PREFIXO_CONVITE, [...atual, rota].join(","));
    }
  } catch {
    // Sem storage o convite volta na próxima navegação; não é erro.
  }
  ouvintes.forEach((o) => o());
}

export function AjudaFlutuante() {
  const pathname = usePathname();
  const tour = useTour();
  const painelId = useId();
  // Guarda a rota em que o painel foi aberto, não um booleano: trocar de tela
  // fecha sozinho, sem effect de sincronização.
  const [abertoEm, setAbertoEm] = useState<string | null>(null);
  const aberto = abertoEm === pathname;
  const ajuda = buscarAjudaDaTela(pathname);
  const dispensadas = useSyncExternalStore(assinarConvite, lerDispensadas, () => pathname);

  // Tela fora do mapa não ganha botão, e o balão do tour não divide o canto
  // inferior direito com ele.
  if (!ajuda || tour?.ativo) return null;

  const temTour = tour?.temPasso(pathname) ?? false;
  const criticas = ajuda.dicas
    ? Object.values(DICAS[ajuda.dicas] ?? {}).filter((d) => d.peso === "fixa")
    : [];
  const convidar = !aberto && !dispensadas.split(",").includes(pathname);

  return (
    <div
      className={`pointer-events-none fixed right-4 z-40 flex flex-col items-end gap-2 ${ACIMA_DO_ATENDIMENTO}`}
    >
      {aberto && (
        <div
          id={painelId}
          role="dialog"
          aria-label={`Ajuda: ${ajuda.titulo}`}
          className="pointer-events-auto w-[min(320px,calc(100vw-2rem))] rounded-lg border border-line bg-surface p-4 shadow-xl"
        >
          <h2 className="font-display text-base font-semibold text-ink">{ajuda.titulo}</h2>
          <p className="mt-0.5 text-xs text-muted">Como esta tela funciona</p>

          {criticas.length > 0 && (
            <ul className="mt-3 space-y-1.5 border-l-2 border-sinal pl-3 text-xs leading-relaxed text-ink-2">
              {criticas.slice(0, 3).map((d) => (
                <li key={d.texto}>{d.texto}</li>
              ))}
            </ul>
          )}

          <div className="mt-4 space-y-2">
            {temTour && (
              <button
                type="button"
                onClick={() => {
                  setAbertoEm(null);
                  tour?.iniciarNaRota(pathname);
                }}
                className="w-full rounded bg-aco-600 px-3 py-2 text-sm font-semibold text-white hover:bg-aco-900"
              >
                Ver o tour desta tela
              </button>
            )}
            <Link
              href={`/seller/central-de-duvidas/${ajuda.topico}`}
              onClick={() => setAbertoEm(null)}
              className="block w-full rounded border border-line px-3 py-2 text-center text-sm text-ink-2 hover:border-aco-600 hover:text-aco-600"
            >
              Abrir o manual desta tela
            </Link>
          </div>
        </div>
      )}

      {/* Fala do mascote: azul da marca com seta apontando para o botão, para
          não ser lido como um retângulo branco perdido sobre a tabela. Só
          some no ✕ ou quando o painel é aberto — nunca por tempo. */}
      {convidar && (
        <div className="pointer-events-auto relative max-w-[min(17rem,calc(100vw-2rem))] rounded-lg bg-aco-900 py-2.5 pl-3.5 pr-1.5 shadow-xl">
          <div className="flex items-start gap-1">
            <p className="py-1 text-xs leading-relaxed text-white">
              Primeira vez nesta tela? Clique em mim que eu explico.
            </p>
            <button
              type="button"
              onClick={() => dispensarConvite(pathname)}
              aria-label="Dispensar convite de ajuda"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-white/70 hover:bg-white/10 hover:text-white"
            >
              ✕
            </button>
          </div>
          <span
            aria-hidden="true"
            className="absolute -bottom-1 right-6 h-3 w-3 rotate-45 bg-aco-900"
          />
        </div>
      )}

      <button
        type="button"
        onClick={() => {
          dispensarConvite(pathname);
          setAbertoEm(aberto ? null : pathname);
        }}
        aria-expanded={aberto}
        aria-controls={painelId}
        className="pointer-events-auto flex h-16 w-16 items-center justify-center rounded-full border-2 border-white bg-aco-900 shadow-xl ring-1 ring-ink/15 transition-transform hover:scale-105"
      >
        <Image
          src="/mascote-ajuda.png"
          alt=""
          width={64}
          height={64}
          className="rounded-full"
          aria-hidden="true"
        />
        <span className="sr-only">{aberto ? "Fechar ajuda" : `Ajuda sobre ${ajuda.titulo}`}</span>
      </button>
    </div>
  );
}
