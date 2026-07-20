"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const inputCls =
  "mt-1 w-full rounded border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-aco-800 dark:border-line dark:bg-surface";

// Cria a conta de acesso (auth). A loja em si é cadastrada depois, em
// /seller/minha-loja (getMinhaLoja() retorna null e a página já mostra o
// formulário de criação — não duplicar esse formulário aqui).
export default function CadastroPage() {
  const [erro, setErro] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);
  const [enviando, setEnviando] = useState(false);

  async function cadastrar(formData: FormData) {
    setErro(null);
    const email = String(formData.get("email"));
    const senha = String(formData.get("senha"));
    if (senha !== String(formData.get("confirmar"))) {
      setErro("As senhas não conferem.");
      return;
    }
    setEnviando(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/confirm?next=/seller/minha-loja`,
      },
    });
    setEnviando(false);
    if (error) {
      // Mensagens honestas por causa real (Supabase Auth) — não adivinhar
      // "senha fraca" para qualquer erro, ex.: rate limit de e-mail (429)
      // é um erro de infraestrutura, não do que o usuário digitou.
      if (error.message.includes("already registered") || error.message.includes("already exists")) {
        setErro("Já existe uma conta com este e-mail. Entre ou recupere sua senha.");
      } else if (error.message.toLowerCase().includes("password")) {
        setErro("Senha recusada: use ao menos 6 caracteres.");
      } else if (error.message.toLowerCase().includes("rate limit")) {
        setErro("Muitas tentativas de cadastro em pouco tempo. Aguarde alguns minutos e tente de novo.");
      } else {
        setErro("Não foi possível criar a conta agora. Tente novamente em instantes.");
      }
      return;
    }
    // Confirmação de e-mail obrigatória no projeto: sem sessão imediata.
    // Com confirmação desativada, o Supabase já devolve sessão + user aqui.
    setEnviado(true);
    if (data.session) {
      window.location.href = "/seller/minha-loja";
    }
  }

  if (enviado) {
    return (
      <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4 py-12">
        <h1 className="font-display text-2xl font-bold text-ink">Quase lá</h1>
        <p className="mt-2 text-sm text-muted">
          Enviamos um e-mail de confirmação. Clique no link para ativar sua conta e
          cadastrar sua loja.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4 py-12">
      <h1 className="font-display text-2xl font-bold text-ink">Criar conta</h1>
      <p className="mt-1 text-sm text-muted">
        Cadastre-se para vender no Indústria 24h. Depois de confirmar o e-mail você
        preenche os dados da sua loja.
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
            minLength={6}
            autoComplete="new-password"
            className={inputCls}
          />
        </label>
        <label className="block text-sm">
          <span className="text-ink-2">Confirmar senha *</span>
          <input
            name="confirmar"
            type="password"
            required
            minLength={6}
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
          className="w-full rounded bg-sinal px-5 py-2 text-sm font-semibold text-white hover:bg-sinal-escuro disabled:opacity-50"
        >
          {enviando ? "Criando conta..." : "Criar conta"}
        </button>

        <p className="text-center text-sm text-muted">
          Já tem conta?{" "}
          <Link
            href="/login"
            className="text-aco-600 underline-offset-2 hover:underline dark:text-aco-600"
          >
            Entrar
          </Link>
        </p>
      </form>
    </main>
  );
}
