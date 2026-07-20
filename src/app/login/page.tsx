"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { VitrineHeader, VitrineFooter } from "@/components/vitrine/ui";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { safeNext } from "@/lib/safe-next";

const inputCls =
  "mt-1 w-full rounded-sm border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-aco-600";

// Login por e-mail/senha. "Esqueci a senha" dispara o e-mail de recuperação
// que aterrissa em /auth/confirm → /definir-senha.
export default function LoginPage() {
  // useSearchParams exige Suspense no prerender.
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [erro, setErro] = useState<string | null>(
    params.get("erro") === "link_invalido"
      ? "Link inválido ou expirado. Entre com a senha ou peça um novo link."
      : null,
  );
  const [aviso, setAviso] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function entrar(formData: FormData) {
    setErro(null);
    setAviso(null);
    setEnviando(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: String(formData.get("email")),
      password: String(formData.get("senha")),
    });
    setEnviando(false);
    if (error) {
      setErro("E-mail ou senha incorretos.");
      return;
    }
    // Só caminho relativo interno: evita open redirect (inclusive "/\host").
    router.push(safeNext(params.get("next"), "/seller"));
    router.refresh();
  }

  async function esqueciSenha(email: string) {
    if (!email) {
      setErro("Preencha o e-mail para receber o link de recuperação.");
      return;
    }
    setErro(null);
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/confirm?next=/definir-senha`,
    });
    if (error) {
      setErro("Não foi possível enviar o e-mail de recuperação. Tente de novo.");
      return;
    }
    setAviso("E-mail de recuperação enviado. Confira a caixa de entrada.");
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <VitrineHeader />
      <main className="anim-entra mx-auto flex w-full max-w-[420px] flex-1 flex-col justify-center px-4 py-12">
      <h1 className="font-display text-lg font-semibold uppercase tracking-[0.08em] text-ink">Entrar</h1>
      <p className="mt-1 text-sm text-muted">
        Acesse o painel da sua loja ou a administração.
      </p>

      <form action={entrar} className="mt-6 space-y-4 rounded-md border border-line bg-surface p-5 shadow-[0_4px_16px_rgba(15,26,36,.06)]">
        <label className="block text-sm">
          <span className="text-ink-2">E-mail *</span>
          <input name="email" type="email" required autoComplete="email" className={inputCls} />
        </label>
        <label className="block text-sm">
          <span className="text-ink-2">Senha *</span>
          <input
            name="senha"
            type="password"
            required
            autoComplete="current-password"
            className={inputCls}
          />
        </label>

        {erro && (
          <p role="alert" className="rounded-sm border border-red-700 bg-red-50 p-3 text-sm text-red-700">
            {erro}
          </p>
        )}
        {aviso && (
          <p role="status" className="rounded-sm border border-green-800 bg-green-100 p-3 text-sm text-green-800">
            {aviso}
          </p>
        )}

        <button
          type="submit"
          disabled={enviando}
          className="w-full rounded-sm bg-sinal px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-sinal-escuro disabled:opacity-50"
        >
          {enviando ? "Entrando..." : "Entrar"}
        </button>

        <button
          type="button"
          onClick={(e) => {
            const form = e.currentTarget.form;
            void esqueciSenha(String(new FormData(form ?? undefined).get("email") ?? ""));
          }}
          className="w-full text-center text-[13px] text-aco-600 underline-offset-2 hover:underline"
        >
          Esqueci a senha
        </button>

        <p className="text-center text-sm text-muted">
          Ainda não tem conta?{" "}
          <Link
            href="/cadastro"
            className="text-aco-600 underline-offset-2 hover:underline"
          >
            Cadastre sua loja
          </Link>
        </p>
      </form>

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
