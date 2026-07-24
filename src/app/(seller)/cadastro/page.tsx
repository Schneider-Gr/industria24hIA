"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const inputCls =
  "mt-1 w-full rounded border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-roxo-800 dark:border-line dark:bg-surface";

export default function SellerCadastroPage() {
  const [erro, setErro] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);
  const [enviando, setEnviando] = useState(false);

  async function cadastrar(formData: FormData) {
    setErro(null);
    const senha = String(formData.get("senha"));
    const confirmar = String(formData.get("confirmar_senha"));
    if (senha !== confirmar) {
      setErro("As senhas não conferem.");
      return;
    }
    if (senha.length < 8) {
      setErro("A senha precisa ter pelo menos 8 caracteres.");
      return;
    }

    setEnviando(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email: String(formData.get("email")),
      password: senha,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/confirm?next=/seller/minha-loja`,
      },
    });
    setEnviando(false);
    if (error) {
      setErro(
        error.message.includes("already registered")
          ? "Já existe uma conta com esse e-mail."
          : "Não foi possível criar a conta. Tente de novo.",
      );
      return;
    }
    setEnviado(true);
  }

  if (enviado) {
    return (
      <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4 py-12">
        <h1 className="font-display text-2xl font-bold text-ink">Confirme seu e-mail</h1>
        <p className="mt-2 text-sm text-muted">
          Enviamos um link de confirmação. Depois de confirmar, você poderá
          cadastrar sua loja — ela fica em análise até um admin aprovar.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4 py-12">
      <h1 className="font-display text-2xl font-bold text-ink">Vender no 24h</h1>
      <p className="mt-1 text-sm text-muted">
        Crie sua conta de vendedor. Depois de confirmar o e-mail, você cadastra sua
        loja — ela entra em análise e só aparece no marketplace após aprovação.
      </p>

      <form action={cadastrar} className="mt-6 space-y-4">
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
            minLength={8}
            autoComplete="new-password"
            className={inputCls}
          />
        </label>
        <label className="block text-sm">
          <span className="text-ink-2">Confirmar senha *</span>
          <input
            name="confirmar_senha"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className={inputCls}
          />
        </label>

        {erro && (
          <p role="alert" className="rounded border border-erro bg-erro/10 p-3 text-sm text-erro">
            {erro}
          </p>
        )}

        <button
          type="submit"
          disabled={enviando}
          className="w-full rounded bg-laranja px-5 py-2 text-sm font-semibold text-white hover:bg-laranja-escuro disabled:opacity-50"
        >
          {enviando ? "Criando conta..." : "Criar conta"}
        </button>

        <Link
          href="/login"
          className="block text-center text-sm text-roxo-800 underline-offset-2 hover:underline dark:text-roxo-200"
        >
          Já tenho conta, entrar
        </Link>
      </form>
    </main>
  );
}
