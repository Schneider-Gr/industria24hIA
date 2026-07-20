"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { VitrineHeader, VitrineFooter } from "@/components/vitrine/ui";
import { FormularioLogin } from "@/components/vitrine/FormularioLogin";

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

        {/* TODO(fase-de-testes): remover antes do lançamento público — pedido do dono em 2026-07-13 (ampliado no MVP) */}
        <aside className="mt-8 rounded border border-dashed border-muted p-3 text-xs text-muted">
          <p className="font-semibold">Ambiente de testes — contas de demonstração (MVP)</p>
          <ul className="mt-1 space-y-0.5">
            <li>Admin: <code>admin-teste-i24@example.com</code></li>
            <li>Seller (loja construção): <code>seller-teste-i24@example.com</code></li>
            <li>Comprador: <code>comprador-teste-i24@example.com</code></li>
            <li>Afiliado (vendas): <code>afiliado-teste-i24@example.com</code></li>
            <li>Parceiro logístico 1: <code>parceiro1-teste-i24@example.com</code></li>
            <li>Parceiro logístico 2: <code>parceiro2-teste-i24@example.com</code></li>
          </ul>
          <p className="mt-1">
            Senha (todas): <code>Teste-i24h-2026!</code>
          </p>
        </aside>
      </main>
      <VitrineFooter />
    </div>
  );
}
