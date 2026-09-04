"use client";

import { useEffect, useState, useTransition } from "react";
import { buscarEndereco, formatarCep, lerEnderecoCookie, CEP_COOKIE, type EnderecoCep } from "@/lib/cep";
import {
  definirCepComprador,
  definirLocalizacaoAutomatica,
  limparCepComprador,
} from "@/app/vitrine-cep-actions";

// ponytail: sem prop do server (VitrineHeader é usado por página client, ex.
// checkout) — lê o cookie no próprio browser após montar; primeiro paint
// mostra "Informe o seu CEP" por uma fração de segundo, aceitável.
const DISPENSADO = "cep_modal_dispensado";

function lerEnderecoDoBrowser(): EnderecoCep | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${CEP_COOKIE}=([^;]*)`));
  if (!match) return null;
  return lerEnderecoCookie(decodeURIComponent(match[1]));
}

function IconePin({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden>
      <path
        d="M10 18s6-5.686 6-10a6 6 0 1 0-12 0c0 4.314 6 10 6 10Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <circle cx="10" cy="8" r="2.2" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function IconeAlvo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden>
      <circle cx="10" cy="10" r="3" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.6" />
      <path d="M10 1v2M10 17v2M1 10h2M17 10h2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

/** `autoAbrir`: abre o modal sozinho na primeira visita sem CEP, como o Leroy
 *  Merlin faz. Uma vez dispensado, não volta a abrir sozinho — a decisão fica
 *  no localStorage do visitante, não em cookie, porque não interessa ao servidor. */
export function CepBar({ autoAbrir = false }: { autoAbrir?: boolean } = {}) {
  const [enderecoInicial, setEnderecoInicial] = useState<EnderecoCep | null>(null);
  const [aberto, setAberto] = useState(false);
  const [cepInput, setCepInput] = useState("");
  const [preview, setPreview] = useState<EnderecoCep | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [pending, startTransition] = useTransition();

  const [localizando, setLocalizando] = useState(false);

  useEffect(() => {
    const salvo = lerEnderecoDoBrowser();
    setEnderecoInicial(salvo);
    if (!autoAbrir || salvo) return;
    try {
      if (localStorage.getItem(DISPENSADO) === "1") return;
    } catch {
      // Modo privado / storage bloqueado: mostra o modal, é o comportamento seguro.
    }
    setAberto(true);
  }, [autoAbrir]);

  function fechar() {
    setAberto(false);
    try {
      localStorage.setItem(DISPENSADO, "1");
    } catch {
      // sem storage: volta a abrir na próxima visita, aceitável.
    }
  }

  function usarLocalizacaoDoNavegador() {
    setErro(null);
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setErro("Seu navegador não informa a localização. Digite o CEP abaixo.");
      return;
    }
    setLocalizando(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        startTransition(async () => {
          const r = await definirLocalizacaoAutomatica(pos.coords.latitude, pos.coords.longitude);
          setLocalizando(false);
          if (!r.ok) {
            setErro(r.erro);
            return;
          }
          fechar();
          window.location.reload();
        });
      },
      () => {
        setLocalizando(false);
        setErro("Não foi possível obter sua localização. Digite o CEP abaixo.");
      },
      { timeout: 10000, maximumAge: 5 * 60 * 1000 },
    );
  }

  async function aoDigitarCep(valor: string) {
    setCepInput(formatarCep(valor));
    setErro(null);
    setPreview(null);
    const limpo = valor.replace(/\D/g, "");
    if (limpo.length !== 8) return;
    setBuscando(true);
    const endereco = await buscarEndereco(limpo);
    setBuscando(false);
    if (!endereco) {
      setErro(`Não encontramos endereço compatível com o CEP ${formatarCep(limpo)}, verifique e tente novamente!`);
      return;
    }
    setPreview(endereco);
  }

  function usar() {
    if (!preview) return;
    startTransition(async () => {
      await definirCepComprador(preview);
      setEnderecoInicial(preview);
      setAberto(false);
      window.location.reload(); // recarrega pra refiltrar as listas server-side
    });
  }

  const resumo = enderecoInicial
    ? `Enviar para ${enderecoInicial.cidade}, ${enderecoInicial.uf}`
    : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="flex items-center gap-1.5 py-2 text-xs text-white/80 hover:text-white transition-colors"
      >
        <IconePin className="h-4 w-4" />
        {resumo ?? "Informe o seu CEP"}
      </button>

      {aberto && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 px-4 pt-24"
          onClick={fechar}
        >
          <div
            className="w-full max-w-[480px] rounded-md bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <h2 className="text-lg font-bold text-ink">Onde você está?</h2>
              <button
                type="button"
                onClick={fechar}
                aria-label="Fechar"
                className="-mr-1 -mt-1 p-1 text-muted hover:text-ink"
              >
                <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" aria-hidden>
                  <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <p className="mt-1 text-sm text-muted">
              Assim mostramos só os produtos que chegam até você.
            </p>

            <button
              type="button"
              onClick={usarLocalizacaoDoNavegador}
              disabled={localizando || pending}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-sm border border-lm-azul px-4 py-2.5 text-sm font-semibold text-lm-azul disabled:opacity-50"
            >
              <IconeAlvo className="h-4 w-4" />
              {localizando ? "Obtendo sua localização…" : "Utilizar localização automática"}
            </button>

            <p className="mt-4 text-xs font-semibold text-ink">Buscar por CEP</p>
            <div className="mt-1.5 flex gap-2">
              <input
                value={cepInput}
                onChange={(e) => aoDigitarCep(e.target.value)}
                placeholder="Digite o CEP"
                maxLength={9}
                className="flex-1 rounded-sm border border-line bg-[#F3F4F6] px-4 py-2.5 text-sm text-ink outline-none focus:border-lm-azul"
              />
              <button
                type="button"
                disabled={!preview || pending}
                onClick={usar}
                className="rounded-sm bg-lm-azul px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
              >
                Confirmar
              </button>
            </div>

            {buscando && <p className="mt-3 text-sm text-muted">Buscando endereço…</p>}
            {erro && (
              <p className="mt-3 rounded-sm border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {erro}
              </p>
            )}

            {preview && (
              <>
                <p className="mt-4 text-center text-sm font-medium text-ink">Confira o endereço abaixo…</p>
                <div className="mt-2 grid grid-cols-2 gap-2 text-sm text-ink sm:grid-cols-4">
                  <p>{preview.rua || "—"}</p>
                  <p>{preview.bairro || "—"}</p>
                  <p>{preview.cidade}</p>
                  <p>{preview.uf}</p>
                </div>
              </>
            )}

            {enderecoInicial && (
              <button
                type="button"
                onClick={() => startTransition(async () => {
                  await limparCepComprador();
                  setAberto(false);
                  window.location.reload();
                })}
                className="mt-4 text-xs text-muted underline"
              >
                Remover CEP salvo
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
