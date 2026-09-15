"use client";

import { useState } from "react";
import Link from "next/link";
import { criarConta, solicitarRecuperacaoSenha } from "@/lib/auth-actions";
import { TurnstileWidget } from "@/components/TurnstileWidget";

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
  const [aviso, setAviso] = useState<string | null>(null);
  const [emailExistente, setEmailExistente] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  // Controlado de propósito: o <form action> do React 19 reseta campos não
  // controlados após o submit — o e-mail sumia junto com o erro "Já existe
  // uma conta" e a pessoa tinha que redigitar para recuperar a senha.
  const [email, setEmail] = useState("");
  // Mesmo motivo do FormularioLogin: sem isso, clique rápido dispara submit
  // com cf-turnstile-response vazio e o server rejeita com "Verificação de
  // segurança falhou" antes do desafio terminar de resolver.
  const [turnstilePronto, setTurnstilePronto] = useState(false);

  async function cadastrar(formData: FormData) {
    setErro(null);
    setAviso(null);
    setEmailExistente(false);
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
    const resultado = await criarConta(
      email,
      senha,
      next,
      formData.get("cf-turnstile-response") as string | null,
    );
    setEnviando(false);
    if (!resultado.ok) {
      setErro(resultado.erro ?? "Não foi possível criar a conta. Tente de novo.");
      setEmailExistente(Boolean(resultado.emailExistente));
      return;
    }
    setEnviado(true);
  }

  // "Esqueci a senha" direto do cadastro: a mensagem de e-mail já existente
  // mandava usar o recurso, mas esta tela não oferecia o caminho (print de
  // 15/09). Mesma server action e mesma mensagem neutra do login.
  async function enviarLinkRecuperacao() {
    setErro(null);
    await solicitarRecuperacaoSenha(email);
    setEmailExistente(false);
    setAviso("Se este e-mail tiver uma conta, enviamos um link para criar uma nova senha. Confira a caixa de entrada.");
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
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputCls}
        />
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
        <div role="alert" className="space-y-2 rounded-sm border border-red-700 bg-red-50 p-3 text-sm text-red-700">
          <p>{erro}</p>
          {emailExistente && (
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              <Link
                href={`/login?next=${encodeURIComponent(next)}`}
                className="font-semibold underline underline-offset-2"
              >
                Entrar
              </Link>
              <button
                type="button"
                onClick={() => void enviarLinkRecuperacao()}
                className="font-semibold underline underline-offset-2"
              >
                Esqueci a senha
              </button>
            </div>
          )}
        </div>
      )}
      {aviso && (
        <p role="status" className="rounded-sm border border-green-800 bg-green-100 p-3 text-sm text-green-800">
          {aviso}
        </p>
      )}

      <TurnstileWidget onProntoChange={setTurnstilePronto} />

      <button
        type="submit"
        disabled={enviando || !turnstilePronto}
        className="w-full rounded-sm bg-sinal px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-sinal-escuro disabled:opacity-50"
      >
        {enviando ? "Criando conta..." : turnstilePronto ? "Criar conta" : "Carregando verificação..."}
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
