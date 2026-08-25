"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { safeNext } from "@/lib/safe-next";
import { entrarComSenha, solicitarRecuperacaoSenha } from "@/lib/auth-actions";
import { TurnstileWidget } from "@/components/TurnstileWidget";

const inputCls =
  "mt-1 w-full rounded-sm border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-lm-azul";

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

  // Google só serve para quem está indo comprar — painéis internos (loja,
  // administração, afiliado, parceiro logístico) continuam email/senha.
  const destino = safeNext(next, "/seller");
  const painelInterno = ["/seller", "/admin", "/afiliado", "/parceiro"].some(
    (prefixo) => destino === prefixo || destino.startsWith(`${prefixo}/`)
  );

  async function entrar(formData: FormData) {
    setErro(null);
    setAviso(null);
    setEnviando(true);
    const resultado = await entrarComSenha(
      String(formData.get("email")),
      String(formData.get("senha")),
    );
    setEnviando(false);
    if (!resultado.ok) {
      setErro(resultado.erro ?? "E-mail ou senha incorretos.");
      return;
    }
    aoEntrar?.();
    // Sem "next" explícito, decide o destino pela role: admin cai em /admin,
    // o resto cai em /seller (policy admins_self_read libera essa checagem
    // pro próprio usuário logado). Bug real: antes disso, todo login sem
    // "next" ia pra /seller mesmo pra conta admin.
    let destino = next;
    if (!destino) {
      const supabase = createClient();
      const { data: souAdmin } = await supabase.from("admins").select("user_id").limit(1).maybeSingle();
      destino = souAdmin ? "/admin" : "/seller";
    }
    // Só caminho relativo interno: evita open redirect (inclusive "/\host").
    router.push(safeNext(destino, "/seller"));
    router.refresh();
  }

  async function entrarComGoogle() {
    setErro(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(safeNext(next, "/seller"))}`,
      },
    });
    if (error) setErro("Não foi possível iniciar o login com Google.");
  }

  async function esqueciSenha(email: string) {
    if (!email) {
      setErro("Preencha o e-mail para receber o link de recuperação.");
      return;
    }
    setErro(null);
    // Envia via Resend (server action com service role) em vez do e-mail
    // padrão do Supabase — mesma identidade visual do site, sem o rate
    // limit baixo do envio embutido do GoTrue.
    await solicitarRecuperacaoSenha(email);
    setAviso("Se este e-mail tiver uma conta, enviamos um link de recuperação. Confira a caixa de entrada.");
  }

  return (
    <div className="space-y-4">
      {!painelInterno && (
        <>
          <button
            type="button"
            onClick={entrarComGoogle}
            className="flex w-full items-center justify-center gap-2 rounded-sm border border-line bg-surface px-5 py-3 text-sm font-semibold text-ink transition-colors hover:bg-line/20"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path fill="#4285F4" d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47c-.28 1.5-1.13 2.77-2.4 3.62v3h3.88c2.27-2.09 3.57-5.17 3.57-8.81z" />
              <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.95-2.92l-3.88-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.95H1.27v3.11C3.25 21.3 7.31 24 12 24z" />
              <path fill="#FBBC05" d="M5.27 14.28A7.2 7.2 0 0 1 4.89 12c0-.79.14-1.56.38-2.28V6.61H1.27A11.98 11.98 0 0 0 0 12c0 1.94.46 3.77 1.27 5.39l4-3.11z" />
              <path fill="#EA4335" d="M12 4.77c1.77 0 3.35.61 4.6 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0 7.31 0 3.25 2.7 1.27 6.61l4 3.11C6.22 6.88 8.87 4.77 12 4.77z" />
            </svg>
            Entrar com Google
          </button>

          <div className="flex items-center gap-3 text-xs text-ink-2">
            <div className="h-px flex-1 bg-line" />
            ou
            <div className="h-px flex-1 bg-line" />
          </div>
        </>
      )}

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

      <TurnstileWidget />

      <button
        type="submit"
        disabled={enviando}
        className="w-full rounded-sm bg-lm-azul px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-lm-azul-escuro disabled:opacity-50"
      >
        {enviando ? "Entrando..." : "Entrar"}
      </button>

      <button
        type="button"
        onClick={(e) => {
          const form = e.currentTarget.form;
          void esqueciSenha(String(new FormData(form ?? undefined).get("email") ?? ""));
        }}
        className="w-full text-center text-[13px] text-lm-azul underline-offset-2 hover:underline"
      >
        Esqueci a senha
      </button>

      <p className="text-center text-[13px] text-ink-2">
        Ainda não tem conta?{" "}
        <Link href="/cadastro" className="text-lm-azul underline-offset-2 hover:underline">
          Crie a sua conta
        </Link>
      </p>
      </form>
    </div>
  );
}
