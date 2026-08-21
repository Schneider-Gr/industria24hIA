"use client";

import { Suspense, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { VitrineHeader, VitrineFooter } from "@/components/vitrine/ui";
import { FormularioLogin } from "@/components/vitrine/FormularioLogin";

// Import dinâmico: em produção MOSTRAR_CONTAS_TESTE é sempre false e o
// componente nunca chega a ser renderizado, logo o chunk (e a senha de
// teste que ele carrega) nunca é baixado pelo navegador do visitante.
const ContasTeste = dynamic(() =>
  import("@/components/vitrine/ContasTeste").then((m) => m.ContasTeste)
);
const MOSTRAR_CONTAS_TESTE = process.env.NODE_ENV !== "production";

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
      ? "Essa conta não tem loja vinculada. Entre com a conta da sua loja ou abra a sua em industria24.com.br/vender."
      : null);

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
          <FormularioLogin next={params.get("next")} erroInicial={erroInicial} />
        </div>

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
