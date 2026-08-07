"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// undefined = ainda carregando a sessão, null = deslogado. Compartilhado
// entre MenuConta (desktop) e MenuMais (tab bar mobile) — os dois precisam
// saber se há sessão pra trocar "Entrar" pelos atalhos de conta.
export function useSessaoUsuario() {
  const [email, setEmail] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_evento, session) => {
      setEmail(session?.user?.email ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return email;
}
