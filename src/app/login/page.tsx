"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { VitrineHeader, VitrineFooter } from "@/components/vitrine/ui";
import { FormularioLogin } from "@/components/vitrine/FormularioLogin";
import { ContasTeste } from "@/components/vitrine/ContasTeste";

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

// O e-mail de recuperação verifica o token no servidor do Supabase e
// redireciona para /auth/confirm com a sessão no FRAGMENTO da URL
// (#access_token=...&type=recovery), não como ?token_hash= — o servidor
// nunca vê fragmento, então /auth/confirm cai no redirect de erro. Como o
// Location desse redirect não especifica fragmento, o navegador preserva o
// antigo, e a sessão real chega aqui intacta em window.location.hash.
// Completar client-side em vez de descartar como link inválido.
// "processando" começa false em toda renderização (inclusive no servidor,
// que não tem window/hash) — o efeito só decide mudar depois de montado no
// cliente, então não há divergência de hidratação.
function useRecuperacaoPorFragmento() {
  const router = useRouter();
  const [processando, setProcessando] = useState(false);
  const [erroRecuperacao, setErroRecuperacao] = useState<string | null>(null);

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash || !hash.includes("type=recovery")) return;

    const fragmento = new URLSearchParams(hash.slice(1));
    const accessToken = fragmento.get("access_token");
    const refreshToken = fragmento.get("refresh_token");
    if (!accessToken || !refreshToken) return;

    setProcessando(true);
    const supabase = createClient();
    supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken }).then(({ error }) => {
      // Limpa o fragmento da barra de endereço independentemente do resultado.
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
      if (error) {
        setProcessando(false);
        setErroRecuperacao("Link inválido ou expirado. Peça um novo link em Entrar → Esqueci a senha.");
        return;
      }
      router.replace("/definir-senha");
    });
  }, [router]);

  return { processando, erroRecuperacao };
}

function LoginConteudo() {
  const params = useSearchParams();
  const { processando, erroRecuperacao } = useRecuperacaoPorFragmento();
  const erroInicial =
    erroRecuperacao ??
    (params.get("erro") === "link_invalido"
      ? "Link inválido ou expirado. Entre com a senha ou peça um novo link."
      : null);

  if (processando) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <VitrineHeader />
        <main className="mx-auto flex w-full max-w-[420px] flex-1 items-center justify-center px-4 py-12">
          <p className="text-sm text-muted">Confirmando o link de recuperação…</p>
        </main>
        <VitrineFooter />
      </div>
    );
  }

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

        {/* TODO(fase-de-testes): remover antes do lançamento público — pedido do dono em 2026-07-13 (ampliado no MVP) */}
        <aside className="mt-8 rounded border border-dashed border-muted p-3">
          <p className="text-xs font-semibold text-muted">
            Ambiente de testes — contas de demonstração (MVP)
          </p>
          <div className="mt-2">
            <ContasTeste />
          </div>
        </aside>
      </main>
      <VitrineFooter />
    </div>
  );
}
