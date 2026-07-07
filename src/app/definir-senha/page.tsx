"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const inputCls =
  "mt-1 w-full rounded border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-roxo-800 dark:border-line dark:bg-surface";

// Define a senha da sessão atual (pós convite ou recuperação via /auth/confirm).
export default function DefinirSenhaPage() {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function salvar(formData: FormData) {
    const senha = String(formData.get("senha"));
    if (senha !== String(formData.get("confirmar"))) {
      setErro("As senhas não conferem.");
      return;
    }
    setErro(null);
    setSalvando(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: senha });
    setSalvando(false);
    if (error) {
      // Sem sessão ativa (link expirado) ou senha fraca — mensagem honesta.
      setErro(
        error.message.includes("session")
          ? "Sessão expirada. Peça um novo link em Entrar → Esqueci a senha."
          : "Senha recusada: use ao menos 6 caracteres.",
      );
      return;
    }
    router.push("/seller");
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4 py-12">
      <h1 className="font-display text-2xl font-bold text-ink">Definir senha</h1>
      <p className="mt-1 text-sm text-muted">
        Escolha a senha que você usará para entrar no portal.
      </p>

      <form action={salvar} className="mt-6 space-y-4">
        <label className="block text-sm">
          <span className="text-ink-2">Nova senha *</span>
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
          disabled={salvando}
          className="w-full rounded bg-laranja px-5 py-2 text-sm font-semibold text-white hover:bg-laranja-escuro disabled:opacity-50"
        >
          {salvando ? "Salvando..." : "Salvar senha"}
        </button>
      </form>
    </main>
  );
}
