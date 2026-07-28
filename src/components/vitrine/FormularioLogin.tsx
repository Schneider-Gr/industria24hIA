"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { safeNext } from "@/lib/safe-next";

const inputCls =
  "mt-1 w-full rounded-sm border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-aco-600";

/**
 * Formulário de login reaproveitado pela página /login e pelo modal do
 * header — a lógica de auth vive num lugar só.
 */
export function FormularioLogin({
  next,
  erroInicial = null,
  aoEntrar,
}: {
  next?: string | null;
  erroInicial?: string | null;
  /** Chamado depois do login bem-sucedido (o modal usa para fechar). */
  aoEntrar?: () => void;
}) {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(erroInicial);
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
    aoEntrar?.();
    // Só caminho relativo interno: evita open redirect (inclusive "/\host").
    router.push(safeNext(next, "/seller"));
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
    <form action={entrar} className="space-y-4">
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

      <p className="text-center text-[13px] text-ink-2">
        Ainda não tem conta?{" "}
        <Link href="/seller/cadastro" className="text-aco-600 underline-offset-2 hover:underline">
          Cadastre sua loja
        </Link>
      </p>
    </form>
  );
}
