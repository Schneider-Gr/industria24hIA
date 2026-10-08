"use client";

import { Suspense, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { VitrineHeader, VitrineFooter } from "@/components/vitrine/ui";
import Image from "next/image";
import Link from "next/link";
import { FormularioLogin } from "@/components/vitrine/FormularioLogin";
import { BENEFICIOS, ETAPAS } from "@/app/seja-parceiro/agregados/conteudo";

// Contas de teste: sempre em dev; em prod/preview só com
// NEXT_PUBLIC_MOSTRAR_CONTAS_TESTE=1. O próprio ContasTeste repete a
// checagem, então sem a flag o chunk (e a senha de teste) sai do bundle de
// prod — aqui a flag só evita montar a seção à toa.
const ContasTeste = dynamic(() =>
  import("@/components/vitrine/ContasTeste").then((m) => m.ContasTeste)
);
const MOSTRAR_CONTAS_TESTE =
  process.env.NODE_ENV !== "production" ||
  process.env.NEXT_PUBLIC_MOSTRAR_CONTAS_TESTE === "1";

// Login por e-mail/senha. "Esqueci a senha" dispara o e-mail de recuperação
// que aterrissa em /auth/confirm → /definir-senha. O mesmo formulário abre
// como card translúcido pelo header (LoginModal).
export default function LoginPage() {
  // useSearchParams exige Suspense no prerender.
  return (
    <Suspense>
      <LoginConteudo />
    </Suspense>
  );
}

// O link de recuperação é gerado via admin.generateLink (auth-actions.ts,
// fluxo Resend) — sem code_verifier de cliente, então o GoTrue SEMPRE
// verifica o token no próprio servidor do Supabase e redireciona de volta
// com a sessão no FRAGMENTO da URL (#access_token=...&type=recovery), nunca
// como ?code= ou ?token_hash=. O servidor (/auth/confirm/route.ts) não vê
// fragmento — ele não é enviado numa requisição HTTP — então cai sempre no
// redirect de erro. Como esse Location não especifica fragmento, o
// navegador preserva o antigo, e a sessão real chega intacta aqui em
// window.location.hash. Completar client-side em vez de descartar o link.
function useRecuperacaoPorFragmento() {
  const router = useRouter();
  const [erroRecuperacao, setErroRecuperacao] = useState<string | null>(null);

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash || !hash.includes("type=recovery")) return;

    const fragmento = new URLSearchParams(hash.slice(1));
    const accessToken = fragmento.get("access_token");
    const refreshToken = fragmento.get("refresh_token");
    if (!accessToken || !refreshToken) return;

    const supabase = createClient();
    supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken }).then(({ error }) => {
      // Limpa o fragmento da barra de endereço independentemente do resultado.
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
      if (error) {
        setErroRecuperacao("Link inválido ou expirado. Peça um novo link em Entrar → Esqueci a senha.");
        return;
      }
      router.replace("/definir-senha");
    });
  }, [router]);

  return erroRecuperacao;
}

