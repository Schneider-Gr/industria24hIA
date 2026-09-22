// Ponte para o Sentry do navegador, sem pagar o SDK na primeira pintura.
//
// O SDK inteiro (núcleo, Session Replay e feedback) vive em ./sentry-client e
// entra por import dinâmico quando o navegador fica ocioso. Até lá, os
// listeners abaixo guardam qualquer erro e o reenviam assim que o SDK sobe,
// então a janela inicial não fica cega. Medição de 22/09 em 4G lento: o SDK
// respondia por 130 KB comprimidos do primeiro chunk.
type ModuloSentry = typeof import("./sentry-client");

let carregando: Promise<ModuloSentry> | null = null;
const pendentes: unknown[] = [];

function carregar(): Promise<ModuloSentry> {
  carregando ??= import("./sentry-client").then((m) => {
    m.iniciar();
    while (pendentes.length) m.capturar(pendentes.shift());
    return m;
  });
  return carregando;
}

function enfileirar(erro: unknown) {
  if (pendentes.length < 10) pendentes.push(erro);
  void carregar().catch(() => {});
}

if (typeof window !== "undefined" && process.env.NEXT_PUBLIC_SENTRY_DSN) {
  window.addEventListener("error", (e) => enfileirar(e.error ?? e.message));
  window.addEventListener("unhandledrejection", (e) => enfileirar(e.reason));

  const ocioso = (
    window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => void }
  ).requestIdleCallback;
  const agendar = (cb: () => void) =>
    ocioso ? ocioso.call(window, cb, { timeout: 5000 }) : window.setTimeout(cb, 3000);
  const aoOciar = () => agendar(() => void carregar().catch(() => {}));
  if (document.readyState === "complete") aoOciar();
  else window.addEventListener("load", aoOciar, { once: true });
}

// Breadcrumbs de navegação do App Router: só valem depois que o SDK subiu.
export const onRouterTransitionStart = (
  ...args: Parameters<ModuloSentry["transicaoDeRota"]>
) => {
  void carregando?.then((m) => m.transicaoDeRota(...args)).catch(() => {});
};
