"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const inputCls =
  "mt-1 w-full rounded-sm border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-aco-600";

/**
 * Cadastro de conta (e-mail/senha) reusado por /cadastro (comprador) e
 * /seller/cadastro (vendedor) — a conta em si é genérica, só o texto e o
 * destino pós-confirmação mudam por perfil.
 */
export function FormularioCadastro({
  next,
  tituloEnviado,
  mensagemEnviado,
}: {
  /** Para onde o link de confirmação do e-mail manda depois de clicado. */
  next: string;
  tituloEnviado?: string;
  mensagemEnviado?: string;
}) {
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
    const { data, error } = await supabase.auth.signUp({
      email: String(formData.get("email")),
      password: senha,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/confirm?next=${next}`,
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
    // GoTrue não retorna erro pra e-mail já cadastrado e confirmado (evita
    // enumeração) — devolve um user "fantasma" com identities vazio em vez
    // de disparar e-mail nenhum. Sem esse check, a tela dizia "enviamos um
    // link" pra um e-mail que nunca recebe nada.
    if (data.user && data.user.identities?.length === 0) {
      setErro("Já existe uma conta com esse e-mail. Faça login ou use \"Esqueci a senha\".");
      return;
    }
    setEnviado(true);
  }

  if (enviado) {
    return (
      <>
        <h1 className="font-display text-lg font-semibold uppercase tracking-[0.08em] text-ink">
          {tituloEnviado ?? "Confirme seu e-mail"}
        </h1>
        <p className="mt-2 text-sm text-muted">
          {mensagemEnviado ?? "Enviamos um link de confirmação. Depois de confirmar, você já pode entrar."}
        </p>
      </>
    );
  }

  return (
    <form
      action={cadastrar}
      className="mt-6 space-y-4 rounded-md border border-line bg-surface/85 p-5 shadow-[0_4px_16px_rgba(15,26,36,.06)] backdrop-blur-md"
    >
      <label className="block text-sm">
        <span className="text-muted">E-mail *</span>
        <input name="email" type="email" required autoComplete="email" className={inputCls} />
      </label>
      <label className="block text-sm">
        <span className="text-muted">Senha *</span>
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
        <span className="text-muted">Confirmar senha *</span>
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
        <p role="alert" className="rounded-sm border border-red-700 bg-red-50 p-3 text-sm text-red-700">
          {erro}
        </p>
      )}

      <button
        type="submit"
        disabled={enviando}
        className="w-full rounded-sm bg-sinal px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-sinal-escuro disabled:opacity-50"
      >
        {enviando ? "Criando conta..." : "Criar conta"}
      </button>

      <Link
        href="/login"
        className="block text-center text-sm text-muted underline-offset-2 hover:underline"
      >
        Já tenho conta, entrar
      </Link>
    </form>
  );
}
