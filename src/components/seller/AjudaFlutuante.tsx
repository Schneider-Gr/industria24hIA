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
// ponytail: sem animação de entrada. O painel é um popover simples.

// Convite da primeira visita. Guardado no navegador do seller, não no banco:
// é preferência de interface, e errar para o lado de mostrar de novo depois
// de trocar de máquina é barato. Lido por `useSyncExternalStore` em vez de um
// effect — no servidor o snapshot é "já viu", então o convite nunca entra no
// HTML e não pisca antes da hidratação.
const CHAVE_CONVITE = "seller:ajuda-convite-visto";
let ouvintes: Array<() => void> = [];

function assinarConvite(cb: () => void) {
  ouvintes.push(cb);
  return () => {
    ouvintes = ouvintes.filter((o) => o !== cb);
  };
}

function lerConviteVisto() {
  try {
    return localStorage.getItem(CHAVE_CONVITE) === "1";
  } catch {
    // Navegador com storage bloqueado: não insistir com o convite.
    return true;
  }
}

function marcarConviteVisto() {
  try {
    localStorage.setItem(CHAVE_CONVITE, "1");
  } catch {
    // Sem storage o convite volta na próxima visita; não é motivo de erro.
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
  const conviteVisto = useSyncExternalStore(assinarConvite, lerConviteVisto, () => true);

  // Tela fora do mapa não ganha botão, e o balão do tour não divide o canto
  // inferior direito com ele.
  if (!ajuda || tour?.ativo) return null;

  const temTour = tour?.temPasso(pathname) ?? false;
  const criticas = ajuda.dicas
    ? Object.values(DICAS[ajuda.dicas] ?? {}).filter((d) => d.peso === "fixa")
    : [];

  return (
    <div className="fixed bottom-4 right-4 z-30 flex flex-col items-end gap-2">
      {aberto && (
        <div
          id={painelId}
          role="dialog"
          aria-label={`Ajuda: ${ajuda.titulo}`}
          className="w-[min(320px,calc(100vw-2rem))] rounded-lg border border-line bg-surface p-4 shadow-xl"
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

      {!aberto && !conviteVisto && (
        <div className="flex max-w-[min(280px,calc(100vw-2rem))] items-start gap-2 rounded-lg border border-line bg-surface p-3 shadow-lg">
          <p className="text-xs leading-relaxed text-ink-2">
            Primeira vez por aqui? Clique em mim que eu explico esta tela.
          </p>
          <button
            type="button"
            onClick={marcarConviteVisto}
            aria-label="Dispensar convite de ajuda"
            className="shrink-0 text-muted hover:text-ink"
          >
            ✕
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={() => {
          marcarConviteVisto();
          setAbertoEm(aberto ? null : pathname);
        }}
        aria-expanded={aberto}
        aria-controls={painelId}
        className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-white bg-aco-900 shadow-lg transition-transform hover:scale-105"
      >
        <Image
          src="/mascote-ajuda.png"
          alt=""
          width={56}
          height={56}
          className="rounded-full"
          aria-hidden="true"
        />
        <span className="sr-only">{aberto ? "Fechar ajuda" : `Ajuda sobre ${ajuda.titulo}`}</span>
      </button>
    </div>
  );
}
