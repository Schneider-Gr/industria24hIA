"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
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

function LoginConteudo() {
  const params = useSearchParams();
  const erroInicial =
    params.get("erro") === "link_invalido"
      ? "Link inválido ou expirado. Entre com a senha ou peça um novo link."
      : null;

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