function LoginConteudo() {
  const params = useSearchParams();
  const erroRecuperacao = useRecuperacaoPorFragmento();
  const erroInicial =
    erroRecuperacao ??
    (params.get("erro") === "link_invalido"
      ? "Link inválido ou expirado. Entre com a senha ou peça um novo link."
      : params.get("erro") === "sem_loja"
      ? "Essa conta não tem loja vinculada. Entre com a conta da sua loja ou abra a sua."
      : params.get("erro") === "sem_acesso_admin"
      ? "Essa conta não tem acesso à administração. Entre com uma conta de admin."
      : params.get("erro") === "sem_acesso_afiliado"
      ? "Essa conta ainda não tem afiliação aprovada. Acompanhe a sua solicitação em Seja afiliado, ou entre com a conta certa."
      : params.get("erro") === "sem_acesso_parceiro"
      ? "Essa conta não tem cadastro de parceiro logístico ativo. Faça o cadastro em Seja parceiro, ou entre com a conta certa."
      : null);
  // Quem chega pela área do entregador vê, junto do login, o resumo da landing de parceiro.
  const proximo = params.get("next") ?? "";
  const entregador =
    params.get("erro") === "sem_acesso_parceiro" || proximo.startsWith("/parceiro") || proximo.startsWith("/afiliado/logistica");

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <VitrineHeader />
      <main className="anim-entra mx-auto flex w-full max-w-[420px] flex-1 flex-col justify-center px-4 py-12">
        <h1 className="font-display text-lg font-semibold uppercase tracking-[0.08em] text-ink">
          Entrar
        </h1>
        <p className="mt-1 text-sm text-muted">
          Acesse o painel da sua loja ou a administração.
        </p>

        <div className="mt-6 rounded-md border border-line bg-surface/85 p-5 shadow-[0_4px_16px_rgba(15,26,36,.06)] backdrop-blur-md">
          <FormularioLogin
            next={params.get("next")}
            erroInicial={erroInicial}
            semLoja={params.get("erro") === "sem_loja"}
            acao={
              params.get("erro") === "sem_acesso_afiliado"
                ? { href: "/afiliado/solicitar", rotulo: "Seja afiliado" }
                : params.get("erro") === "sem_acesso_parceiro"
                ? { href: "/parceiro/cadastro", rotulo: "Seja parceiro" }
                : undefined
            }
          />
        </div>

        {entregador && (
          <section className="mt-8 rounded-md border border-line bg-surface p-5">
            <h2 className="font-display text-base font-bold text-ink">Quer entregar com a Indústria 24h?</h2>
            <p className="mt-1 text-sm text-muted">
              Motorista ou transportadora em Manaus: cadastre seu veículo, escolha as corridas e receba o frete via PIX.
            </p>
            {/* Miniatura, não vídeo: aqui a tarefa é entrar; o vídeo toca na landing. */}
            <Link
              href="/seja-parceiro/agregados#como-funciona"
              className="group mt-4 flex items-center gap-3 rounded-md border border-line bg-background p-2 pr-3 transition-colors hover:border-lm-azul focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lm-azul"
            >
              <span className="relative size-20 shrink-0 overflow-hidden rounded">
                <Image src="/parceiro/corrida-parceiro.jpg" alt="" fill sizes="80px" className="object-cover" />
                <span className="absolute inset-0 flex items-center justify-center bg-lm-marinho/25">
                  <span className="flex size-8 items-center justify-center rounded-full bg-white/95 text-lm-azul shadow-sm transition-transform duration-150 group-hover:scale-110">
                    <svg viewBox="0 0 24 24" className="ml-0.5 size-4" fill="currentColor" aria-hidden="true">
                      <path d="M8 5.14v13.72a1 1 0 0 0 1.5.86l11-6.86a1 1 0 0 0 0-1.72l-11-6.86A1 1 0 0 0 8 5.14Z" />
                    </svg>
                  </span>
                </span>
              </span>
              <span className="text-sm">
                <span className="block font-semibold text-ink">Veja uma corrida do começo ao fim</span>
                <span className="text-muted">8 segundos: aceitar, coletar, entregar e quanto você ganha</span>
              </span>
            </Link>
            <ol className="mt-4 space-y-3">
              {ETAPAS.map((e) => (
                <li key={e.n} className="flex gap-3">
                  <span className="font-display text-lg font-extrabold text-sinal">{e.n}</span>
                  <div>
                    <h3 className="text-sm font-bold text-ink">{e.t}</h3>
                    <p className="text-sm text-muted">{e.d}</p>
                  </div>
                </li>
              ))}
            </ol>
            <ul className="mt-4 space-y-1 text-sm text-ink">
              {BENEFICIOS.map((b) => (
                <li key={b.t}>
                  <span className="font-bold text-sinal">✓</span> {b.t}
                </li>
              ))}
            </ul>
            <Link
              href="/parceiro/cadastro"
              className="mt-5 flex min-h-11 items-center justify-center rounded-sm bg-lm-amarelo px-5 font-display text-sm font-bold uppercase tracking-[.04em] text-lm-marinho"
            >
              Quero ser parceiro
            </Link>
          </section>
        )}

        {MOSTRAR_CONTAS_TESTE && (
          <aside className="mt-8 rounded border border-dashed border-muted p-3">
            <p className="text-xs font-semibold text-muted">
              Ambiente de testes — contas de demonstração (MVP)
            </p>
            <div className="mt-2">
              <ContasTeste />
            </div>
          </aside>
        )}
      </main>
      <VitrineFooter />
    </div>
  );
}
