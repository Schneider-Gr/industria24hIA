"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { safeNext } from "@/lib/safe-next";

const inputCls =
  "mt-1 w-full rounded border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-roxo-800 dark:border-line dark:bg-surface";

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
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4 py-12">
      <h1 className="font-display text-2xl font-bold text-ink">Entrar</h1>
      <p className="mt-1 text-sm text-muted">
        Acesse o painel da sua loja ou a administração.
      </p>

      <form action={entrar} className="mt-6 space-y-4">
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
          <p role="alert" className="rounded border border-erro bg-erro/10 p-3 text-sm text-erro">
            {erro}
          </p>
        )}
        {aviso && (
          <p role="status" className="rounded border border-ok bg-ok/10 p-3 text-sm text-ok">
            {aviso}
          </p>
        )}

        <button
          type="submit"
          disabled={enviando}
          className="w-full rounded bg-laranja px-5 py-2 text-sm font-semibold text-white hover:bg-laranja-escuro disabled:opacity-50"
        >
          {enviando ? "Entrando..." : "Entrar"}
        </button>

        <button
          type="button"
          onClick={(e) => {
            const form = e.currentTarget.form;
            void esqueciSenha(String(new FormData(form ?? undefined).get("email") ?? ""));
          }}
          className="w-full text-center text-sm text-roxo-800 underline-offset-2 hover:underline dark:text-roxo-200"
        >
          Esqueci a senha
        </button>

        <p className="text-center text-sm text-muted">
          Ainda não tem conta?{" "}
          <Link
            href="/cadastro"
            className="text-roxo-800 underline-offset-2 hover:underline dark:text-roxo-200"
          >
            Cadastre sua loja
          </Link>
        </p>
      </form>

      {/* TODO(fase-de-testes): remover antes do lançamento público — pedido do dono em 2026-07-13 */}
      <aside className="mt-8 rounded border border-dashed border-muted p-3 text-xs text-muted">
        <p className="font-semibold">Ambiente de testes — contas de demonstração</p>
        <p className="mt-1">
          Seller: <code>seller-teste-i24@example.com</code>
        </p>
        <p>
          Admin: <code>admin-teste-i24@example.com</code>
        </p>
        <p>
          Senha (ambas): <code>Teste-i24h-2026!</code>
        </p>
      </aside>
    </main>
  );
}
