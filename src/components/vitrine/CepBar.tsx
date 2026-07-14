"use client";

import { useEffect, useState, useTransition } from "react";
import { buscarEndereco, formatarCep, lerEnderecoCookie, CEP_COOKIE, type EnderecoCep } from "@/lib/cep";
import { definirCepComprador, limparCepComprador } from "@/app/vitrine-cep-actions";

// ponytail: sem prop do server (VitrineHeader é usado por página client, ex.
// checkout) — lê o cookie no próprio browser após montar; primeiro paint
// mostra "Informe o seu CEP" por uma fração de segundo, aceitável.
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

export function CepBar() {
  const [enderecoInicial, setEnderecoInicial] = useState<EnderecoCep | null>(null);
  const [aberto, setAberto] = useState(false);
  const [cepInput, setCepInput] = useState("");
  const [preview, setPreview] = useState<EnderecoCep | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setEnderecoInicial(lerEnderecoDoBrowser());
  }, []);

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

  const resumo = enderecoInicial ? `${enderecoInicial.rua || "Endereço salvo"}, ${enderecoInicial.cidade}` : null;

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
          onClick={() => setAberto(false)}
        >
          <div
            className="w-full max-w-[720px] rounded-md bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold text-ink">Selecione onde quer receber suas compras</h2>
            <p className="mt-1 text-sm text-muted">
              Você poderá ver custos e prazos de entrega precisos em tudo que procurar.
            </p>

            <div className="mt-4 flex gap-2">
              <input
                value={cepInput}
                onChange={(e) => aoDigitarCep(e.target.value)}
                placeholder="Informe o seu CEP"
                maxLength={9}
                className="flex-1 rounded-sm border border-line bg-[#F3F4F6] px-4 py-2.5 text-sm text-ink outline-none focus:border-roxo-800"
              />
              <button
                type="button"
                disabled={!preview || pending}
                onClick={usar}
                className="rounded-sm bg-roxo-800 px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
              >
                Usar
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
